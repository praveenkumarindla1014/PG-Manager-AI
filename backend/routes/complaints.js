import express from 'express';
import Complaint from '../models/Complaint.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import { protect, isOwner } from '../middleware/auth.js';
import { analyzeComplaint, detectDuplicateComplaint } from '../services/ai/complaintAnalyzer.js';

const router = express.Router();

// GET /api/complaints
router.get('/', protect, async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.category) query.aiCategory = req.query.category;
    
    // Only filter by tenant if tenant role is requesting
    if (req.user.role === 'tenant') {
      query.tenant = req.user._id;
    }

    const complaints = await Complaint.find(query)
      .populate('tenant', 'name phone email')
      .populate('room', 'roomNumber floor')
      .sort({ urgencyScore: -1, createdAt: -1 });

    res.json({ success: true, data: complaints, count: complaints.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/complaints
router.post('/', protect, async (req, res) => {
  try {
    const { description, roomId } = req.body;
    
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Complaint description is required' });
    }

    // Determine room: passed roomId -> user's assigned roomId -> first available room as fallback
    let targetRoomId = roomId || req.user.roomId;
    if (!targetRoomId) {
      const anyRoom = await Room.findOne();
      targetRoomId = anyRoom?._id || null;
    }

    // AI Analysis
    let analysis;
    try {
      analysis = await analyzeComplaint(description);
    } catch (err) {
      analysis = {
        category: 'cleaning',
        priority: 'medium',
        estimatedTime: '4 Hours',
        suggestedStaff: 'Cleaning Staff',
        generatedReply: 'Issue recorded. Our team will resolve it soon.',
        sentiment: 'neutral',
        emoji: '😐',
        urgencyScore: 5,
        isEmergency: false,
        emergencyType: null
      };
    }

    let duplicate = { isDuplicate: false };
    try {
      duplicate = await detectDuplicateComplaint(description, targetRoomId);
    } catch (err) {
      console.warn('Duplicate detection notice:', err.message);
    }

    const complaint = await Complaint.create({
      tenant: req.user._id,
      room: targetRoomId,
      description: description.trim(),
      aiCategory: analysis.category || 'cleaning',
      aiPriority: analysis.priority || 'medium',
      aiEstimatedTime: analysis.estimatedTime || '4 Hours',
      aiSuggestedStaff: analysis.suggestedStaff || 'Cleaning Staff',
      aiGeneratedReply: analysis.generatedReply || 'Complaint received and scheduled for resolution.',
      aiSentiment: analysis.sentiment || 'neutral',
      sentimentEmoji: analysis.emoji || '😐',
      urgencyScore: analysis.urgencyScore || 5,
      isEmergency: !!analysis.isEmergency,
      emergencyType: analysis.emergencyType || null,
      isDuplicate: !!duplicate.isDuplicate,
      masterComplaintId: duplicate.masterComplaintId || null
    });

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('tenant', 'name phone email')
      .populate('room', 'roomNumber floor');

    // Notify via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new-complaint', {
        message: `📋 New complaint from ${req.user.name}: "${description}"`,
        complaint: populatedComplaint
      });

      if (analysis.isEmergency) {
        io.emit('emergency', {
          type: analysis.emergencyType || 'general',
          complaint: populatedComplaint,
          message: `🚨 EMERGENCY ALERT: ${description}`
        });
      }
    }

    res.status(201).json({ success: true, data: populatedComplaint });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/complaints/:id
router.put('/:id', protect, isOwner, async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('tenant', 'name phone email')
      .populate('room', 'roomNumber floor');
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
