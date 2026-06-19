const express = require('express');
const Joi = require('joi');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');

const router = express.Router();

const noteSchema = Joi.object({
  visitId: Joi.string().uuid().required(),
  noteType: Joi.string().valid('clinical_notes', 'doctor_review', 'follow_up').default('clinical_notes'),
  content: Joi.string().required(),
});

// ─── GET /api/consultations/:visitId ────────────────────

router.get('/:visitId', authenticate, async (req, res, next) => {
  try {
    const notes = await prisma.consultationNote.findMany({
      where: { visitId: req.params.visitId },
      include: { author: { select: { id: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ notes });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/consultations ────────────────────────────

router.post('/', authenticate, validate(noteSchema), async (req, res, next) => {
  try {
    const note = await prisma.consultationNote.create({
      data: {
        ...req.body,
        authorId: req.user.id,
        authorRole: req.user.role,
      },
    });
    res.status(201).json({ note });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
