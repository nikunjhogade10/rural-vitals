const express = require('express');
const prisma = require('../../config/db');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

// ─── GET /api/audit ─────────────────────────────────────

router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { user: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count(),
    ]);

    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
