require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const prescriptions = await prisma.prescription.findMany({
    include: {
      visit: {
        include: { patient: true }
      }
    }
  });
  console.log('--- Prescriptions in Database ---');
  prescriptions.forEach(p => {
    console.log(`[Prescription] ID: ${p.id}, VisitNum: ${p.visit?.visitNumber}, Patient: ${p.visit?.patient?.fullName}, Med: ${p.medicationName}, Status: ${p.visit?.status}`);
  });
  await prisma.$disconnect();
}
main();
