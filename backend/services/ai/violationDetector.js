/**
 * Violation Detector (Feature #15)
 * Monitor tenant behavior and generate warning scores.
 */

import User from '../../models/User.js';
import Payment from '../../models/Payment.js';
import Complaint from '../../models/Complaint.js';

export async function updateViolationScores() {
  try {
    const tenants = await User.find({ role: 'tenant', isActive: true });
    
    for (const tenant of tenants) {
      let score = 0;
      const violations = [];
      
      // Check late payments
      const payments = await Payment.find({ tenant: tenant._id });
      const latePayments = payments.filter(p => p.daysLate > 5);
      if (latePayments.length > 0) {
        score += latePayments.length * 5;
        violations.push({
          type: 'late-payment',
          description: `${latePayments.length} late payment(s)`,
          date: new Date(),
          severity: latePayments.length > 3 ? 'high' : 'medium'
        });
      }
      
      // Check complaint frequency (excessive complaints)
      const complaintCount = await Complaint.countDocuments({
        tenant: tenant._id,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      if (complaintCount > 5) {
        score += 10;
        violations.push({
          type: 'excessive-complaints',
          description: `${complaintCount} complaints in last 30 days`,
          date: new Date(),
          severity: 'medium'
        });
      }
      
      // Check overdue payments
      const overdueCount = payments.filter(p => p.status === 'overdue').length;
      if (overdueCount > 0) {
        score += overdueCount * 10;
        violations.push({
          type: 'overdue-payment',
          description: `${overdueCount} overdue payment(s)`,
          date: new Date(),
          severity: 'high'
        });
      }
      
      // Update tenant
      await User.findByIdAndUpdate(tenant._id, {
        violationScore: Math.min(100, score),
        $push: { violations: { $each: violations, $slice: -20 } }
      });
    }
    
    return { success: true, message: 'Violation scores updated' };
  } catch (error) {
    console.error('Violation detection error:', error);
    return { success: false, error: error.message };
  }
}
