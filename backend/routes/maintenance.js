import express from 'express';
import MaintenanceSchedule from '../models/MaintenanceSchedule.js';
import Room from '../models/Room.js';
import Expense from '../models/Expense.js';
import { protect, isOwner } from '../middleware/auth.js';
import { predictMaintenance } from '../services/ai/predictionEngine.js';
import { notify } from '../services/notify.js';
import { ah, pick, httpError } from '../utils/http.js';

const router = express.Router();
const FIELDS = ['type', 'description', 'scheduledDate', 'assignedTo', 'assignedContact', 'estimatedCost', 'actualCost', 'priority', 'notes', 'status'];

router.get('/', protect, isOwner, ah(async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  // Anything still scheduled in the past is overdue.
  await MaintenanceSchedule.updateMany(
    { status: 'scheduled', scheduledDate: { $lt: new Date(new Date().setHours(0, 0, 0, 0)) } },
    { status: 'overdue' }
  );
  const schedules = await MaintenanceSchedule.find(query).populate('room', 'roomNumber floor').sort({ scheduledDate: 1 });
  res.json({ success: true, data: schedules });
}));

router.get('/predictions', protect, isOwner, ah(async (req, res) => {
  res.json({ success: true, data: await predictMaintenance(req.query.type) });
}));

router.post('/', protect, isOwner, ah(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.type || !data.description?.trim() || !data.scheduledDate) throw httpError(400, 'Type, description and date are required');
  if (req.body.roomNumber) {
    const room = await Room.findOne({ roomNumber: String(req.body.roomNumber) });
    if (!room) throw httpError(404, `Room ${req.body.roomNumber} not found`);
    Object.assign(data, { room: room._id, roomNumber: room.roomNumber, floor: room.floor });
  }
  const schedule = await MaintenanceSchedule.create({ ...data, createdBy: req.user._id });
  if (req.body.notifyTenants) {
    await notify(req.app.get('io'), {
      audience: 'all', type: 'maintenance',
      title: `🔧 ${schedule.type.replace('-', ' ')} on ${new Date(schedule.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`,
      message: schedule.description, link: '/maintenance'
    });
  }
  res.status(201).json({ success: true, data: await schedule.populate('room', 'roomNumber floor') });
}));

router.put('/:id', protect, isOwner, ah(async (req, res) => {
  const schedule = await MaintenanceSchedule.findById(req.params.id);
  if (!schedule) throw httpError(404, 'Task not found');
  const wasCompleted = schedule.status === 'completed';
  Object.assign(schedule, pick(req.body, FIELDS));
  if (schedule.status === 'completed' && !wasCompleted) {
    schedule.completedDate = new Date();
    // Log the actual cost as a maintenance expense automatically.
    const cost = Number(schedule.actualCost || schedule.estimatedCost) || 0;
    if (cost > 0 && req.body.logExpense !== false) {
      const now = new Date();
      await Expense.create({
        category: schedule.type === 'pest-control' ? 'pest-control' : 'maintenance',
        amount: cost, date: now, month: now.getMonth() + 1, year: now.getFullYear(),
        description: `${schedule.type.replace('-', ' ')}: ${schedule.description}`,
        vendorName: schedule.assignedTo, createdBy: req.user._id
      });
    }
  }
  await schedule.save();
  res.json({ success: true, data: await schedule.populate('room', 'roomNumber floor') });
}));

router.delete('/:id', protect, isOwner, ah(async (req, res) => {
  await MaintenanceSchedule.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Task deleted' });
}));

export default router;
