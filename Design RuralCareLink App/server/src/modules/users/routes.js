const express = require('express');
const Joi = require('joi');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { logAudit } = require('../../utils/helpers');

const router = express.Router();

// ─── Validation ─────────────────────────────────────────

const updateSettingsSchema = Joi.object({
  preferredLanguage: Joi.string().valid('en', 'hi', 'mr', 'kn', 'te', 'ta', 'gu', 'bn'),
  fontSizePreference: Joi.string().valid('Small', 'Medium', 'Large'),
  highContrastEnabled: Joi.boolean(),
  audioGuidanceEnabled: Joi.boolean(),
  fullName: Joi.string().min(2).max(100),
  phone: Joi.string().allow('', null),
  email: Joi.string().email().allow('', null),
});

// ─── GET /api/users/profile ─────────────────────────────

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { facility: true },
    });
    const { passwordHash, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/users/profile ───────────────────────────

router.patch(
  '/profile',
  authenticate,
  validate(updateSettingsSchema),
  async (req, res, next) => {
    try {
      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: req.body,
        include: { facility: true },
      });

      await logAudit({
        userId: req.user.id,
        action: 'UPDATE',
        entityType: 'user',
        entityId: req.user.id,
        metadata: { fields: Object.keys(req.body) },
      });

      const { passwordHash, ...safeUser } = updated;
      res.json({ user: safeUser });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
