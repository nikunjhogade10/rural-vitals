const express = require('express');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

// ─── GET /api/facilities ────────────────────────────────

router.get('/', authenticate, async (req, res, next) => {
  try {
    const facilities = await prisma.facility.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ facilities });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/facilities/:id ────────────────────────────

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const facility = await prisma.facility.findUnique({
      where: { id: req.params.id },
    });
    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    res.json({ facility });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
