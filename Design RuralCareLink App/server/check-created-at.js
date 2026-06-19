require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log('--- Audit Logs ---');
  auditLogs.forEach(l => {
    console.log(`[AuditLog] Action: ${l.action}, EntityType: ${l.entityType}, EntityId: ${l.entityId}, CreatedAt: ${l.createdAt}`);
  });

  await prisma.$disconnect();
}
main();
