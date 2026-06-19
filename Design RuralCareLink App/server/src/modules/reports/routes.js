const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../../config/db');
const { authenticate } = require('../../middlewares/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'report-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow only PDFs
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB limit
  }
});

// ─── POST /api/reports ──────────────────────────────────
router.post('/', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { visitId, patientId, clientId } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'visitId is required' });
    }

    // Double check that the visit exists
    const visitExists = await prisma.visit.findUnique({
      where: { id: visitId }
    });
    if (!visitExists) {
      return res.status(404).json({ error: 'Associated visit not found on server' });
    }

    // Generate public URL for static file serving
    const fileUrl = `/uploads/${req.file.filename}`;

    // Create the VisitImage (report) in database
    const report = await prisma.visitImage.create({
      data: {
        id: clientId || undefined,
        visitId,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        url: fileUrl
      }
    });

    res.status(201).json({
      message: 'Report uploaded successfully',
      report
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
