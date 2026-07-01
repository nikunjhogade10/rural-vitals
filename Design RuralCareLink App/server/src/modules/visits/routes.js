const express = require('express');
const Joi = require('joi');
const prisma = require('../../config/db');
const { authenticate, authorize } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { logAudit, generateVisitNumber } = require('../../utils/helpers');

const router = express.Router();

// ─── Validation ─────────────────────────────────────────

const createVisitSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
  visitType: Joi.string().valid('routine', 'emergency', 'follow-up').default('routine'),
  chiefComplaint: Joi.string().allow('', null),
  symptoms: Joi.array().items(Joi.string()).default([]),
  diagnosis: Joi.string().allow('', null),
  consultationMode: Joi.string().valid('OFFLINE', 'TEXT', 'AUDIO', 'VIDEO').default('OFFLINE'),
  networkStatus: Joi.string().valid('ONLINE', 'WEAK', 'OFFLINE').default('OFFLINE'),
  followUpDate: Joi.date().iso().allow(null),
});

const updateVisitSchema = Joi.object({
  chiefComplaint: Joi.string().allow('', null),
  symptoms: Joi.array().items(Joi.string()),
  diagnosis: Joi.string().allow('', null),
  status: Joi.string().valid('DRAFT', 'PENDING_SYNC', 'SYNCED', 'REVIEWED', 'COMPLETED', 'FAILED'),
  consultationMode: Joi.string().valid('OFFLINE', 'TEXT', 'AUDIO', 'VIDEO'),
  networkStatus: Joi.string().valid('ONLINE', 'WEAK', 'OFFLINE'),
  followUpDate: Joi.date().iso().allow(null),
});

const querySchema = Joi.object({
  status: Joi.string().valid('all', 'draft', 'pending_sync', 'synced', 'reviewed', 'completed', 'failed').default('all'),
  patientId: Joi.string().uuid(),
  language: Joi.string(),
  search: Joi.string().allow(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// ─── GET /api/visits ────────────────────────────────────

router.get('/', authenticate, validate(querySchema, 'query'), async (req, res, next) => {
  try {
    const { status, patientId, language, search } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const andClauses = [];

    // Health workers see their facility's visits; doctors see assigned visits or pending ones
    if (req.user.role === 'DOCTOR') {
      const statusUpper = status ? status.toUpperCase() : 'ALL';
      if (statusUpper === 'REVIEWED') {
        andClauses.push({ status: 'REVIEWED' });
        andClauses.push({ assignedDoctorId: req.user.id });
      } else if (statusUpper === 'SYNCED' || statusUpper === 'PENDING_SYNC' || statusUpper === 'PENDING') {
        andClauses.push({ status: { in: ['SYNCED', 'PENDING_SYNC'] } });
        andClauses.push({
          OR: [
            { assignedDoctorId: null },
            { assignedDoctorId: req.user.id }
          ]
        });
      } else {
        // 'all'
        andClauses.push({
          OR: [
            { assignedDoctorId: req.user.id },
            { assignedDoctorId: null, status: { in: ['SYNCED', 'PENDING_SYNC'] } }
          ]
        });
      }
    } else {
      andClauses.push({ facilityId: req.user.facilityId });
      if (status && status !== 'all') {
        andClauses.push({ status: status.toUpperCase() });
      }
    }

    if (patientId) {
      andClauses.push({ patientId });
    }
    if (language) {
      andClauses.push({ patient: { preferredLanguage: language } });
    }
    if (search) {
      andClauses.push({
        OR: [
          { patient: { fullName: { contains: search, mode: 'insensitive' } } },
          { chiefComplaint: { contains: search, mode: 'insensitive' } },
          { visitNumber: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        include: {
          patient: true,
          createdBy: { select: { id: true, fullName: true } },
          assignedDoctor: { select: { fullName: true } },
          vitalRecords: { take: 1, orderBy: { recordedAt: 'desc' } },
          consultationNotes: { orderBy: { createdAt: 'desc' } },
          _count: { select: { consultationNotes: true, prescriptions: true, images: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.visit.count({ where }),
    ]);

    res.json({
      visits,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/visits/:id ────────────────────────────────

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const visit = await prisma.visit.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        createdBy: { select: { id: true, fullName: true, employeeId: true, role: true } },
        assignedDoctor: { select: { id: true, fullName: true } },
        vitalRecords: { orderBy: { recordedAt: 'desc' } },
        consultationNotes: {
          include: { author: { select: { id: true, fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        prescriptions: {
          include: { prescribedBy: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        images: true,
      },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json({ visit });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/visits ───────────────────────────────────

router.post('/', authenticate, validate(createVisitSchema), async (req, res, next) => {
  try {
    const visitNumber = await generateVisitNumber();

    const visit = await prisma.visit.create({
      data: {
        ...req.body,
        visitNumber,
        facilityId: req.user.facilityId,
        createdById: req.user.id,
        status: req.body.networkStatus === 'OFFLINE' ? 'PENDING_SYNC' : 'DRAFT',
      },
      include: { patient: true },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'visit',
      entityId: visit.id,
    });

    res.status(201).json({ visit });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/visits/:id ──────────────────────────────

router.patch(
  '/:id',
  authenticate,
  validate(updateVisitSchema),
  async (req, res, next) => {
    try {
      const oldVisit = await prisma.visit.findUnique({
        where: { id: req.params.id },
        include: { patient: true },
      });
      if (!oldVisit) {
        return res.status(404).json({ error: 'Visit not found' });
      }

      const visit = await prisma.visit.update({
        where: { id: req.params.id },
        data: req.body,
        include: { patient: true },
      });

      // Handle Call Notifications automatically
      if (req.body.consultationMode === 'VIDEO' && oldVisit.consultationMode !== 'VIDEO') {
        if (req.user.role === 'DOCTOR') {
          const doctorName = req.user.fullName.startsWith('Dr.') ? req.user.fullName : `Dr. ${req.user.fullName}`;
          await prisma.notification.create({
            data: {
              userId: visit.createdById,
              type: 'DOCTOR_ALERT',
              title: 'Incoming Video Call',
              message: `${doctorName} is calling for patient ${visit.patient.fullName}`,
              relatedEntityType: 'visit',
              relatedEntityId: visit.id,
            }
          });
        } else if (visit.assignedDoctorId) {
          await prisma.notification.create({
            data: {
              userId: visit.assignedDoctorId,
              type: 'SYSTEM',
              title: 'Incoming Video Call',
              message: `Patient ${visit.patient.fullName} is calling.`,
              relatedEntityType: 'visit',
              relatedEntityId: visit.id,
            }
          });
        }
      }

      await logAudit({
        userId: req.user.id,
        action: 'UPDATE',
        entityType: 'visit',
        entityId: visit.id,
        metadata: { fields: Object.keys(req.body) },
      });

      res.json({ visit });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/visits/:id/review (Doctor only) ─────────

router.post(
  '/:id/review',
  authenticate,
  authorize('DOCTOR'),
  async (req, res, next) => {
    try {
      const { doctorNotes, prescription, followUpDate, referral } = req.body;

      const visit = await prisma.visit.update({
        where: { id: req.params.id },
        data: {
          status: 'REVIEWED',
          assignedDoctorId: req.user.id,
          reviewedAt: new Date(),
          followUpDate: followUpDate ? new Date(followUpDate) : null,
          consultationMode: 'OFFLINE',
          networkStatus: 'OFFLINE',
        },
        include: { patient: true, createdBy: true },
      });

      // Create doctor's consultation note
      if (doctorNotes) {
        await prisma.consultationNote.create({
          data: {
            visitId: visit.id,
            authorId: req.user.id,
            authorRole: 'DOCTOR',
            noteType: 'doctor_review',
            content: doctorNotes,
          },
        });
      }

      // Create referral note
      if (referral) {
        await prisma.consultationNote.create({
          data: {
            visitId: visit.id,
            authorId: req.user.id,
            authorRole: 'DOCTOR',
            noteType: 'referral',
            content: typeof referral === 'string' ? referral : JSON.stringify(referral),
          },
        });
      }

      // Create prescriptions
      if (prescription && Array.isArray(prescription)) {
        for (const med of prescription) {
          await prisma.prescription.create({
            data: {
              visitId: visit.id,
              prescribedById: req.user.id,
              medicationName: med.medicationName,
              dosage: med.dosage,
              frequency: med.frequency,
              duration: med.duration,
              instructions: med.instructions,
            },
          });
        }
      }

      // Notify the health worker
      let prescriptionText = '';
      if (prescription && Array.isArray(prescription) && prescription.length > 0) {
        const meds = prescription.map(m => `${m.medicationName} (${m.dosage || ''})`).join(', ');
        prescriptionText = ` Prescribed: ${meds}.`;
      }

      const reviewerName = req.user.fullName.startsWith('Dr.') ? req.user.fullName : `Dr. ${req.user.fullName}`;
      await prisma.notification.create({
        data: {
          userId: visit.createdById,
          type: 'DOCTOR_ALERT',
          title: 'Doctor Response & Prescription',
          message: `${reviewerName} reviewed ${visit.patient.fullName}'s case.${prescriptionText}${doctorNotes ? ' Note: ' + doctorNotes.slice(0, 100) : ''}`,
          relatedEntityType: 'visit',
          relatedEntityId: visit.id,
        },
      });

      await logAudit({
        userId: req.user.id,
        action: 'REVIEW',
        entityType: 'visit',
        entityId: visit.id,
      });

      res.json({ visit });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
