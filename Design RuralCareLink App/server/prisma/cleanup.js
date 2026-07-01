const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/config/db');

async function main() {
  console.log('--- Database Cleanup Started ---');

  // 1. Clean up duplicate patients
  const patients = await prisma.patient.findMany({
    include: {
      visits: true,
      createdBy: true
    }
  });

  console.log(`Found ${patients.length} total patients in database.`);

  const patientGroups = {};
  for (const p of patients) {
    // Generate a key based on name, gender, age, and phone to group duplicates
    const phoneClean = p.phone ? p.phone.trim().replace(/\D/g, '') : '';
    const key = `${p.fullName.trim().toLowerCase()}_${p.gender}_${p.age}_${phoneClean}`;
    if (!patientGroups[key]) {
      patientGroups[key] = [];
    }
    patientGroups[key].push(p);
  }

  let deletedPatientsCount = 0;
  let mergedVisitsCount = 0;

  for (const [key, group] of Object.entries(patientGroups)) {
    if (group.length > 1) {
      console.log(`\nDuplicate group found for key: ${key}`);
      
      // Sort patients: prefer the one that has visits, or has ABHA number, or is older
      group.sort((a, b) => {
        if (a.visits.length !== b.visits.length) {
          return b.visits.length - a.visits.length; // more visits first
        }
        if (a.abhaNumber && !b.abhaNumber) return -1;
        if (!a.abhaNumber && b.abhaNumber) return 1;
        return new Date(a.createdAt) - new Date(b.createdAt); // older first
      });

      const primary = group[0];
      const duplicates = group.slice(1);

      console.log(`Keeping primary patient: ${primary.fullName} (ID: ${primary.id}) with ${primary.visits.length} visits.`);

      for (const dup of duplicates) {
        console.log(`Merging duplicate patient: ${dup.fullName} (ID: ${dup.id}) with ${dup.visits.length} visits.`);

        // 1. Move visits to primary patient
        if (dup.visits.length > 0) {
          const updateRes = await prisma.visit.updateMany({
            where: { patientId: dup.id },
            data: { patientId: primary.id }
          });
          mergedVisitsCount += updateRes.count;
          console.log(`  Moved ${updateRes.count} visits to primary patient.`);
        }

        // 2. Delete SyncJobs that point to this patient
        await prisma.syncJob.deleteMany({
          where: { entityId: dup.id }
        });

        // 3. Delete the duplicate patient
        await prisma.patient.delete({
          where: { id: dup.id }
        });
        deletedPatientsCount++;
      }
    }
  }

  // 2. Clean up duplicate visits (same patient, same chiefComplaint/symptoms within 1 hour)
  const visits = await prisma.visit.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\nFound ${visits.length} total visits in database.`);

  const duplicateVisitsToDelete = [];
  let deletedVisitsCount = 0;

  for (let i = 0; i < visits.length; i++) {
    const v1 = visits[i];
    if (duplicateVisitsToDelete.includes(v1.id)) continue;

    for (let j = i + 1; j < visits.length; j++) {
      const v2 = visits[j];
      if (duplicateVisitsToDelete.includes(v2.id)) continue;

      if (v1.patientId === v2.patientId) {
        const timeDiff = Math.abs(new Date(v1.createdAt) - new Date(v2.createdAt)) / 1000 / 60; // diff in minutes
        const sameComplaint = (v1.chiefComplaint || '').trim().toLowerCase() === (v2.chiefComplaint || '').trim().toLowerCase();
        
        // If visits are for the same patient, within 2 hours, and have the exact same chief complaint
        if (timeDiff < 120 && sameComplaint) {
          console.log(`Found potential duplicate visit for patient ${v1.patientId}:`);
          console.log(`  Visit 1: ${v1.visitNumber} (ID: ${v1.id}) at ${v1.createdAt}`);
          console.log(`  Visit 2: ${v2.visitNumber} (ID: ${v2.id}) at ${v2.createdAt}`);
          
          // Let's check which visit has more details (vital records, notes, prescriptions)
          const details1 = await getVisitDetailsCount(v1.id);
          const details2 = await getVisitDetailsCount(v2.id);

          const toKeep = details1 >= details2 ? v1 : v2;
          const toDelete = details1 >= details2 ? v2 : v1;

          console.log(`  Decided to keep: ${toKeep.visitNumber} (ID: ${toKeep.id})`);
          console.log(`  Decided to merge/delete: ${toDelete.visitNumber} (ID: ${toDelete.id})`);

          // Move any records from toDelete to toKeep
          await mergeVisitSubrecords(toDelete.id, toKeep.id);

          duplicateVisitsToDelete.push(toDelete.id);
        }
      }
    }
  }

  for (const id of duplicateVisitsToDelete) {
    // Delete any dependent records
    await prisma.vitalRecord.deleteMany({ where: { visitId: id } });
    await prisma.consultationNote.deleteMany({ where: { visitId: id } });
    await prisma.prescription.deleteMany({ where: { visitId: id } });
    await prisma.visitImage.deleteMany({ where: { visitId: id } });
    await prisma.syncJob.deleteMany({ where: { entityId: id } });
    
    await prisma.visit.delete({ where: { id } });
    deletedVisitsCount++;
  }

  console.log('\n--- Cleanup Summary ---');
  console.log(`Deleted duplicate patients: ${deletedPatientsCount}`);
  console.log(`Re-linked/Merged visits: ${mergedVisitsCount}`);
  console.log(`Deleted duplicate visits: ${deletedVisitsCount}`);
  console.log('-----------------------');
}

async function getVisitDetailsCount(visitId) {
  const [vitals, notes, prescriptions, images] = await Promise.all([
    prisma.vitalRecord.count({ where: { visitId } }),
    prisma.consultationNote.count({ where: { visitId } }),
    prisma.prescription.count({ where: { visitId } }),
    prisma.visitImage.count({ where: { visitId } }),
  ]);
  return vitals + notes + prescriptions + images;
}

async function mergeVisitSubrecords(fromId, toId) {
  // Move Vital Records if destination doesn't have one
  const targetVitals = await prisma.vitalRecord.count({ where: { visitId: toId } });
  if (targetVitals === 0) {
    await prisma.vitalRecord.updateMany({
      where: { visitId: fromId },
      data: { visitId: toId }
    });
  }

  // Move Consultation Notes
  await prisma.consultationNote.updateMany({
    where: { visitId: fromId },
    data: { visitId: toId }
  });

  // Move Prescriptions
  await prisma.prescription.updateMany({
    where: { visitId: fromId },
    data: { visitId: toId }
  });

  // Move Images/Reports
  await prisma.visitImage.updateMany({
    where: { visitId: fromId },
    data: { visitId: toId }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
