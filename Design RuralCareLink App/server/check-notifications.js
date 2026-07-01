require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log('--- Notifications in Database ---');
  notifications.forEach(n => {
    console.log(`[Notification] ID: ${n.id}, Title: ${n.title}, Message: ${n.message}, Type: ${n.type}`);
  });
  await prisma.$disconnect();
}
main();
