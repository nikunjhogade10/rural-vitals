const prisma = require('../config/db');

/**
 * Log an audit event.
 */
async function logAudit({ userId, action, entityType, entityId, metadata }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId, metadata },
    });
  } catch (err) {
    // Audit logging should never crash the request
    console.error('[AUDIT] Failed to log:', err.message);
  }
}

/**
 * Generate a visit number like RC-2024-0001
 */
async function generateVisitNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.visit.count({
    where: {
      visitNumber: { startsWith: `RC-${year}` },
    },
  });
  const num = String(count + 1).padStart(4, '0');
  return `RC-${year}-${num}`;
}

module.exports = { logAudit, generateVisitNumber };
