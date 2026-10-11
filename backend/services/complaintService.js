import Complaint from '../models/Complaint.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import { analyzeComplaint, detectDuplicateComplaint } from './ai/complaintAnalyzer.js';
import { getEmergencyResponse } from './ai/emergencyDetector.js';
import { notify } from './notify.js';

/**
 * Create a complaint with AI analysis, duplicate grouping, live owner alerts
 * and emergency escalation. Shared by the REST route and the AI assistant.
 */
export async function createComplaintRecord({ userId, description, roomNumber, io }) {
  const text = String(description || '').trim();
  if (text.length < 3) return { success: false, message: 'Please describe the problem.' };

  const user = await User.findById(userId);
  let room = null;
  if (roomNumber) room = await Room.findOne({ roomNumber: String(roomNumber) });
  if (!room && user?.roomId) room = await Room.findById(user.roomId);

  const analysis = await analyzeComplaint(text);
  const duplicate = await detectDuplicateComplaint(text, room?._id, analysis.category);

  const complaint = await Complaint.create({
    tenant: userId,
    room: room?._id,
    description: text,
    aiCategory: analysis.category,
    aiPriority: analysis.priority,
    aiEstimatedTime: analysis.estimatedTime,
    aiSuggestedStaff: analysis.suggestedStaff,
    aiGeneratedReply: analysis.generatedReply,
    aiSentiment: analysis.sentiment,
    sentimentEmoji: analysis.emoji,
    urgencyScore: analysis.urgencyScore,
    isEmergency: !!analysis.isEmergency,
    emergencyType: analysis.isEmergency ? analysis.emergencyType || 'other' : undefined,
    isDuplicate: !!duplicate.isDuplicate,
    masterComplaintId: duplicate.masterComplaintId || undefined
  });

  if (duplicate.isDuplicate) {
    await Complaint.findByIdAndUpdate(duplicate.masterComplaintId, {
      $inc: { duplicateCount: 1 },
      $push: { linkedComplaints: complaint._id }
    });
  }

  const populated = await Complaint.findById(complaint._id)
    .populate('tenant', 'name phone email')
    .populate('room', 'roomNumber floor');

  const where = room ? `Room ${room.roomNumber}` : 'the PG';
  if (complaint.isEmergency) {
    analysis.emergencySteps = getEmergencyResponse(complaint.emergencyType);
    complaint.emergencyNotified = true;
    await complaint.save();
    io?.to('owners').to(`user-${userId}`).emit('emergency', {
      type: complaint.emergencyType,
      complaint: populated,
      steps: analysis.emergencySteps,
      message: `🚨 EMERGENCY in ${where}: ${text}`
    });
    await notify(io, { audience: 'owner', type: 'emergency', title: `🚨 Emergency — ${where}`, message: text, link: '/complaints' });
  } else {
    await notify(io, {
      audience: 'owner',
      type: 'complaint',
      title: `New ${complaint.aiPriority} priority complaint — ${where}`,
      message: `${user?.name || 'A tenant'}: ${text.slice(0, 120)}`,
      link: '/complaints'
    });
  }
  io?.to('owners').to(`user-${userId}`).emit('complaint-updated', { complaint: populated });

  return { success: true, complaint: populated, analysis };
}
