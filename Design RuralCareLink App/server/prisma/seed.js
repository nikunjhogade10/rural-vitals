require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── Facility ───────────────────────────────────────
  const facility = await prisma.facility.create({
    data: {
      name: 'PHC Nandurbar',
      type: 'PHC',
      hmisCode: 'MH-NDR-001',
      block: 'Akrani',
      district: 'Nandurbar',
      state: 'Maharashtra',
      village: 'Nandurbar',
    },
  });
  console.log('✓ Facility created:', facility.name);

  // ─── Users ──────────────────────────────────────────
  const pwHash = await bcrypt.hash('password123', 12);

  const nurse = await prisma.user.create({
    data: {
      fullName: 'Nurse Priya Sharma',
      employeeId: 'MH-2024-089',
      email: 'priya@phc-nandurbar.in',
      phone: '9876543210',
      passwordHash: pwHash,
      role: 'HEALTH_WORKER',
      facilityId: facility.id,
      preferredLanguage: 'en',
    },
  });

  const doctor = await prisma.user.create({
    data: {
      fullName: 'Dr. Rajesh Kapoor',
      employeeId: 'MH-DOC-042',
      email: 'dr.kapoor@health.gov.in',
      phone: '9876500001',
      passwordHash: pwHash,
      role: 'DOCTOR',
      facilityId: facility.id,
      preferredLanguage: 'en',
    },
  });
  console.log('✓ Users created: nurse + doctor (password: password123)');

  // ─── Patients ───────────────────────────────────────
  const patientsData = [
    { fullName: 'Sunita Devi', gender: 'FEMALE', age: 34, phone: '9867543210', village: 'Nandurbar', district: 'Nandurbar', state: 'Maharashtra', preferredLanguage: 'hi' },
    { fullName: 'Ramesh Kumar', gender: 'MALE', age: 52, phone: '9867543211', village: 'Akrani', district: 'Nandurbar', state: 'Maharashtra', preferredLanguage: 'hi' },
    { fullName: 'Lakshmi Bai', gender: 'FEMALE', age: 28, phone: '9867543212', village: 'Navapur', district: 'Nandurbar', state: 'Maharashtra', preferredLanguage: 'kn' },
    { fullName: 'Vijay Patil', gender: 'MALE', age: 45, phone: '9867543213', village: 'Shahada', district: 'Nandurbar', state: 'Maharashtra', preferredLanguage: 'mr' },
    { fullName: 'Kavita Sharma', gender: 'FEMALE', age: 30, phone: '9867543214', village: 'Taloda', district: 'Nandurbar', state: 'Maharashtra', preferredLanguage: 'hi' },
    { fullName: 'Mohan Rao', gender: 'MALE', age: 67, phone: '9867543215', village: 'Dhadgaon', district: 'Nandurbar', state: 'Maharashtra', preferredLanguage: 'mr' },
    { fullName: 'Anita Reddy', gender: 'FEMALE', age: 22, phone: '9867543216', village: 'Navapur', district: 'Nandurbar', state: 'Maharashtra', preferredLanguage: 'hi' },
    { fullName: 'Suresh Nair', gender: 'MALE', age: 38, phone: '9867543217', village: 'Akrani', district: 'Nandurbar', state: 'Maharashtra', preferredLanguage: 'kn' },
  ];

  const patients = [];
  for (const p of patientsData) {
    const patient = await prisma.patient.create({
      data: { ...p, facilityId: facility.id, createdById: nurse.id },
    });
    patients.push(patient);
  }
  console.log(`✓ ${patients.length} patients created`);

  // ─── Visits + Vitals ────────────────────────────────
  const visitsData = [
    { patientIdx: 0, complaint: 'Fever, Cough', symptoms: ['Fever', 'Cough', 'Body Pain'], status: 'PENDING_SYNC', temp: 101.2, bp: [130, 85], pulse: 88, spo2: 97, weight: 58 },
    { patientIdx: 1, complaint: 'Hypertension', symptoms: ['Dizziness', 'Headache'], status: 'SYNCED', temp: 98.6, bp: [160, 100], pulse: 76, spo2: 98, weight: 72 },
    { patientIdx: 2, complaint: 'Anemia', symptoms: ['Fatigue', 'Dizziness'], status: 'REVIEWED', temp: 98.4, bp: [110, 70], pulse: 82, spo2: 99, weight: 50 },
    { patientIdx: 3, complaint: 'Diabetes follow-up', symptoms: ['Fatigue'], status: 'PENDING_SYNC', temp: 98.6, bp: [140, 90], pulse: 80, spo2: 98, weight: 78 },
    { patientIdx: 4, complaint: 'Prenatal check', symptoms: [], status: 'SYNCED', temp: 98.2, bp: [120, 80], pulse: 78, spo2: 99, weight: 62 },
    { patientIdx: 5, complaint: 'Chest pain, Dyspnea', symptoms: ['Chest Pain', 'Breathlessness'], status: 'REVIEWED', temp: 98.8, bp: [150, 95], pulse: 92, spo2: 94, weight: 65 },
    { patientIdx: 6, complaint: 'Typhoid fever', symptoms: ['Fever', 'Vomiting', 'Headache'], status: 'PENDING_SYNC', temp: 103.1, bp: [110, 70], pulse: 96, spo2: 96, weight: 48 },
    { patientIdx: 7, complaint: 'Malaria', symptoms: ['Fever', 'Cold', 'Body Pain'], status: 'SYNCED', temp: 102.5, bp: [120, 80], pulse: 88, spo2: 97, weight: 70 },
  ];

  let visitCount = 0;
  for (const v of visitsData) {
    visitCount++;
    const visit = await prisma.visit.create({
      data: {
        visitNumber: `RC-2024-${String(visitCount).padStart(4, '0')}`,
        patientId: patients[v.patientIdx].id,
        facilityId: facility.id,
        createdById: nurse.id,
        chiefComplaint: v.complaint,
        symptoms: v.symptoms,
        status: v.status,
        consultationMode: 'OFFLINE',
        networkStatus: 'OFFLINE',
        syncedAt: ['SYNCED', 'REVIEWED'].includes(v.status) ? new Date() : null,
        reviewedAt: v.status === 'REVIEWED' ? new Date() : null,
        assignedDoctorId: v.status === 'REVIEWED' ? doctor.id : null,
      },
    });

    await prisma.vitalRecord.create({
      data: {
        visitId: visit.id,
        temperature: v.temp,
        pulse: v.pulse,
        spo2: v.spo2,
        systolicBP: v.bp[0],
        diastolicBP: v.bp[1],
        weight: v.weight,
        recordedById: nurse.id,
      },
    });

    // Add clinical note for the first patient
    if (v.patientIdx === 0) {
      await prisma.consultationNote.create({
        data: {
          visitId: visit.id,
          authorId: nurse.id,
          authorRole: 'HEALTH_WORKER',
          noteType: 'clinical_notes',
          content: 'Patient presents with fever since 3 days. Mild cough, no breathing difficulty. History of seasonal flu. Parents report recent travel to Nashik.',
        },
      });
    }

    // Add doctor review note for reviewed visits
    if (v.status === 'REVIEWED') {
      await prisma.consultationNote.create({
        data: {
          visitId: visit.id,
          authorId: doctor.id,
          authorRole: 'DOCTOR',
          noteType: 'doctor_review',
          content: v.patientIdx === 2
            ? 'Iron supplementation recommended. Lab tests ordered for hemoglobin and ferritin levels.'
            : 'Monitor BP closely. Increase medication dosage. Follow-up in 1 week.',
        },
      });

      await prisma.prescription.create({
        data: {
          visitId: visit.id,
          prescribedById: doctor.id,
          medicationName: v.patientIdx === 2 ? 'Ferrous Sulfate 200mg' : 'Amlodipine 5mg',
          dosage: v.patientIdx === 2 ? '200mg' : '5mg',
          frequency: 'Once daily',
          duration: '30 days',
          instructions: 'Take after meals',
        },
      });
    }
  }
  console.log(`✓ ${visitCount} visits with vitals created`);

  // ─── Notifications ──────────────────────────────────
  const notifications = [
    { type: 'DOCTOR_ALERT', title: 'Doctor Response', message: "Dr. Kapoor reviewed Sunita Devi's case and prescribed Paracetamol 500mg. Follow-up in 3 days.", read: false },
    { type: 'SYNC_ALERT', title: 'Sync Completed', message: '8 patient records successfully uploaded to server.', read: false },
    { type: 'REMINDER', title: 'Follow-up Reminder', message: 'Ramesh Kumar (Hypertension) is due for a follow-up visit today.', read: true },
    { type: 'DOCTOR_ALERT', title: 'Doctor Response', message: "Dr. Kapoor reviewed Lakshmi Bai's case. Iron supplementation recommended.", read: true },
    { type: 'SYNC_ALERT', title: 'Sync Completed', message: '11 records synced successfully.', read: true },
    { type: 'REMINDER', title: 'Vaccination Reminder', message: '3 children in your catchment area are due for polio vaccination this week.', read: true },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: { userId: nurse.id, type: n.type, title: n.title, message: n.message, isRead: n.read },
    });
  }
  console.log(`✓ ${notifications.length} notifications created`);

  // ─── Sync History ───────────────────────────────────
  const syncEntries = [
    { total: 6, success: 6, failed: 0, status: 'SYNCED', ago: 4 * 60 * 60 * 1000 },
    { total: 11, success: 11, failed: 0, status: 'SYNCED', ago: 28 * 60 * 60 * 1000 },
    { total: 8, success: 6, failed: 2, status: 'SYNCED', ago: 4 * 24 * 60 * 60 * 1000 },
  ];

  for (const s of syncEntries) {
    const startedAt = new Date(Date.now() - s.ago);
    await prisma.syncHistory.create({
      data: {
        triggeredById: nurse.id,
        totalRecords: s.total,
        successCount: s.success,
        failedCount: s.failed,
        status: s.status,
        startedAt,
        finishedAt: new Date(startedAt.getTime() + 30000),
      },
    });
  }
  console.log('✓ Sync history created');

  // ─── Supported Languages ────────────────────────────
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', script: 'A', preview: 'Good morning, how are you feeling today?' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', script: 'अ', preview: 'आज आप कैसा महसूस कर रहे हैं?' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'अ', preview: 'आज तुम्हाला कसे वाटत आहे?' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'ಅ', preview: 'ಇಂದು ನೀವು ಹೇಗೆ ಅನುಭವಿಸುತ್ತೀರಿ?' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'అ', preview: 'ఈరోజు మీకు ఎలా అనిపిస్తోంది?' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'அ', preview: 'இன்று நீங்கள் எப்படி இருக்கிறீர்கள்?' },
  ];

  for (const lang of languages) {
    await prisma.supportedLanguage.create({ data: lang });
  }
  console.log('✓ Supported languages created');

  // ─── Translation Labels (core keys × 4 locales) ────
  const translationData = [
    // Login screen
    { key: 'login.signIn', screen: 'login', en: 'Sign In', hi: 'साइन इन करें', mr: 'साइन इन करा', kn: 'ಸೈನ್ ಇನ್' },
    { key: 'login.username', screen: 'login', en: 'Username / Employee ID', hi: 'उपयोगकर्ता नाम / कर्मचारी ID', mr: 'वापरकर्ता नाव / कर्मचारी ID', kn: 'ಬಳಕೆದಾರ ಹೆಸರು / ಉದ್ಯೋಗಿ ID' },
    { key: 'login.password', screen: 'login', en: 'Password', hi: 'पासवर्ड', mr: 'पासवर्ड', kn: 'ಪಾಸ್‌ವರ್ಡ್' },
    { key: 'login.continueOffline', screen: 'login', en: 'Continue Offline', hi: 'ऑफ़लाइन जारी रखें', mr: 'ऑफलाइन सुरू ठेवा', kn: 'ಆಫ್‌ಲೈನ್ ಮುಂದುವರಿಸಿ' },
    // Dashboard
    { key: 'dashboard.welcome', screen: 'dashboard', en: 'Welcome back,', hi: 'वापस स्वागत है,', mr: 'पुन्हा स्वागत आहे,', kn: 'ಮರಳಿ ಸ್ವಾಗತ,' },
    { key: 'dashboard.totalPatients', screen: 'dashboard', en: 'Total Patients', hi: 'कुल मरीज', mr: 'एकूण रुग्ण', kn: 'ಒಟ್ಟು ರೋಗಿಗಳು' },
    { key: 'dashboard.pendingSync', screen: 'dashboard', en: 'Pending Sync', hi: 'सिंक बाकी', mr: 'सिंक बाकी', kn: 'ಸಿಂಕ್ ಬಾಕಿ' },
    { key: 'dashboard.syncedCases', screen: 'dashboard', en: 'Synced Cases', hi: 'सिंक किए गए', mr: 'सिंक केलेले', kn: 'ಸಿಂಕ್ ಆದ' },
    { key: 'dashboard.recentCases', screen: 'dashboard', en: 'Recent Cases', hi: 'हाल के केस', mr: 'अलीकडील केस', kn: 'ಇತ್ತೀಚಿನ ಪ್ರಕರಣಗಳು' },
    { key: 'dashboard.quickActions', screen: 'dashboard', en: 'Quick Actions', hi: 'त्वरित कार्य', mr: 'जलद कृती', kn: 'ತ್ವರಿತ ಕ್ರಿಯೆಗಳು' },
    { key: 'dashboard.registerPatient', screen: 'dashboard', en: 'Register Patient', hi: 'मरीज दर्ज करें', mr: 'रुग्ण नोंदणी', kn: 'ರೋಗಿ ನೋಂದಣಿ' },
    { key: 'dashboard.viewCases', screen: 'dashboard', en: 'View Cases', hi: 'केस देखें', mr: 'केस पहा', kn: 'ಪ್ರಕರಣಗಳನ್ನು ನೋಡಿ' },
    { key: 'dashboard.syncData', screen: 'dashboard', en: 'Sync Data', hi: 'डेटा सिंक', mr: 'डेटा सिंक', kn: 'ಡೇಟಾ ಸಿಂಕ್' },
    // Patient registration
    { key: 'patient.name', screen: 'patient', en: 'Patient Name', hi: 'मरीज का नाम', mr: 'रुग्णाचे नाव', kn: 'ರೋಗಿಯ ಹೆಸರು' },
    { key: 'patient.age', screen: 'patient', en: 'Age', hi: 'आयु', mr: 'वय', kn: 'ವಯಸ್ಸು' },
    { key: 'patient.gender', screen: 'patient', en: 'Gender', hi: 'लिंग', mr: 'लिंग', kn: 'ಲಿಂಗ' },
    { key: 'patient.mobile', screen: 'patient', en: 'Mobile Number', hi: 'मोबाइल नंबर', mr: 'मोबाइल नंबर', kn: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ' },
    { key: 'patient.address', screen: 'patient', en: 'Address', hi: 'पता', mr: 'पत्ता', kn: 'ವಿಳಾಸ' },
    { key: 'patient.healthId', screen: 'patient', en: 'Aadhaar / Health ID (Optional)', hi: 'आधार / Health ID (वैकल्पिक)', mr: 'आधार / Health ID (ऐच्छिक)', kn: 'ಆಧಾರ್ / Health ID (ಐಚ್ಛಿಕ)' },
    { key: 'patient.preferredLanguage', screen: 'patient', en: 'Preferred Language', hi: 'पसंदीदा भाषा', mr: 'पसंतीची भाषा', kn: 'ಆದ್ಯತೆಯ ಭಾಷೆ' },
    // Common
    { key: 'common.back', screen: 'common', en: 'Back', hi: 'वापस', mr: 'मागे', kn: 'ಹಿಂದೆ' },
    { key: 'common.save', screen: 'common', en: 'Save', hi: 'सहेजें', mr: 'जतन करा', kn: 'ಉಳಿಸಿ' },
    { key: 'common.viewAll', screen: 'common', en: 'View all', hi: 'सभी देखें', mr: 'सर्व पहा', kn: 'ಎಲ್ಲಾ ನೋಡಿ' },
    { key: 'common.connected', screen: 'common', en: 'Connected', hi: 'कनेक्टेड', mr: 'जोडलेले', kn: 'ಸಂಪರ್ಕಿತ' },
    { key: 'common.offline', screen: 'common', en: 'Offline Mode', hi: 'ऑफ़लाइन मोड', mr: 'ऑफलाइन मोड', kn: 'ಆಫ್‌ಲೈನ್ ಮೋಡ್' },
    { key: 'common.logout', screen: 'common', en: 'Logout', hi: 'लॉग आउट', mr: 'लॉग आउट', kn: 'ಲಾಗ್ ಔಟ್' },
    // Sync screen
    { key: 'sync.title', screen: 'sync', en: 'Data Synchronization', hi: 'डेटा सिंक्रोनाइज़ेशन', mr: 'डेटा सिंक्रोनाइझेशन', kn: 'ಡೇಟಾ ಸಿಂಕ್ರೊನೈಸೇಶನ್' },
    { key: 'sync.startSync', screen: 'sync', en: 'Start Sync', hi: 'सिंक शुरू करें', mr: 'सिंक सुरू करा', kn: 'ಸಿಂಕ್ ಪ್ರಾರಂಭಿಸಿ' },
    { key: 'sync.syncing', screen: 'sync', en: 'Syncing…', hi: 'सिंक हो रहा है…', mr: 'सिंक होत आहे…', kn: 'ಸಿಂಕ್ ಆಗುತ್ತಿದೆ…' },
    { key: 'sync.complete', screen: 'sync', en: 'Sync Complete', hi: 'सिंक पूरा', mr: 'सिंक पूर्ण', kn: 'ಸಿಂಕ್ ಪೂರ್ಣ' },
    { key: 'sync.history', screen: 'sync', en: 'Sync History', hi: 'सिंक इतिहास', mr: 'सिंक इतिहास', kn: 'ಸಿಂಕ್ ಇತಿಹಾಸ' },
    // Notifications
    { key: 'notifications.title', screen: 'notifications', en: 'Notifications', hi: 'सूचनाएं', mr: 'सूचना', kn: 'ಅಧಿಸೂಚನೆಗಳು' },
    { key: 'notifications.markAllRead', screen: 'notifications', en: 'Mark all read', hi: 'सभी पढ़ा चिह्नित करें', mr: 'सर्व वाचले म्हणून चिन्हांकित करा', kn: 'ಎಲ್ಲವನ್ನೂ ಓದಿದೆ ಎಂದು ಗುರುತಿಸಿ' },
    // Profile
    { key: 'profile.title', screen: 'profile', en: 'Profile & Settings', hi: 'प्रोफ़ाइल और सेटिंग्स', mr: 'प्रोफाइल आणि सेटिंग्ज', kn: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು' },
    { key: 'profile.facilityInfo', screen: 'profile', en: 'Facility Information', hi: 'सुविधा जानकारी', mr: 'सुविधा माहिती', kn: 'ಸೌಲಭ್ಯ ಮಾಹಿತಿ' },
  ];

  for (const t of translationData) {
    const locales = { en: t.en, hi: t.hi, mr: t.mr, kn: t.kn };
    for (const [code, value] of Object.entries(locales)) {
      await prisma.translationLabel.create({
        data: { key: t.key, languageCode: code, value, screen: t.screen },
      });
    }
  }
  console.log(`✓ ${translationData.length * 4} translation labels created (4 locales)`);

  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Health Worker: MH-2024-089 / password123');
  console.log('  Doctor:        MH-DOC-042  / password123\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
