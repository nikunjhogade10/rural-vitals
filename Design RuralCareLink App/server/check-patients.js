require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const patients = await prisma.patient.findMany({
    include: { createdBy: true }
  });
  console.log('--- Patients in Database ---');
  patients.forEach(p => {
    console.log(`[Patient] ID: ${p.id}, Name: ${p.fullName}, CreatedBy: ${p.createdBy?.fullName} (${p.createdBy?.employeeId})`);
  });

  const visits = await prisma.visit.findMany({
    include: { patient: true, createdBy: true }
  });
  console.log('\n--- Visits in Database ---');
  visits.forEach(v => {
    console.log(`[Visit] ID: ${v.id}, VisitNum: ${v.visitNumber}, Patient: ${v.patient?.fullName}, CreatedBy: ${v.createdBy?.fullName} (${v.createdBy?.employeeId}), Status: ${v.status}`);
  });

  await prisma.$disconnect();
}
main();
