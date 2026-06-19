require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const { errorHandler } = require('./middlewares/errorHandler');

// Module routes
const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/users/routes');
const facilityRoutes = require('./modules/facilities/routes');
const dashboardRoutes = require('./modules/dashboard/routes');
const patientRoutes = require('./modules/patients/routes');
const visitRoutes = require('./modules/visits/routes');
const vitalRoutes = require('./modules/vitals/routes');
const consultationRoutes = require('./modules/consultations/routes');
const prescriptionRoutes = require('./modules/prescriptions/routes');
const notificationRoutes = require('./modules/notifications/routes');
const reportRoutes = require('./modules/reports/routes');
const syncRoutes = require('./modules/sync/routes');
const settingsRoutes = require('./modules/settings/routes');
const auditRoutes = require('./modules/audit/routes');
const i18nRoutes = require('./modules/i18n/routes');

const app = express();

// ─── Middleware ──────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  config.frontendUrl
].filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes ─────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/vitals', vitalRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/i18n', i18nRoutes);

// ─── Health check ───────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 handler ────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Error handler ──────────────────────────────────────

app.use(errorHandler);

// ─── Start server ───────────────────────────────────────

app.listen(config.port, () => {
  console.log(`\n🏥 RuralCareLink API server running on http://localhost:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Frontend CORS: ${config.frontendUrl}\n`);
});

module.exports = app;
