require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const patient = await prisma.patient.findFirst({
    where: {
      fullName: {
        contains: 'nikunj',
        mode: 'insensitive'
      }
    },
    include: {
      visits: {
        include: {
          vitalRecords: true,
          consultationNotes: true,
          prescriptions: true
        }
      }
    }
  });

  console.log(JSON.stringify(patient, null, 2));
  await prisma.$disconnect();
}
main();
