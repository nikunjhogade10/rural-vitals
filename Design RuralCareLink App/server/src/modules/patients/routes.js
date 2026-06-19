const express = require('express');
const Joi = require('joi');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { logAudit } = require('../../utils/helpers');

const router = express.Router();

// ─── Validation ─────────────────────────────────────────

const createPatientSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required(),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').required(),
  age: Joi.number().integer().min(0).max(150).required(),
  dateOfBirth: Joi.date().iso().allow(null),
  phone: Joi.string().allow('', null),
  village: Joi.string().allow('', null),
  district: Joi.string().allow('', null),
  state: Joi.string().allow('', null),
  emergencyContact: Joi.string().allow('', null),
  abhaNumber: Joi.string().allow('', null),
  preferredLanguage: Joi.string().default('en'),
});

const updatePatientSchema = createPatientSchema.fork(
  ['fullName', 'gender', 'age'],
  (field) => field.optional()
);

const querySchema = Joi.object({
  search: Joi.string().allow(''),
  language: Joi.string().allow(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// ─── GET /api/patients ──────────────────────────────────

router.get('/', authenticate, validate(querySchema, 'query'), async (req, res, next) => {
  try {
    const { search, language } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const where = { facilityId: req.user.facilityId };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { abhaNumber: { contains: search } },
      ];
    }

    if (language) {
      where.preferredLanguage = language;
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          visits: {
            select: { id: true, status: true, chiefComplaint: true, symptoms: true, visitDate: true },
            orderBy: { visitDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({
      patients: patients.map((p) => ({
        ...p,
        latestVisit: p.visits[0] || null,
        visits: undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/patients/:id ──────────────────────────────

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        visits: {
          include: {
            vitalRecords: true,
            consultationNotes: true,
            prescriptions: true,
          },
          orderBy: { visitDate: 'desc' },
        },
        createdBy: { select: { id: true, fullName: true, employeeId: true } },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ patient });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/patients ─────────────────────────────────

router.post('/', authenticate, validate(createPatientSchema), async (req, res, next) => {
  try {
    const patient = await prisma.patient.create({
      data: {
        ...req.body,
        facilityId: req.user.facilityId,
        createdById: req.user.id,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'patient',
      entityId: patient.id,
    });

    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/patients/:id ────────────────────────────

router.patch(
  '/:id',
  authenticate,
  validate(updatePatientSchema),
  async (req, res, next) => {
    try {
      const patient = await prisma.patient.update({
        where: { id: req.params.id },
        data: req.body,
      });

      await logAudit({
        userId: req.user.id,
        action: 'UPDATE',
        entityType: 'patient',
        entityId: patient.id,
        metadata: { fields: Object.keys(req.body) },
      });

      res.json({ patient });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
