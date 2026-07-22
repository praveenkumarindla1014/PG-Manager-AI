/**
 * Function Executor
 * 
 * Executes the function calls returned by OpenAI.
 * Maps function names to actual database operations and business logic.
 */

import Room from '../../models/Room.js';
import User from '../../models/User.js';
import Payment from '../../models/Payment.js';
import Complaint from '../../models/Complaint.js';
import Notice from '../../models/Notice.js';
import Menu from '../../models/Menu.js';
import Visitor from '../../models/Visitor.js';
import Expense from '../../models/Expense.js';
import MaintenanceSchedule from '../../models/MaintenanceSchedule.js';
import DailySummary from '../../models/DailySummary.js';
import KnowledgeBase from '../../models/KnowledgeBase.js';
import { analyzeComplaint, detectDuplicateComplaint } from './complaintAnalyzer.js';
import { generateProfessionalNotice } from './noticeGenerator.js';
import { analyzeMenuNutrition, getAIFoodRecommendation } from './nutritionAnalyzer.js';
import { predictRentPayments, predictOccupancy, predictMaintenance, predictExpenses } from './predictionEngine.js';
import { generateDailySummary, generateInsights, generateSmartTodo } from './insightsGenerator.js';
import { matchRoom, matchRoommate } from './matchingEngine.js';
import { generateProfessionalEmail } from './emailGenerator.js';
import { generateProfessionalWhatsApp } from './whatsappGenerator.js';
import { getRevenueOptimizationSuggestions } from './revenueOptimizer.js';
import { searchKB } from './ragService.js';
import { convertToQuery } from './smartSearch.js';

/**
 * Execute a function call by name with given arguments
 */
export async function executeFunction(functionName, args, context = {}) {
  const { userId, userRole, io } = context;
  
  try {
    switch (functionName) {
      // ============ ROOM FUNCTIONS ============
      case 'search_rooms': {
        const query = { status: { $in: ['available', 'partially-occupied'] } };
        if (args.maxRent) query.rent = { ...query.rent, $lte: args.maxRent };
        if (args.minRent) query.rent = { ...query.rent, $gte: args.minRent };
        if (args.type) query.type = args.type;
        if (args.floor) query.floor = args.floor;
        if (args.hasAC !== undefined) query.hasAC = args.hasAC;
        if (args.hasParking !== undefined) query.hasParking = args.hasParking;
        if (args.hasAttachedBathroom !== undefined) query.hasAttachedBathroom = args.hasAttachedBathroom;
        if (args.hasWifi !== undefined) query.hasWifi = args.hasWifi;
        if (args.genderPreference) query.genderPreference = { $in: [args.genderPreference, 'any'] };
        if (args.furnishing) query.furnishing = args.furnishing;
        if (args.status) query.status = args.status;
        
        const rooms = await Room.find(query).populate('currentOccupants', 'name gender').lean();
        return { 
          success: true, 
          data: rooms, 
          message: `Found ${rooms.length} room(s) matching your criteria`,
          count: rooms.length 
        };
      }
      
      case 'get_empty_rooms': {
        const query = { status: 'available' };
        if (args.floor) query.floor = args.floor;
        const rooms = await Room.find(query).lean();
        return { 
          success: true, 
          data: rooms, 
          message: `${rooms.length} room(s) are completely empty`,
          count: rooms.length 
        };
      }
      
      case 'get_room_details': {
        const room = await Room.findOne({ roomNumber: args.roomNumber })
          .populate('currentOccupants', 'name phone email gender')
          .lean();
        if (!room) return { success: false, message: `Room ${args.roomNumber} not found` };
        return { success: true, data: room };
      }
      
      case 'get_auto_room_match': {
        const result = await matchRoom(args);
        return { success: true, data: result };
      }
      
      // ============ PAYMENT FUNCTIONS ============
      case 'get_income_report': {
        const now = new Date();
        let dateFilter = {};
        
        if (args.period === 'today') {
          const startOfDay = new Date(now.setHours(0, 0, 0, 0));
          dateFilter = { paidDate: { $gte: startOfDay } };
        } else if (args.period === 'this-week') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          dateFilter = { paidDate: { $gte: startOfWeek } };
        } else if (args.period === 'this-month' || (!args.month && !args.period)) {
          dateFilter = { month: now.getMonth() + 1, year: now.getFullYear() };
        } else if (args.period === 'last-month') {
          const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
          const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          dateFilter = { month: lastMonth, year: lastMonthYear };
        } else {
          dateFilter = { month: args.month || (now.getMonth() + 1), year: args.year || now.getFullYear() };
        }
        
        const payments = await Payment.find({ ...dateFilter, status: 'paid' });
        const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
        const pendingPayments = await Payment.find({ ...dateFilter, status: { $in: ['pending', 'overdue'] } });
        const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
        
        return {
          success: true,
          data: {
            totalIncome,
            paymentsReceived: payments.length,
            pendingAmount,
            pendingCount: pendingPayments.length
          },
          message: `Total income: ₹${totalIncome.toLocaleString('en-IN')}. ${pendingPayments.length} payments pending (₹${pendingAmount.toLocaleString('en-IN')}).`
        };
      }
      
      case 'get_unpaid_tenants': {
        const now = new Date();
        const month = args.month || (now.getMonth() + 1);
        const year = args.year || now.getFullYear();
        
        const unpaid = await Payment.find({
          month, year,
          status: { $in: ['pending', 'overdue'] }
        }).populate('tenant', 'name phone email roomId').populate('room', 'roomNumber');
        
        return {
          success: true,
          data: unpaid,
          message: `${unpaid.length} tenant(s) have not paid rent for ${month}/${year}`,
          count: unpaid.length
        };
      }
      
      case 'get_rent_status': {
        const tenantId = args.tenantId || userId;
        const now = new Date();
        
        const payments = await Payment.find({
          tenant: tenantId,
          year: now.getFullYear()
        }).sort({ month: -1, year: -1 }).populate('room', 'roomNumber rent');
        
        const currentMonthPayment = payments.find(p => p.month === now.getMonth() + 1);
        
        return {
          success: true,
          data: {
            currentMonth: currentMonthPayment || { status: 'no-record', message: 'No payment record for this month' },
            recentPayments: payments.slice(0, 6)
          }
        };
      }
      
      case 'process_payment': {
        const tenantId = args.tenantId || userId;
        const tenant = await User.findById(tenantId).populate('roomId');
        if (!tenant || !tenant.roomId) {
          return { success: false, message: 'Tenant or room not found' };
        }
        
        const now = new Date();
        const payment = await Payment.create({
          tenant: tenantId,
          room: tenant.roomId._id,
          amount: args.amount,
          dueDate: new Date(now.getFullYear(), now.getMonth(), 5), // Due on 5th
          paidDate: new Date(),
          status: 'paid',
          method: args.method,
          month: now.getMonth() + 1,
          year: now.getFullYear()
        });
        
        return {
          success: true,
          data: payment,
          message: `Payment of ₹${args.amount.toLocaleString('en-IN')} recorded successfully via ${args.method}`
        };
      }
      
      case 'get_rent_prediction': {
        const predictions = await predictRentPayments();
        return { success: true, data: predictions };
      }
      
      // ============ COMPLAINT FUNCTIONS ============
      case 'create_complaint': {
        const tenant = await User.findById(userId);
        const roomId = tenant?.roomId;
        let room;
        
        if (args.roomNumber) {
          room = await Room.findOne({ roomNumber: args.roomNumber });
        } else if (roomId) {
          room = await Room.findById(roomId);
        }
        
        if (!room) {
          return { success: false, message: 'Room not found. Please specify room number.' };
        }
        
        // AI Analysis
        const analysis = await analyzeComplaint(args.description);
        
        // Check for duplicate
        const duplicateCheck = await detectDuplicateComplaint(args.description, room._id);
        
        const complaintData = {
          tenant: userId,
          room: room._id,
          description: args.description,
          aiCategory: analysis.category,
          aiPriority: analysis.priority,
          aiEstimatedTime: analysis.estimatedTime,
          aiSuggestedStaff: analysis.suggestedStaff,
          aiGeneratedReply: analysis.generatedReply,
          aiSentiment: analysis.sentiment,
          sentimentEmoji: analysis.emoji,
          urgencyScore: analysis.urgencyScore,
          isEmergency: analysis.isEmergency,
          emergencyType: analysis.emergencyType
        };
        
        if (duplicateCheck.isDuplicate) {
          complaintData.isDuplicate = true;
          complaintData.masterComplaintId = duplicateCheck.masterComplaintId;
          
          // Update master complaint count
          await Complaint.findByIdAndUpdate(duplicateCheck.masterComplaintId, {
            $inc: { duplicateCount: 1 },
            $push: { linkedComplaints: complaintData._id }
          });
        }
        
        const complaint = await Complaint.create(complaintData);
        
        // Emergency notification
        if (analysis.isEmergency && io) {
          io.emit('emergency', {
            type: analysis.emergencyType,
            complaint: complaint,
            message: `🚨 EMERGENCY: ${analysis.emergencyType?.toUpperCase()} reported in Room ${room.roomNumber}!`
          });
        }
        
        return {
          success: true,
          data: {
            complaint,
            analysis,
            isDuplicate: duplicateCheck.isDuplicate
          },
          message: `Complaint registered successfully. Category: ${analysis.category}, Priority: ${analysis.priority}, Estimated resolution: ${analysis.estimatedTime}`
        };
      }
      
      case 'get_pending_complaints': {
        const query = {};
        if (args.status) query.status = args.status;
        else query.status = { $in: ['open', 'in-progress'] };
        if (args.category) query.aiCategory = args.category;
        
        let complaints = await Complaint.find(query)
          .populate('tenant', 'name phone')
          .populate('room', 'roomNumber floor')
          .sort({ urgencyScore: -1, createdAt: -1 })
          .lean();
        
        if (args.floor) {
          complaints = complaints.filter(c => c.room?.floor === args.floor);
        }
        
        return {
          success: true,
          data: complaints,
          message: `${complaints.length} pending complaint(s)`,
          count: complaints.length
        };
      }
      
      case 'get_complaints_by_tenant': {
        const tenantId = args.tenantId || userId;
        const complaints = await Complaint.find({ tenant: tenantId })
          .populate('room', 'roomNumber')
          .sort({ createdAt: -1 });
        return { success: true, data: complaints, count: complaints.length };
      }
      
      // ============ VISITOR FUNCTIONS ============
      case 'get_today_visitors': {
        const date = args.date ? new Date(args.date) : new Date();
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        
        const visitors = await Visitor.find({
          checkIn: { $gte: startOfDay, $lte: endOfDay }
        }).populate('tenantVisiting', 'name roomId').sort({ checkIn: -1 });
        
        return {
          success: true,
          data: visitors,
          message: `${visitors.length} visitor(s) today`,
          count: visitors.length
        };
      }
      
      // ============ NOTICE FUNCTIONS ============
      case 'generate_notice': {
        const notice = await generateProfessionalNotice(
          args.rawInput,
          args.priority || 'medium',
          args.category || 'general',
          userId
        );
        return { success: true, data: notice, message: 'Professional notice generated and saved with translations' };
      }
      
      case 'get_notices': {
        const query = { isActive: true };
        if (args.category) query.category = args.category;
        
        const notices = await Notice.find(query)
          .sort({ createdAt: -1 })
          .limit(args.limit || 10)
          .populate('createdBy', 'name');
        
        return { success: true, data: notices, count: notices.length };
      }
      
      // ============ MENU FUNCTIONS ============
      case 'get_menu': {
        const date = args.date ? new Date(args.date) : new Date();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        let menu = await Menu.findOne({ date: { $gte: startOfDay, $lte: endOfDay } });
        
        if (!menu) {
          return { success: false, message: 'No menu found for this date' };
        }
        
        if (args.meal) {
          return { success: true, data: { [args.meal]: menu[args.meal], totalNutrition: menu.totalNutrition } };
        }
        
        return { success: true, data: menu };
      }
      
      case 'get_food_recommendation': {
        const recommendation = await getAIFoodRecommendation(args.dietaryNeed, args.restrictions);
        return { success: true, data: recommendation };
      }
      
      // ============ MAINTENANCE FUNCTIONS ============
      case 'schedule_maintenance': {
        let room;
        if (args.roomNumber) {
          room = await Room.findOne({ roomNumber: args.roomNumber });
        }
        
        const schedule = await MaintenanceSchedule.create({
          type: args.type,
          description: args.description,
          scheduledDate: new Date(args.scheduledDate),
          room: room?._id,
          roomNumber: args.roomNumber,
          assignedTo: args.assignedTo,
          createdViaAI: true,
          createdBy: userId,
          priority: args.type === 'pest-control' ? 'medium' : 'medium'
        });
        
        // Notify via socket
        if (io) {
          io.emit('maintenance-scheduled', {
            message: `🔧 ${args.type} scheduled for ${args.scheduledDate}`,
            data: schedule
          });
        }
        
        return {
          success: true,
          data: schedule,
          message: `${args.type} scheduled for ${args.scheduledDate}. ${args.assignedTo ? `Assigned to ${args.assignedTo}.` : ''}`
        };
      }
      
      case 'get_maintenance_predictions': {
        const predictions = await predictMaintenance(args.type);
        return { success: true, data: predictions };
      }
      
      // ============ REPORT FUNCTIONS ============
      case 'generate_monthly_report': {
        const now = new Date();
        const month = args.month || (now.getMonth() + 1);
        const year = args.year || now.getFullYear();
        
        // Gather all data
        const payments = await Payment.find({ month, year });
        const expenses = await Expense.find({ month, year });
        const complaints = await Complaint.find({
          createdAt: {
            $gte: new Date(year, month - 1, 1),
            $lte: new Date(year, month, 0)
          }
        });
        const rooms = await Room.find();
        
        const totalIncome = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
        const occupiedRooms = rooms.filter(r => r.status !== 'available').length;
        const latePayments = payments.filter(p => p.daysLate > 0);
        
        return {
          success: true,
          data: {
            month, year,
            income: totalIncome,
            expenses: totalExpenses,
            profit: totalIncome - totalExpenses,
            occupancyRate: rooms.length > 0 ? ((occupiedRooms / rooms.length) * 100).toFixed(1) : 0,
            totalComplaints: complaints.length,
            resolvedComplaints: complaints.filter(c => c.status === 'resolved').length,
            latePayments: latePayments.length,
            latePaymentAmount: latePayments.reduce((s, p) => s + p.amount, 0)
          },
          message: `Monthly report for ${month}/${year} generated`
        };
      }
      
      case 'get_daily_summary': {
        const summary = await generateDailySummary(args.date);
        return { success: true, data: summary };
      }
      
      case 'get_business_insights': {
        const insights = await generateInsights();
        return { success: true, data: insights };
      }
      
      // ============ TENANT INFO FUNCTIONS ============
      case 'get_roommate_info': {
        const tenantId = args.tenantId || userId;
        const tenant = await User.findById(tenantId).populate('roomId');
        
        if (!tenant?.roomId) {
          return { success: false, message: 'Tenant has no assigned room' };
        }
        
        const room = await Room.findById(tenant.roomId).populate('currentOccupants', 'name phone email gender age preferences');
        const roommates = room.currentOccupants.filter(o => o._id.toString() !== tenantId);
        
        return {
          success: true,
          data: { roommates, roomNumber: room.roomNumber },
          message: roommates.length > 0 
            ? `You have ${roommates.length} roommate(s) in Room ${room.roomNumber}` 
            : 'You have no roommates currently'
        };
      }
      
      case 'get_facilities': {
        const rooms = await Room.find();
        const facilities = {
          totalRooms: rooms.length,
          acRooms: rooms.filter(r => r.hasAC).length,
          parkingSlots: rooms.filter(r => r.hasParking).length,
          wifiAvailable: rooms.some(r => r.hasWifi),
          attachedBathrooms: rooms.filter(r => r.hasAttachedBathroom).length,
          tvRooms: rooms.filter(r => r.hasTv).length,
          geyserRooms: rooms.filter(r => r.hasGeyser).length,
          furnishedRooms: rooms.filter(r => r.furnishing === 'fully-furnished').length
        };
        
        return { success: true, data: facilities };
      }
      
      case 'get_roommate_match': {
        const result = await matchRoommate(args);
        return { success: true, data: result };
      }
      
      // ============ SMART SEARCH ============
      case 'smart_search': {
        const result = await convertToQuery(args.query, args.entityType);
        return { success: true, data: result };
      }
      
      // ============ COMMUNICATION ============
      case 'generate_email': {
        const email = await generateProfessionalEmail(args.type, args.recipientName, args.context);
        return { success: true, data: email };
      }
      
      case 'generate_whatsapp_message': {
        const message = await generateProfessionalWhatsApp(args.purpose, args.recipientName, args.context);
        return { success: true, data: message };
      }
      
      // ============ EXPENSES ============
      case 'get_expense_summary': {
        const now = new Date();
        const month = args.month || (now.getMonth() + 1);
        const year = args.year || now.getFullYear();
        
        const query = { month, year };
        if (args.category) query.category = args.category;
        
        const expenses = await Expense.find(query).sort({ date: -1 });
        
        // Group by category
        const byCategory = {};
        expenses.forEach(e => {
          byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
        });
        
        const total = expenses.reduce((s, e) => s + e.amount, 0);
        
        return {
          success: true,
          data: { expenses, byCategory, total },
          message: `Total expenses for ${month}/${year}: ₹${total.toLocaleString('en-IN')}`
        };
      }
      
      case 'get_expense_prediction': {
        const predictions = await predictExpenses();
        return { success: true, data: predictions };
      }
      
      // ============ KNOWLEDGE BASE (RAG) ============
      case 'search_knowledge_base': {
        const result = await searchKB(args.query, args.category);
        return { success: true, data: result };
      }
      
      // ============ VIOLATION & RISK ============
      case 'get_risky_tenants': {
        const tenants = await User.find({
          role: 'tenant',
          isActive: true,
          violationScore: { $gt: 0 }
        }).select('name phone roomId violationScore violations paymentBehavior')
          .populate('roomId', 'roomNumber')
          .sort({ violationScore: -1 });
        
        return {
          success: true,
          data: tenants,
          message: `${tenants.length} tenant(s) with violations`
        };
      }
      
      // ============ PREDICTIONS ============
      case 'get_occupancy_prediction': {
        const prediction = await predictOccupancy(args.period);
        return { success: true, data: prediction };
      }
      
      case 'get_revenue_optimization': {
        const suggestions = await getRevenueOptimizationSuggestions();
        return { success: true, data: suggestions };
      }
      
      case 'get_smart_todo_list': {
        const todos = await generateSmartTodo();
        return { success: true, data: todos };
      }
      
      default:
        return { success: false, message: `Unknown function: ${functionName}` };
    }
  } catch (error) {
    console.error(`Error executing function ${functionName}:`, error);
    return { success: false, message: `Error: ${error.message}` };
  }
}
