const express = require('express');
const Joi = require('joi');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');

const router = express.Router();

const vitalSchema = Joi.object({
  visitId: Joi.string().uuid().required(),
  temperature: Joi.number().allow(null),
  pulse: Joi.number().integer().allow(null),
  spo2: Joi.number().integer().allow(null),
  systolicBP: Joi.number().integer().allow(null),
  diastolicBP: Joi.number().integer().allow(null),
  respiratoryRate: Joi.number().integer().allow(null),
  weight: Joi.number().allow(null),
  height: Joi.number().allow(null),
  bloodSugar: Joi.number().allow(null),
  hemoglobin: Joi.number().allow(null),
  notes: Joi.string().allow('', null),
});

// ─── GET /api/vitals/:visitId ───────────────────────────

router.get('/:visitId', authenticate, async (req, res, next) => {
  try {
    const records = await prisma.vitalRecord.findMany({
      where: { visitId: req.params.visitId },
      include: { recordedBy: { select: { id: true, fullName: true } } },
      orderBy: { recordedAt: 'desc' },
    });
    res.json({ vitals: records });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/vitals ───────────────────────────────────

router.post('/', authenticate, validate(vitalSchema), async (req, res, next) => {
  try {
    const record = await prisma.vitalRecord.create({
      data: {
        ...req.body,
        recordedById: req.user.id,
      },
    });
    res.status(201).json({ vital: record });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/vitals/:id ──────────────────────────────

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const record = await prisma.vitalRecord.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ vital: record });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
