require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    include: { facility: true }
  });
  console.log('--- Users in database ---');
  users.forEach(u => {
    console.log(`[User] ID: ${u.id}, Name: ${u.fullName}, EmployeeId: ${u.employeeId}, Email: ${u.email}, Role: ${u.role}, Facility: ${u.facility?.name}`);
  });
  await prisma.$disconnect();
}
main();
