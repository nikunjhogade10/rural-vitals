const express = require('express');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

// ─── GET /api/dashboard/summary ─────────────────────────

router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const facilityId = req.user.facilityId;

    if (req.user.role === 'DOCTOR') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get count of cases created today
      const totalCasesToday = await prisma.visit.count({
        where: {
          createdAt: { gte: todayStart },
        },
      });

      // Get count of pending reviews (synced but not reviewed/completed)
      const pendingReviews = await prisma.visit.count({
        where: {
          status: { in: ['SYNCED', 'PENDING_SYNC'] },
          OR: [
            { assignedDoctorId: null },
            { assignedDoctorId: userId },
          ],
        },
      });

      // Get count of follow-ups due today or later
      const followUpsDue = await prisma.visit.count({
        where: {
          followUpDate: { gte: todayStart },
          assignedDoctorId: userId,
        },
      });

      // Get count of referred cases (visits with referral notes)
      const referredCases = await prisma.visit.count({
        where: {
          consultationNotes: {
            some: {
              noteType: 'referral'
            }
          }
        }
      });

      const totalPatients = await prisma.patient.count();
      const unreadNotifications = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      // Daily trend over last 7 days
      const dailyCases = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        const [submitted, reviewed] = await Promise.all([
          prisma.visit.count({
            where: { createdAt: { gte: d, lte: dayEnd } },
          }),
          prisma.visit.count({
            where: {
              reviewedAt: { gte: d, lte: dayEnd },
              status: 'REVIEWED',
            },
          }),
        ]);

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dailyCases.push({
          day: days[d.getDay()],
          cases: submitted,
          reviewed: reviewed,
        });
      }

      // Cases by region (PHC/Facility names)
      const regions = await prisma.facility.findMany({
        include: {
          _count: {
            select: { visits: true },
          },
        },
        take: 6,
      });
      const regionData = regions.map((r) => ({
        region: r.name.replace('PHC ', ''),
        cases: r._count.visits,
      }));

      // Language distribution
      const langCounts = await prisma.patient.groupBy({
        by: ['preferredLanguage'],
        _count: {
          _all: true,
        },
      });
      const totalPatientsForLang = langCounts.reduce((acc, curr) => acc + curr._count._all, 0) || 1;
      const langConfig = {
        en: { name: 'English', color: '#1565C0' },
        hi: { name: 'Hindi', color: '#2E7D32' },
        mr: { name: 'Marathi', color: '#E65100' },
        kn: { name: 'Kannada', color: '#7B1FA2' },
        te: { name: 'Telugu', color: '#00838F' },
      };
      const langData = langCounts.map((l) => {
        const conf = langConfig[l.preferredLanguage] || { name: l.preferredLanguage.toUpperCase(), color: '#b0bec5' };
        return {
          name: conf.name,
          value: Math.round((l._count._all / totalPatientsForLang) * 100),
          color: conf.color,
        };
      });

      return res.json({
        totalCasesToday,
        pendingReviews,
        followUpsDue,
        referredCases,
        totalPatients,
        unreadNotifications,
        dailyCases,
        regionData,
        langData,
      });
    }

    // Health worker dashboard logic
    const [totalPatients, pendingSync, syncedCases, totalVisits] = await Promise.all([
      prisma.patient.count({ where: { facilityId } }),
      prisma.visit.count({
        where: { facilityId, status: { in: ['DRAFT', 'PENDING_SYNC'] } },
      }),
      prisma.visit.count({
        where: { facilityId, status: { in: ['SYNCED', 'REVIEWED', 'COMPLETED'] } },
      }),
      prisma.visit.count({ where: { facilityId } }),
    ]);

    const lastSync = await prisma.syncHistory.findFirst({
      where: { triggeredById: userId, status: 'SYNCED' },
      orderBy: { finishedAt: 'desc' },
      select: { finishedAt: true },
    });

    const unreadNotifications = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    res.json({
      totalPatients,
      pendingSync,
      syncedCases,
      totalVisits,
      unreadNotifications,
      lastSync: lastSync?.finishedAt || null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/dashboard/recent-cases ────────────────────

router.get('/recent-cases', authenticate, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const where = {};
    if (req.user.role === 'DOCTOR') {
      where.OR = [
        { assignedDoctorId: req.user.id },
        { assignedDoctorId: null, status: { in: ['SYNCED', 'PENDING_SYNC'] } },
      ];
    } else {
      where.facilityId = req.user.facilityId;
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            age: true,
            gender: true,
            preferredLanguage: true,
            village: true,
            district: true,
          },
        },
        createdBy: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const cases = visits.map((v) => {
      let priority = 'Medium';
      if (v.visitType === 'emergency' || v.chiefComplaint?.toLowerCase().includes('severe') || v.chiefComplaint?.toLowerCase().includes('emergency') || v.chiefComplaint?.toLowerCase().includes('chest pain')) {
        priority = 'Emergency';
      } else if (v.visitType === 'high' || v.chiefComplaint?.toLowerCase().includes('fever 10') || v.chiefComplaint?.toLowerCase().includes('stroke') || v.chiefComplaint?.toLowerCase().includes('hypertension')) {
        priority = 'High';
      } else if (v.visitType === 'routine') {
        priority = 'Low';
      }

      const langMap = { en: 'English', hi: 'Hindi', mr: 'Marathi', kn: 'Kannada', te: 'Telugu' };

      return {
        id: v.id,
        visitNumber: v.visitNumber,
        name: v.patient.fullName,
        age: v.patient.age,
        gender: v.patient.gender === 'FEMALE' ? 'F' : v.patient.gender === 'MALE' ? 'M' : 'O',
        village: v.patient.village || 'Kalyanpur',
        district: v.patient.district || 'Fatehpur',
        time: v.visitDate ? new Date(v.visitDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
        priority,
        status: v.status === 'REVIEWED' ? 'Reviewed' : 'Pending',
        symptoms: v.chiefComplaint || v.symptoms?.join(', ') || '',
        submittedBy: v.createdBy?.fullName || 'Nurse Priya Sharma',
        language: langMap[v.patient.preferredLanguage] || 'English',
      };
    });

    res.json({ cases });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
