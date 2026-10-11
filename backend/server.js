import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

import { connectDB } from './config/db.js';
import { seedIfEmpty } from './services/seedData.js';
import { initScheduler } from './services/scheduler.js';
import { getAIStatus } from './services/ai/openaiClient.js';
import User from './models/User.js';
import Menu from './models/Menu.js';

import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import roomRoutes from './routes/rooms.js';
import tenantRoutes from './routes/tenants.js';
import paymentRoutes from './routes/payments.js';
import complaintRoutes from './routes/complaints.js';
import noticeRoutes from './routes/notices.js';
import menuRoutes from './routes/menu.js';
import visitorRoutes from './routes/visitors.js';
import expenseRoutes from './routes/expenses.js';
import maintenanceRoutes from './routes/maintenance.js';
import reportRoutes from './routes/reports.js';
import knowledgeBaseRoutes from './routes/knowledgeBase.js';
import communicationRoutes from './routes/communications.js';
import notificationRoutes from './routes/notifications.js';

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is missing in backend/.env');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'];

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, { cors: { origin: allowedOrigins, methods: ['GET', 'POST'] } });
app.set('io', io);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PG Manager AI server running', ai: getAIStatus(), timestamp: new Date() });
});

app.use('/api', (req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` }));

// Serve the built frontend in production (npm run build in /frontend).
const distDir = path.join(__dirname, '..', 'frontend', 'dist');
if ((process.env.NODE_ENV === 'production' || process.argv.includes('--serve-frontend')) && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// Central error handler — friendly messages instead of stack traces.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid ID' });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(', ') });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return res.status(409).json({ success: false, message: `That ${field} is already in use` });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'File is too large (max ~10 MB)' });
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ success: false, message: err.expose ? err.message : 'Something went wrong on our side. Please try again.' });
});

// Sockets: authenticate with the JWT, then join personal + role rooms.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select('role name');
    if (!user) return next(new Error('unauthorized'));
    socket.data.user = user;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  const { user } = socket.data;
  socket.join(`user-${user._id}`);
  if (user.role === 'owner') socket.join('owners');
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => Menu.syncIndexes().catch(() => {}))
  .then(seedIfEmpty)
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      initScheduler(io);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  });

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the other server or set PORT in backend/.env`);
    process.exit(1);
  }
});

export { io };
export default app;
