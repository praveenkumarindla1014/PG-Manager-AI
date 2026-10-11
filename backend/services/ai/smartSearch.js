/**
 * Smart Search (Feature #22)
 * Convert natural language queries to MongoDB queries.
 */

import { getCompletion } from './openaiClient.js';
import User from '../../models/User.js';
import Room from '../../models/Room.js';
import Payment from '../../models/Payment.js';
import Complaint from '../../models/Complaint.js';

// Only plain query operators are allowed — no server-side JavaScript.
const BLOCKED_OPERATORS = new Set(['$where', '$function', '$accumulator', '$expr', '$jsonSchema']);
function sanitizeFilter(value) {
  if (Array.isArray(value)) return value.map(sanitizeFilter);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (BLOCKED_OPERATORS.has(k) || k.includes('password')) continue;
      out[k] = sanitizeFilter(v);
    }
    return out;
  }
  return value;
}

export async function convertToQuery(naturalQuery, entityType = null) {
  try {
    const prompt = `Convert this natural language query into a MongoDB query for a PG management system.

Query: "${naturalQuery}"

Available collections and their key fields:
- users: name, email, phone, role(owner/tenant), gender(male/female), roomId, isActive, violationScore, paymentBehavior.lateProbability, moveInDate, moveOutDate
- rooms: roomNumber, floor, type(single/double/triple), rent, hasAC, hasParking, status(available/occupied/partially-occupied/maintenance), genderPreference, currentOccupants
- payments: tenant(ref), room(ref), amount, dueDate, paidDate, status(pending/paid/overdue), month, year, daysLate
- complaints: tenant(ref), room(ref), description, aiCategory, aiPriority, aiSentiment, status(open/in-progress/resolved), urgencyScore, floor(from room)

Return ONLY valid JSON:
{
  "collection": "which collection to query",
  "filter": {MongoDB filter object},
  "populate": ["fields to populate"],
  "sort": {sort object},
  "explanation": "what this query does in plain English"
}`;

    const result = await getCompletion(prompt, 'You are a MongoDB query builder. Convert natural language to valid MongoDB filter objects. Use proper operators like $gte, $lte, $in, $regex, etc.', {
      temperature: 0.2
    });
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse query');
    
    const queryPlan = JSON.parse(jsonMatch[0]);
    
    // Execute the query
    const collections = { users: User, rooms: Room, payments: Payment, complaints: Complaint };
    const Model = collections[queryPlan.collection];
    
    if (!Model) {
      return { results: [], explanation: 'Could not determine which data to search' };
    }
    
    let query = Model.find(sanitizeFilter(queryPlan.filter || {}));
    if (Model === User) query = query.select('-password -aadhaarImage -selfieImage -aadhaarNumber -extractedAadhaarData');
    
    if (queryPlan.populate) {
      const allowed = { tenant: 'name phone', room: 'roomNumber floor', roomId: 'roomNumber floor rent', currentOccupants: 'name' };
      for (const pop of [].concat(queryPlan.populate)) {
        if (allowed[pop]) query = query.populate(pop, allowed[pop]);
      }
    }
    
    if (queryPlan.sort) {
      query = query.sort(queryPlan.sort);
    }
    
    const results = await query.limit(30).lean();
    
    return {
      results,
      count: results.length,
      collection: queryPlan.collection,
      explanation: queryPlan.explanation
    };
  } catch (error) {
    console.error('Smart search error:', error);
    return { results: [], count: 0, explanation: 'Search failed: ' + error.message };
  }
}
