const express = require('express');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

// ─── GET /api/settings ──────────────────────────────────

router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        preferredLanguage: true,
        fontSizePreference: true,
        highContrastEnabled: true,
        audioGuidanceEnabled: true,
      },
    });
    res.json({ settings: user });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/settings ────────────────────────────────

router.patch('/', authenticate, async (req, res, next) => {
  try {
    const allowedFields = [
      'preferredLanguage',
      'fontSizePreference',
      'highContrastEnabled',
      'audioGuidanceEnabled',
    ];

    const data = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field];
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        preferredLanguage: true,
        fontSizePreference: true,
        highContrastEnabled: true,
        audioGuidanceEnabled: true,
      },
    });

    res.json({ settings: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
