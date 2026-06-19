const express = require('express');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

// ─── GET /api/i18n/languages ────────────────────────────

router.get('/languages', async (req, res, next) => {
  try {
    const languages = await prisma.supportedLanguage.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    res.json({ languages });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/i18n/translations/:locale ─────────────────

router.get('/translations/:locale', async (req, res, next) => {
  try {
    const { locale } = req.params;
    const { screen } = req.query;

    const where = { languageCode: locale };
    if (screen) where.screen = screen;

    const labels = await prisma.translationLabel.findMany({ where });

    // Return as flat key-value object for easy consumption
    const translations = {};
    for (const label of labels) {
      translations[label.key] = label.value;
    }

    res.json({ locale, translations });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
