/**
 * Database Seed Script
 * Populates the PG Management System with realistic sample data.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Room from './models/Room.js';
import Payment from './models/Payment.js';
import Complaint from './models/Complaint.js';
import Notice from './models/Notice.js';
import Menu from './models/Menu.js';
import Visitor from './models/Visitor.js';
import Expense from './models/Expense.js';
import MaintenanceSchedule from './models/MaintenanceSchedule.js';
import KnowledgeBase from './models/KnowledgeBase.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    await Promise.all([
      User.deleteMany({}), Room.deleteMany({}), Payment.deleteMany({}),
      Complaint.deleteMany({}), Notice.deleteMany({}), Menu.deleteMany({}),
      Visitor.deleteMany({}), Expense.deleteMany({}), MaintenanceSchedule.deleteMany({}),
      KnowledgeBase.deleteMany({})
    ]);
    console.log('🗑️ Cleared existing data');
    
    // Create Owner
    const owner = await User.create({
      name: 'Rajesh Kumar',
      email: 'owner@smartpg.com',
      password: 'owner123',
      phone: '9876543210',
      role: 'owner',
      gender: 'male',
      age: 45
    });
    console.log('👑 Owner created');
    
    // Create Rooms (3 floors, 5 rooms each)
    const roomsData = [];
    for (let floor = 1; floor <= 3; floor++) {
      for (let room = 1; room <= 5; room++) {
        const roomNum = `${floor}0${room}`;
        const types = ['single', 'double', 'double', 'triple', 'single'];
        const maxOcc = { single: 1, double: 2, triple: 3, dormitory: 6 };
        const type = types[room - 1];
        
        roomsData.push({
          roomNumber: roomNum,
          floor,
          type,
          rent: type === 'single' ? 8000 : type === 'double' ? 6000 : 4500,
          deposit: type === 'single' ? 8000 : type === 'double' ? 6000 : 4500,
          hasAC: floor >= 2 && room <= 3,
          hasAttachedBathroom: room <= 2,
          hasBalcony: room === 5,
          hasParking: floor === 1,
          hasWifi: true,
          hasTv: room === 1,
          hasGeyser: room <= 3,
          hasCupboard: true,
          furnishing: room <= 2 ? 'fully-furnished' : 'semi-furnished',
          maxOccupants: maxOcc[type],
          genderPreference: floor <= 2 ? 'male' : 'female',
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} sharing room on floor ${floor}`
        });
      }
    }
    
    const rooms = await Room.insertMany(roomsData);
    console.log(`🏠 ${rooms.length} rooms created`);
    
    // Create Tenants
    const tenantNames = [
      { name: 'Priya Sharma', email: 'priya@test.com', gender: 'female', age: 22, occupation: 'student' },
      { name: 'Amit Patel', email: 'amit@test.com', gender: 'male', age: 25, occupation: 'working-professional' },
      { name: 'Sneha Reddy', email: 'sneha@test.com', gender: 'female', age: 23, occupation: 'student' },
      { name: 'Vikram Singh', email: 'vikram@test.com', gender: 'male', age: 28, occupation: 'working-professional' },
      { name: 'Kavitha Nair', email: 'kavitha@test.com', gender: 'female', age: 24, occupation: 'working-professional' },
      { name: 'Rahul Gupta', email: 'rahul@test.com', gender: 'male', age: 21, occupation: 'student' },
      { name: 'Divya Krishnan', email: 'divya@test.com', gender: 'female', age: 26, occupation: 'working-professional' },
      { name: 'Arjun Mehta', email: 'arjun@test.com', gender: 'male', age: 23, occupation: 'student' },
      { name: 'Lakshmi Iyer', email: 'lakshmi@test.com', gender: 'female', age: 27, occupation: 'working-professional' },
      { name: 'Suresh Babu', email: 'suresh@test.com', gender: 'male', age: 30, occupation: 'working-professional' },
      { name: 'Meera Joshi', email: 'meera@test.com', gender: 'female', age: 22, occupation: 'student' },
      { name: 'Karthik Rao', email: 'karthik@test.com', gender: 'male', age: 24, occupation: 'student' }
    ];
    
    const tenants = [];
    const usedRooms = new Set();
    
    for (let i = 0; i < tenantNames.length; i++) {
      const t = tenantNames[i];
      const roomIndex = i % rooms.length;
      const room = rooms[roomIndex];
      
      const tenant = await User.create({
        name: t.name,
        email: t.email,
        password: 'tenant123',
        phone: `98765${(43210 + i).toString().padStart(5, '0')}`,
        role: 'tenant',
        gender: t.gender,
        age: t.age,
        roomId: room._id,
        moveInDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        isActive: true,
        preferences: {
          budget: { min: 4000, max: 10000 },
          foodPreference: ['veg', 'non-veg', 'any'][Math.floor(Math.random() * 3)],
          acPreference: Math.random() > 0.5,
          smokingPreference: ['non-smoker', 'non-smoker', 'smoker'][Math.floor(Math.random() * 3)],
          studyPreference: ['quiet', 'moderate', 'no-preference'][Math.floor(Math.random() * 3)],
          noisePreference: ['silent', 'moderate', 'no-preference'][Math.floor(Math.random() * 3)],
          occupation: t.occupation,
          sleepTiming: ['early-sleeper', 'night-owl', 'flexible'][Math.floor(Math.random() * 3)],
          language: ['English', 'Hindi', 'Telugu'][Math.floor(Math.random() * 3)],
          cleanlinessLevel: Math.floor(Math.random() * 5) + 1,
          interests: [['reading', 'coding'], ['gaming', 'music'], ['sports', 'movies'], ['cooking', 'yoga']][Math.floor(Math.random() * 4)]
        },
        paymentBehavior: {
          averageDaysLate: Math.floor(Math.random() * 10),
          latePaymentCount: Math.floor(Math.random() * 4),
          earlyPaymentCount: Math.floor(Math.random() * 6),
          onTimePaymentCount: Math.floor(Math.random() * 8),
          lateProbability: Math.floor(Math.random() * 50)
        }
      });
      
      tenants.push(tenant);
      
      // Add tenant to room
      if (!usedRooms.has(room._id.toString()) || room.currentOccupants.length < room.maxOccupants) {
        await Room.findByIdAndUpdate(room._id, {
          $push: { currentOccupants: tenant._id }
        });
        usedRooms.add(room._id.toString());
      }
    }
    console.log(`👤 ${tenants.length} tenants created`);
    
    // Create Payments (last 3 months)
    const now = new Date();
    const paymentsData = [];
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const month = now.getMonth() + 1 - monthOffset;
      const year = now.getFullYear();
      
      for (const tenant of tenants) {
        const room = rooms.find(r => r._id.toString() === tenant.roomId?.toString());
        if (!room) continue;
        
        const dueDate = new Date(year, month - 1, 5);
        const daysLate = Math.random() > 0.7 ? Math.floor(Math.random() * 15) : 0;
        const paidDate = new Date(dueDate);
        paidDate.setDate(paidDate.getDate() + daysLate);
        
        const isPaid = monthOffset > 0 || Math.random() > 0.3;
        
        paymentsData.push({
          tenant: tenant._id,
          room: room._id,
          amount: room.rent,
          dueDate,
          paidDate: isPaid ? paidDate : null,
          status: isPaid ? 'paid' : (new Date() > dueDate ? 'overdue' : 'pending'),
          method: ['cash', 'upi', 'bank-transfer'][Math.floor(Math.random() * 3)],
          daysLate: isPaid ? daysLate : 0,
          month: month > 0 ? month : month + 12,
          year: month > 0 ? year : year - 1
        });
      }
    }
    await Payment.insertMany(paymentsData);
    console.log(`💰 ${paymentsData.length} payments created`);
    
    // Create Complaints
    const complaintTexts = [
      { desc: 'My fan stopped working since morning', cat: 'electrical', pri: 'medium', sent: 'angry', emoji: '😠', score: 6 },
      { desc: 'WiFi is very slow, cannot attend online classes', cat: 'wifi-internet', pri: 'high', sent: 'angry', emoji: '😠', score: 7 },
      { desc: 'Water leaking from bathroom tap', cat: 'plumbing', pri: 'medium', sent: 'neutral', emoji: '😐', score: 5 },
      { desc: 'AC not cooling properly', cat: 'ac-cooling', pri: 'medium', sent: 'neutral', emoji: '😐', score: 5 },
      { desc: 'Cockroaches in kitchen area', cat: 'pest-control', pri: 'high', sent: 'angry', emoji: '😠', score: 7 },
      { desc: 'Room needs cleaning, dusty surfaces', cat: 'cleaning', pri: 'low', sent: 'neutral', emoji: '😐', score: 3 },
      { desc: 'Cupboard door is broken', cat: 'furniture', pri: 'low', sent: 'neutral', emoji: '😐', score: 3 },
      { desc: 'No hot water in geyser', cat: 'electrical', pri: 'medium', sent: 'angry', emoji: '😠', score: 6 },
      { desc: 'Noise from construction nearby', cat: 'noise', pri: 'low', sent: 'neutral', emoji: '😐', score: 4 },
      { desc: 'Food quality has decreased lately', cat: 'food', pri: 'medium', sent: 'angry', emoji: '😠', score: 5 }
    ];
    
    const complaints = [];
    for (let i = 0; i < complaintTexts.length; i++) {
      const c = complaintTexts[i];
      const tenant = tenants[i % tenants.length];
      const room = rooms.find(r => r._id.toString() === tenant.roomId?.toString());
      
      complaints.push({
        tenant: tenant._id,
        room: room?._id || rooms[0]._id,
        description: c.desc,
        aiCategory: c.cat,
        aiPriority: c.pri,
        aiEstimatedTime: ['2 Hours', '4 Hours', '1 Day', '2 Days'][Math.floor(Math.random() * 4)],
        aiSuggestedStaff: ['Electrician', 'Plumber', 'Cleaner', 'AC Technician'][Math.floor(Math.random() * 4)],
        aiGeneratedReply: `Thank you for reporting this issue. We have categorized it as ${c.cat} and our team will address it promptly.`,
        aiSentiment: c.sent,
        sentimentEmoji: c.emoji,
        urgencyScore: c.score,
        status: ['open', 'open', 'in-progress', 'resolved'][Math.floor(Math.random() * 4)]
      });
    }
    await Complaint.insertMany(complaints);
    console.log(`📋 ${complaints.length} complaints created`);
    
    // Create Today's Menu
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Menu.create({
      date: today,
      dayOfWeek: today.toLocaleDateString('en', { weekday: 'long' }).toLowerCase(),
      breakfast: {
        items: [
          { name: 'Idli Sambar', isVeg: true, nutrition: { calories: 250, protein: 8, carbs: 45, fat: 5, fiber: 3 } },
          { name: 'Poha', isVeg: true, nutrition: { calories: 180, protein: 4, carbs: 35, fat: 3, fiber: 2 } },
          { name: 'Tea/Coffee', isVeg: true, nutrition: { calories: 50, protein: 1, carbs: 8, fat: 2, fiber: 0 } }
        ],
        timing: '7:30 AM - 9:30 AM'
      },
      lunch: {
        items: [
          { name: 'Rice', isVeg: true, nutrition: { calories: 200, protein: 4, carbs: 45, fat: 0.5, fiber: 1 } },
          { name: 'Dal Tadka', isVeg: true, nutrition: { calories: 150, protein: 10, carbs: 20, fat: 5, fiber: 4 } },
          { name: 'Aloo Gobi', isVeg: true, nutrition: { calories: 120, protein: 3, carbs: 18, fat: 5, fiber: 3 } },
          { name: 'Roti (2)', isVeg: true, nutrition: { calories: 160, protein: 5, carbs: 30, fat: 3, fiber: 2 } },
          { name: 'Curd', isVeg: true, nutrition: { calories: 60, protein: 4, carbs: 5, fat: 3, fiber: 0 } }
        ],
        timing: '12:30 PM - 2:30 PM'
      },
      snacks: {
        items: [
          { name: 'Samosa (2)', isVeg: true, nutrition: { calories: 250, protein: 4, carbs: 30, fat: 14, fiber: 2 } },
          { name: 'Chai', isVeg: true, nutrition: { calories: 50, protein: 1, carbs: 8, fat: 2, fiber: 0 } }
        ],
        timing: '4:30 PM - 5:30 PM'
      },
      dinner: {
        items: [
          { name: 'Paneer Butter Masala', isVeg: true, nutrition: { calories: 300, protein: 15, carbs: 12, fat: 22, fiber: 2 } },
          { name: 'Naan (2)', isVeg: true, nutrition: { calories: 260, protein: 8, carbs: 45, fat: 5, fiber: 2 } },
          { name: 'Salad', isVeg: true, nutrition: { calories: 40, protein: 1, carbs: 8, fat: 0.5, fiber: 3 } }
        ],
        timing: '7:30 PM - 9:30 PM'
      },
      totalNutrition: { calories: 2070, protein: 68, carbs: 309, fat: 70 },
      createdBy: owner._id
    });
    console.log('🍽️ Menu created');
    
    // Create Notices
    await Notice.insertMany([
      {
        title: 'Water Supply Maintenance',
        content: 'Dear residents, there will be a scheduled water supply maintenance on Sunday from 10 AM to 2 PM. Please store sufficient water for your needs. We apologize for the inconvenience.',
        originalInput: 'Water problem sunday 10 to 2',
        aiGenerated: true,
        translations: {
          en: 'Dear residents, there will be a scheduled water supply maintenance on Sunday from 10 AM to 2 PM.',
          hi: 'प्रिय निवासियों, रविवार को सुबह 10 बजे से दोपहर 2 बजे तक पानी की आपूर्ति का रखरखाव होगा।',
          te: 'ప్రియ నివాసితులారా, ఆదివారం ఉదయం 10 నుండి మధ్యాహ్నం 2 వరకు నీటి సరఫరా నిర్వహణ ఉంటుంది.'
        },
        priority: 'high',
        category: 'maintenance',
        createdBy: owner._id
      },
      {
        title: 'Monthly Rent Reminder',
        content: 'This is a friendly reminder that monthly rent is due by the 5th of each month. Late payments will incur a penalty of ₹500. Please pay on time.',
        aiGenerated: true,
        translations: { en: 'Monthly rent is due by the 5th. Late penalty: ₹500.' },
        priority: 'medium',
        category: 'payment',
        createdBy: owner._id
      }
    ]);
    console.log('📢 Notices created');
    
    // Create Expenses
    const expenseCategories = ['food', 'electricity', 'water', 'gas', 'maintenance', 'salary', 'internet', 'cleaning'];
    const expensesData = [];
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const month = now.getMonth() + 1 - monthOffset;
      const year = now.getFullYear();
      
      for (const cat of expenseCategories) {
        const amounts = {
          food: 25000 + Math.floor(Math.random() * 5000),
          electricity: 15000 + Math.floor(Math.random() * 3000),
          water: 3000 + Math.floor(Math.random() * 1000),
          gas: 4000 + Math.floor(Math.random() * 1000),
          maintenance: 5000 + Math.floor(Math.random() * 5000),
          salary: 20000,
          internet: 3000,
          cleaning: 5000
        };
        
        expensesData.push({
          category: cat,
          amount: amounts[cat],
          date: new Date(year, month - 1, 15),
          description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} expense for ${month}/${year}`,
          month: month > 0 ? month : month + 12,
          year: month > 0 ? year : year - 1,
          isRecurring: true,
          recurringFrequency: 'monthly',
          createdBy: owner._id
        });
      }
    }
    await Expense.insertMany(expensesData);
    console.log(`💸 ${expensesData.length} expenses created`);
    
    // Create Visitors
    await Visitor.insertMany([
      {
        name: 'Ramesh Verma',
        phone: '9988776655',
        purpose: 'Room inquiry for daughter',
        checkIn: new Date(),
        status: 'approved',
        numberOfGuests: 2
      },
      {
        name: 'Sunita Devi',
        phone: '9877665544',
        purpose: 'Meeting son',
        tenantVisiting: tenants[1]._id,
        checkIn: new Date(),
        status: 'approved',
        numberOfGuests: 1
      }
    ]);
    console.log('🚶 Visitors created');
    
    // Create Knowledge Base
    await KnowledgeBase.create({
      documentName: 'PG Rules and Regulations',
      category: 'pg-rules',
      originalContent: `SmartPG Rules and Regulations:

1. TIMING: Main gate closes at 10:30 PM. Late entry requires prior permission from the owner.
2. VISITORS: Visitors allowed between 10 AM to 8 PM only. Overnight stays not permitted.
3. NOISE: Maintain silence after 10 PM. No loud music or parties.
4. CLEANLINESS: Keep rooms clean. Weekly inspection will be done.
5. RENT: Rent is due on the 5th of every month. Late fee of ₹500 per week.
6. DAMAGE: Any damage to property will be charged to the tenant.
7. SMOKING: Smoking is strictly prohibited inside rooms and common areas.
8. ALCOHOL: Consumption of alcohol is not allowed on premises.
9. FOOD: Outside food allowed. Kitchen usage between 6 AM to 10 PM.
10. PARKING: Parking available on first floor. Two-wheeler only. Four-wheeler parking available at extra cost.
11. LAUNDRY: Washing machine available on each floor. Usage between 6 AM to 9 PM.
12. NOTICE PERIOD: One month notice required before vacating.
13. SECURITY DEPOSIT: Refundable within 15 days of vacating, subject to damage assessment.
14. ID PROOF: Valid government ID mandatory for all tenants.
15. ELECTRICITY: Individual meter reading. Bill paid separately.`,
      chunks: [
        { content: 'TIMING: Main gate closes at 10:30 PM. Late entry requires prior permission from the owner.', chunkIndex: 0 },
        { content: 'VISITORS: Visitors allowed between 10 AM to 8 PM only. Overnight stays not permitted.', chunkIndex: 1 },
        { content: 'RENT: Rent is due on the 5th of every month. Late fee of ₹500 per week.', chunkIndex: 2 },
        { content: 'SMOKING: Smoking is strictly prohibited inside rooms and common areas. ALCOHOL: Consumption of alcohol is not allowed on premises.', chunkIndex: 3 },
        { content: 'NOTICE PERIOD: One month notice required before vacating. SECURITY DEPOSIT: Refundable within 15 days of vacating, subject to damage assessment.', chunkIndex: 4 },
        { content: 'PARKING: Parking available on first floor. Two-wheeler only. Four-wheeler parking available at extra cost.', chunkIndex: 5 },
        { content: 'FOOD: Outside food allowed. Kitchen usage between 6 AM to 10 PM. LAUNDRY: Washing machine available on each floor. Usage between 6 AM to 9 PM.', chunkIndex: 6 }
      ],
      uploadedBy: owner._id,
      wordCount: 200
    });
    console.log('📚 Knowledge base created');
    
    console.log('\n🎉 Seed complete! Use these credentials:');
    console.log('  Owner: owner@smartpg.com / owner123');
    console.log('  Tenant: priya@test.com / tenant123');
    console.log('  (or any tenant email with password: tenant123)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
