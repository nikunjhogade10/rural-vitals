const express = require('express');
const Joi = require('joi');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');

const router = express.Router();

const querySchema = Joi.object({
  type: Joi.string().valid('all', 'DOCTOR_ALERT', 'SYNC_ALERT', 'REMINDER', 'SYSTEM').default('all'),
  unreadOnly: Joi.boolean().default(false),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

// ─── GET /api/notifications ─────────────────────────────

router.get('/', authenticate, validate(querySchema, 'query'), async (req, res, next) => {
  try {
    const { type, unreadOnly } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (type !== 'all') where.type = type;
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);

    res.json({ notifications, total, unreadCount, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/notifications/:id/read ──────────────────

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/notifications/read-all ───────────────────

router.post('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/notifications/:id ──────────────────────

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id, userId: req.user.id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
