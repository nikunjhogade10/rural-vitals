const path = require('path');
// Explicitly load the backend's .env file before initializing the database connection
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const prisma = require('./config/db');

async function main() {
  console.log('🔍 Locating original cases...');
  
  // Find patients whose names contain "nikunj" (case-insensitive)
  const originalPatients = await prisma.patient.findMany({
    where: {
      fullName: {
        contains: 'nikunj',
        mode: 'insensitive'
      }
    }
  });

  const originalPatientIds = originalPatients.map(p => p.id);
  console.log(`Found ${originalPatients.length} original patient(s):`, originalPatients.map(p => p.fullName));

  // Defensive check: if no matching patients are found, abort to prevent accidental complete wipe
  if (originalPatientIds.length === 0) {
    console.error('❌ Error: No patient found matching "nikunj". Aborting cleanup to prevent data loss.');
    return;
  }

  console.log('🧹 Cleaning up dummy data...');

  // 1. Delete visits not belonging to original patients.
  // Note: Cascade deletes on VitalRecord, ConsultationNote, Prescription, and VisitImage will execute automatically.
  const deletedVisits = await prisma.visit.deleteMany({
    where: {
      patientId: {
        notIn: originalPatientIds
      }
    }
  });
  console.log(`✓ Deleted ${deletedVisits.count} dummy visits (along with vitals, notes, and prescriptions)`);

  // 2. Delete patients not matching "nikunj"
  const deletedPatients = await prisma.patient.deleteMany({
    where: {
      id: {
        notIn: originalPatientIds
      }
    }
  });
  console.log(`✓ Deleted ${deletedPatients.count} dummy patients`);

  // 3. Clear out sync jobs
  const deletedSyncJobs = await prisma.syncJob.deleteMany({});
  console.log(`✓ Deleted ${deletedSyncJobs.count} sync jobs`);

  // 4. Clear out notifications
  const deletedNotifications = await prisma.notification.deleteMany({});
  console.log(`✓ Deleted ${deletedNotifications.count} notifications`);

  console.log('🎉 Database cleanup complete!');
}

main()
  .catch(err => {
    console.error('❌ Error during cleanup:', err);
  })
  .finally(() => {
    prisma.$disconnect();
  });
