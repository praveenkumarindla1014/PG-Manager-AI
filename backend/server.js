import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Route imports
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

// Scheduler
import { initScheduler } from './services/scheduler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// API Routes
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PG Management AI Server Running', timestamp: new Date() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🤖 AI-First PG Management System Active`);
    
    // Initialize scheduled jobs
    initScheduler(io);
  });
});

export { io };
export default app;
