require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const syncJobs = await prisma.syncJob.findMany({
    orderBy: { updatedAt: 'desc' }
  });
  console.log('--- Sync Jobs in Server DB ---');
  syncJobs.forEach(job => {
    console.log(`[SyncJob] ClientId: ${job.clientId}, EntityType: ${job.entityType}, EntityId: ${job.entityId}, Status: ${job.syncStatus}, Error: ${job.lastError}, Retry: ${job.retryCount}`);
  });

  const syncHistory = await prisma.syncHistory.findMany({
    orderBy: { startedAt: 'desc' },
    take: 5
  });
  console.log('\n--- Sync History in Server DB ---');
  syncHistory.forEach(h => {
    console.log(`[SyncHistory] ID: ${h.id}, Total: ${h.totalRecords}, Success: ${h.successCount}, Failed: ${h.failedCount}, Status: ${h.status}`);
  });

  await prisma.$disconnect();
}
main();
