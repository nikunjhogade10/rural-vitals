const express = require('express');
const Joi = require('joi');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { logAudit, generateVisitNumber } = require('../../utils/helpers');

const router = express.Router();

// ─── Validation ─────────────────────────────────────────

const pushSchema = Joi.object({
  syncId: Joi.string().optional(),
  items: Joi.array()
    .items(
      Joi.object({
        clientId: Joi.string().required(),
        entityType: Joi.string().valid('patient', 'visit', 'vitalRecord', 'consultationNote').required(),
        actionType: Joi.string().valid('CREATE', 'UPDATE').required(),
        payload: Joi.object().required(),
      })
    )
    .min(1)
    .required(),
});

// ─── POST /api/sync/push — Bulk ingest offline records ──

router.post('/push', authenticate, validate(pushSchema), async (req, res, next) => {
  try {
    const { items, syncId } = req.body;
    const results = [];

    // Retrieve or create a sync history entry
    let syncHistory;
    if (syncId) {
      const existingHistory = await prisma.syncHistory.findUnique({
        where: { id: syncId },
      });
      if (existingHistory) {
        syncHistory = await prisma.syncHistory.update({
          where: { id: syncId },
          data: {
            totalRecords: { increment: items.length },
          },
        });
      } else {
        syncHistory = await prisma.syncHistory.create({
          data: {
            id: syncId,
            triggeredById: req.user.id,
            totalRecords: items.length,
            status: 'PROCESSING',
          },
        });
      }
    } else {
      syncHistory = await prisma.syncHistory.create({
        data: {
          triggeredById: req.user.id,
          totalRecords: items.length,
          status: 'PROCESSING',
        },
      });
    }

    let successCount = 0;
    let failedCount = 0;

    for (const item of items) {
      try {
        // Check for duplicate via clientId
        const existing = await prisma.syncJob.findUnique({
          where: { clientId: item.clientId },
        });

        if (existing && existing.syncStatus === 'SYNCED') {
          let visitNumber;
          if (item.entityType === 'visit') {
            const vis = await prisma.visit.findUnique({ where: { id: existing.entityId } });
            if (vis) visitNumber = vis.visitNumber;
          }
          results.push({
            clientId: item.clientId,
            status: 'already_synced',
            serverId: existing.entityId,
            ...(visitNumber ? { visitNumber } : {}),
          });
          successCount++;
          continue;
        }

        let serverId = null;
        let visitNumber = null;

        if (item.entityType === 'patient' && item.actionType === 'CREATE') {
          const patient = await prisma.patient.create({
            data: {
              fullName: item.payload.fullName,
              gender: item.payload.gender || 'OTHER',
              age: item.payload.age || 0,
              phone: item.payload.phone,
              village: item.payload.village,
              district: item.payload.district,
              state: item.payload.state,
              abhaNumber: item.payload.abhaNumber,
              preferredLanguage: item.payload.preferredLanguage || 'en',
              facilityId: req.user.facilityId,
              createdById: req.user.id,
            },
          });
          serverId = patient.id;
        } else if (item.entityType === 'visit' && item.actionType === 'CREATE') {
          visitNumber = await generateVisitNumber();
          const visit = await prisma.visit.create({
            data: {
              visitNumber,
              patientId: item.payload.patientId,
              facilityId: req.user.facilityId,
              createdById: req.user.id,
              chiefComplaint: item.payload.chiefComplaint,
              symptoms: item.payload.symptoms || [],
              status: 'SYNCED',
              consultationMode: item.payload.consultationMode || 'OFFLINE',
              networkStatus: 'OFFLINE',
              syncedAt: new Date(),
            },
          });
          serverId = visit.id;
        } else if (item.entityType === 'vitalRecord' && item.actionType === 'CREATE') {
          const vital = await prisma.vitalRecord.create({
            data: {
              visitId: item.payload.visitId,
              temperature: item.payload.temperature,
              pulse: item.payload.pulse,
              spo2: item.payload.spo2,
              systolicBP: item.payload.systolicBP,
              diastolicBP: item.payload.diastolicBP,
              respiratoryRate: item.payload.respiratoryRate,
              weight: item.payload.weight,
              height: item.payload.height,
              bloodSugar: item.payload.bloodSugar,
              hemoglobin: item.payload.hemoglobin,
              notes: item.payload.notes,
              recordedById: req.user.id,
            },
          });
          serverId = vital.id;
        } else if (item.entityType === 'consultationNote' && item.actionType === 'CREATE') {
          const note = await prisma.consultationNote.create({
            data: {
              visitId: item.payload.visitId,
              authorId: req.user.id,
              authorRole: req.user.role,
              noteType: item.payload.noteType || 'clinical_notes',
              content: item.payload.content,
            },
          });
          serverId = note.id;
        }

        // Record sync job
        await prisma.syncJob.upsert({
          where: { clientId: item.clientId },
          create: {
            clientId: item.clientId,
            entityType: item.entityType,
            entityId: serverId,
            actionType: item.actionType,
            syncStatus: 'SYNCED',
            payloadSnapshot: item.payload,
            createdById: req.user.id,
          },
          update: {
            syncStatus: 'SYNCED',
            entityId: serverId,
            updatedAt: new Date(),
          },
        });

        results.push({
          clientId: item.clientId,
          status: 'synced',
          serverId,
          ...(item.entityType === 'visit' ? { visitNumber } : {}),
        });
        successCount++;
      } catch (itemErr) {
        // Record failure for this item
        await prisma.syncJob.upsert({
          where: { clientId: item.clientId },
          create: {
            clientId: item.clientId,
            entityType: item.entityType,
            actionType: item.actionType,
            syncStatus: 'FAILED',
            lastError: itemErr.message,
            payloadSnapshot: item.payload,
            createdById: req.user.id,
          },
          update: {
            syncStatus: 'FAILED',
            lastError: itemErr.message,
            retryCount: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        results.push({
          clientId: item.clientId,
          status: 'failed',
          error: itemErr.message,
        });
        failedCount++;
      }
    }

    // Finalize sync history
    const currentHistory = await prisma.syncHistory.findUnique({ where: { id: syncHistory.id } });
    const finalSuccess = (currentHistory?.successCount || 0) + successCount;
    const finalFailed = (currentHistory?.failedCount || 0) + failedCount;
    const finalTotal = currentHistory?.totalRecords || items.length;

    await prisma.syncHistory.update({
      where: { id: syncHistory.id },
      data: {
        successCount: finalSuccess,
        failedCount: finalFailed,
        status: finalFailed === 0 ? 'SYNCED' : finalFailed === finalTotal ? 'FAILED' : 'SYNCED',
        finishedAt: new Date(),
      },
    });

    // Create a sync notification
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        type: 'SYNC_ALERT',
        title: 'Sync Completed',
        message: `${successCount} record${successCount !== 1 ? 's' : ''} synced successfully.${failedCount > 0 ? ` ${failedCount} failed.` : ''}`,
        relatedEntityType: 'sync',
        relatedEntityId: syncHistory.id,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'SYNC',
      entityType: 'sync',
      entityId: syncHistory.id,
      metadata: { total: items.length, successCount, failedCount },
    });

    res.json({ syncId: syncHistory.id, results, successCount, failedCount });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/sync/pull — Delta sync from server ────────

router.get('/pull', authenticate, async (req, res, next) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);

    const [patients, visits, notifications] = await Promise.all([
      prisma.patient.findMany({
        where: { facilityId: req.user.facilityId, updatedAt: { gt: since } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.visit.findMany({
        where: { facilityId: req.user.facilityId, updatedAt: { gt: since } },
        include: {
          patient: { select: { id: true, fullName: true, age: true, gender: true, preferredLanguage: true } },
          vitalRecords: true,
          consultationNotes: true,
          prescriptions: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: { userId: req.user.id, createdAt: { gt: since } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      patients,
      visits,
      notifications,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/sync/summary — Sync queue status ──────────

router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const [pending, synced, failed] = await Promise.all([
      prisma.syncJob.count({ where: { createdById: req.user.id, syncStatus: 'PENDING' } }),
      prisma.syncJob.count({ where: { createdById: req.user.id, syncStatus: 'SYNCED' } }),
      prisma.syncJob.count({ where: { createdById: req.user.id, syncStatus: 'FAILED' } }),
    ]);
    res.json({ pending, synced, failed, total: pending + synced + failed });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/sync/history ──────────────────────────────

router.get('/history', authenticate, async (req, res, next) => {
  try {
    const history = await prisma.syncHistory.findMany({
      where: { triggeredById: req.user.id },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/sync/retry — Retry failed items ─────────

router.post('/retry', authenticate, async (req, res, next) => {
  try {
    const failedJobs = await prisma.syncJob.findMany({
      where: { createdById: req.user.id, syncStatus: 'FAILED', retryCount: { lt: 3 } },
    });

    if (failedJobs.length === 0) {
      return res.json({ message: 'No retryable items', results: [] });
    }

    // Re-submit as a push
    const items = failedJobs.map((job) => ({
      clientId: job.clientId,
      entityType: job.entityType,
      actionType: job.actionType,
      payload: job.payloadSnapshot,
    }));

    // Delegate to push logic by simulating the request
    req.body = { items };
    // Forward to the push handler
    const pushHandler = router.stack.find(
      (layer) => layer.route && layer.route.path === '/push' && layer.route.methods.post
    );

    // Simple retry: reset status and let client re-push
    await prisma.syncJob.updateMany({
      where: {
        clientId: { in: failedJobs.map((j) => j.clientId) },
      },
      data: { syncStatus: 'PENDING' },
    });

    res.json({
      message: `${failedJobs.length} items queued for retry`,
      retryCount: failedJobs.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
