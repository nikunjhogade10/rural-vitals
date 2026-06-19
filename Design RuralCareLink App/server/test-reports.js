require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const jwt = require('jsonwebtoken');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log('🧪 Running report upload endpoint verification test...');
  
  // Find a nurse and a visit to associate the report with
  const nurse = await prisma.user.findFirst({
    where: { role: 'HEALTH_WORKER' }
  });
  if (!nurse) {
    console.error('❌ No nurse found in the database. Run seed first.');
    process.exit(1);
  }

  const visit = await prisma.visit.findFirst();
  if (!visit) {
    console.error('❌ No visit found in database. Run seed first.');
    process.exit(1);
  }

  console.log(`✓ Using nurse: ${nurse.fullName} (${nurse.employeeId})`);
  console.log(`✓ Using visit: ${visit.visitNumber} (${visit.id})`);

  // Generate JWT token for nurse using the correct secret and payload keys
  const config = require('./src/config');
  const token = jwt.sign(
    { userId: nurse.id, employeeId: nurse.employeeId, role: nurse.role },
    config.jwt.secret,
    { expiresIn: '1h' }
  );

  // Read pdf test file from root
  const pdfPath = path.join(__dirname, '../test_lab_report.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF file not found at ${pdfPath}`);
    process.exit(1);
  }

  // Create multipart FormData using native Fetch / FormData
  const fileBuffer = fs.readFileSync(pdfPath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  
  const form = new FormData();
  form.append('file', blob, 'test_lab_report.pdf');
  form.append('patientId', visit.patientId);
  form.append('visitId', visit.id);
  form.append('clientId', 'client-side-report-uuid-999');

  const url = 'http://localhost:4000/api/reports';
  console.log(`Sending POST to ${url}...`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    });

    console.log(`HTTP Status: ${res.status}`);
    const json = await res.json();
    console.log('Response body:', JSON.stringify(json, null, 2));

    if (res.status === 201 && json.report && json.report.visitId === visit.id) {
      console.log('✅ SUCCESS: Report uploaded successfully, returned 201, and correctly linked to the visit!');
    } else {
      console.error('❌ FAILURE: Response did not match expected structure.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ HTTP request failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
