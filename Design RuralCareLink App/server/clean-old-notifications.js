const path = require('path');
process.chdir(__dirname);

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const notifications = await prisma.notification.findMany();
  let updatedCount = 0;
  for (const n of notifications) {
    let newMessage = n.message;
    if (n.message.includes('Dr. Nurse Priya Sharma')) {
      newMessage = n.message.replace('Dr. Nurse Priya Sharma', 'Nurse Priya Sharma');
    }
    if (n.message.includes('Dr. Dr. Rajesh Kapoor')) {
      newMessage = n.message.replace('Dr. Dr. Rajesh Kapoor', 'Dr. Rajesh Kapoor');
    }
    if (newMessage !== n.message) {
      await prisma.notification.update({
        where: { id: n.id },
        data: { message: newMessage }
      });
      updatedCount++;
    }
  }
  console.log(`Successfully cleaned up ${updatedCount} notifications in the database.`);
  await prisma.$disconnect();
}
main();
