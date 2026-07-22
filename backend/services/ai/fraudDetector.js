/**
 * Fraud Detector (Feature #19)
 * Detect duplicate tenants, duplicate Aadhaar, multiple accounts, fake payment screenshots.
 */

import { analyzeImage, getCompletion } from './openaiClient.js';
import User from '../../models/User.js';

export async function detectDuplicateTenant(name, phone, aadhaarNumber, email) {
  try {
    const duplicates = [];
    
    // Check duplicate Aadhaar
    if (aadhaarNumber) {
      const aadhaarMatch = await User.findOne({ aadhaarNumber, isActive: true });
      if (aadhaarMatch) {
        duplicates.push({
          type: 'duplicate-aadhaar',
          existingUser: aadhaarMatch.name,
          confidence: 100,
          message: `Aadhaar number already registered to ${aadhaarMatch.name}`
        });
      }
    }
    
    // Check duplicate phone
    if (phone) {
      const phoneMatch = await User.findOne({ phone, isActive: true });
      if (phoneMatch) {
        duplicates.push({
          type: 'duplicate-phone',
          existingUser: phoneMatch.name,
          confidence: 95,
          message: `Phone number already registered to ${phoneMatch.name}`
        });
      }
    }
    
    // Check duplicate email
    if (email) {
      const emailMatch = await User.findOne({ email, isActive: true });
      if (emailMatch) {
        duplicates.push({
          type: 'duplicate-email',
          existingUser: emailMatch.name,
          confidence: 100,
          message: `Email already registered to ${emailMatch.name}`
        });
      }
    }
    
    // Check similar names (fuzzy match)
    if (name) {
      const similarNames = await User.find({
        isActive: true,
        name: { $regex: new RegExp(name.split(' ')[0], 'i') }
      });
      
      if (similarNames.length > 0) {
        duplicates.push({
          type: 'similar-name',
          matches: similarNames.map(u => u.name),
          confidence: 50,
          message: `Similar names found: ${similarNames.map(u => u.name).join(', ')}`
        });
      }
    }
    
    return {
      hasFraud: duplicates.some(d => d.confidence >= 90),
      duplicates,
      riskLevel: duplicates.some(d => d.confidence >= 90) ? 'high' : duplicates.length > 0 ? 'medium' : 'low'
    };
  } catch (error) {
    console.error('Fraud detection error:', error);
    return { hasFraud: false, duplicates: [], riskLevel: 'unknown' };
  }
}

export async function analyzePaymentScreenshot(imageBase64) {
  try {
    const prompt = `Analyze this payment screenshot for potential fraud. Check for:
1. Is this a genuine payment confirmation screen?
2. Are there signs of image manipulation/editing?
3. Is the text consistent and properly rendered?
4. Does the layout match known payment apps (Google Pay, PhonePe, Paytm, etc.)?

Return ONLY valid JSON:
{
  "isGenuine": boolean,
  "confidence": 0-100,
  "detectedApp": "name of payment app",
  "amount": "amount if readable",
  "transactionId": "if visible",
  "date": "if visible",
  "warnings": ["any suspicious elements"],
  "reason": "brief explanation"
}`;

    const result = await analyzeImage(imageBase64, prompt);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { isGenuine: false, confidence: 0 };
  } catch (error) {
    console.error('Payment screenshot analysis error:', error);
    return { isGenuine: false, confidence: 0, error: error.message };
  }
}
