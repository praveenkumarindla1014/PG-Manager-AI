/**
 * Matching Engine (Features #13, #14)
 * - Auto room matching
 * - Roommate compatibility matching
 */

import Room from '../../models/Room.js';
import User from '../../models/User.js';

/**
 * Match best room for a tenant (Feature #13)
 */
export async function matchRoom(preferences) {
  try {
    const query = { status: { $in: ['available', 'partially-occupied'] } };
    
    if (preferences.acPreference) query.hasAC = true;
    if (preferences.gender) query.genderPreference = { $in: [preferences.gender, 'any'] };
    if (preferences.parkingNeeded) query.hasParking = true;
    
    let rooms = await Room.find(query).populate('currentOccupants', 'name gender preferences').lean();
    
    // Score each room
    const scored = rooms.map(room => {
      let score = 0;
      const reasons = [];
      
      // Budget fit (max 30 points)
      if (preferences.budget) {
        if (room.rent <= preferences.budget) {
          const budgetFit = 1 - (room.rent / preferences.budget);
          score += Math.round(budgetFit * 20) + 10;
          reasons.push(`Within budget (₹${room.rent} vs ₹${preferences.budget} max)`);
        } else {
          score -= 20;
          reasons.push(`Over budget by ₹${room.rent - preferences.budget}`);
        }
      }
      
      // AC match (10 points)
      if (preferences.acPreference && room.hasAC) {
        score += 10;
        reasons.push('Has AC ✓');
      }
      
      // Parking (5 points)
      if (preferences.parkingNeeded && room.hasParking) {
        score += 5;
        reasons.push('Has parking ✓');
      }
      
      // Occupancy preference based on occupation
      if (preferences.occupation === 'student' && room.type === 'double') {
        score += 5;
        reasons.push('Double sharing (good for students)');
      }
      if (preferences.occupation === 'working-professional' && room.type === 'single') {
        score += 5;
        reasons.push('Single room (ideal for professionals)');
      }
      
      // Noise preference
      if (preferences.noisePreference === 'silent') {
        const highFloor = room.floor >= 3;
        if (highFloor) {
          score += 5;
          reasons.push('Higher floor (quieter)');
        }
      }
      
      // Vacancy bonus
      if (room.status === 'available') {
        score += 3;
        reasons.push('Fully vacant');
      }
      
      // Roommate gender compatibility
      if (room.currentOccupants?.length > 0 && preferences.gender) {
        const sameGender = room.currentOccupants.every(o => o.gender === preferences.gender);
        if (sameGender) {
          score += 5;
          reasons.push('Same gender occupants');
        }
      }
      
      return { room, score, reasons };
    });
    
    // Sort by score
    scored.sort((a, b) => b.score - a.score);
    
    return {
      recommendations: scored.slice(0, 5).map(s => ({
        roomNumber: s.room.roomNumber,
        floor: s.room.floor,
        type: s.room.type,
        rent: s.room.rent,
        hasAC: s.room.hasAC,
        hasParking: s.room.hasParking,
        furnishing: s.room.furnishing,
        vacancies: s.room.maxOccupants - (s.room.currentOccupants?.length || 0),
        matchScore: Math.max(0, Math.min(100, s.score + 50)),
        matchReasons: s.reasons
      })),
      totalMatches: scored.filter(s => s.score > 0).length
    };
  } catch (error) {
    console.error('Room matching error:', error);
    return { recommendations: [], totalMatches: 0 };
  }
}

/**
 * Match compatible roommates (Feature #14)
 */
export async function matchRoommate(preferences) {
  try {
    const tenantId = preferences.tenantId;
    
    // Find all active tenants
    const tenants = await User.find({
      role: 'tenant',
      isActive: true,
      _id: { $ne: tenantId }
    }).populate('roomId', 'roomNumber type maxOccupants currentOccupants');
    
    // Score compatibility
    const scored = tenants.map(tenant => {
      let score = 0;
      const reasons = [];
      
      // Sleep timing (20 points)
      if (preferences.sleepTiming && tenant.preferences?.sleepTiming === preferences.sleepTiming) {
        score += 20;
        reasons.push(`Same sleep schedule (${preferences.sleepTiming})`);
      }
      
      // Smoking (20 points)
      if (preferences.smokingPreference && tenant.preferences?.smokingPreference === preferences.smokingPreference) {
        score += 20;
        reasons.push('Same smoking preference');
      } else if (
        preferences.smokingPreference === 'non-smoker' && 
        tenant.preferences?.smokingPreference === 'smoker'
      ) {
        score -= 20;
        reasons.push('⚠️ Smoking conflict');
      }
      
      // Cleanliness (15 points)
      if (preferences.cleanlinessLevel && tenant.preferences?.cleanlinessLevel) {
        const diff = Math.abs(preferences.cleanlinessLevel - tenant.preferences.cleanlinessLevel);
        score += Math.max(0, 15 - diff * 5);
        if (diff <= 1) reasons.push('Similar cleanliness level');
      }
      
      // Language (10 points)
      if (preferences.language && tenant.preferences?.language?.includes(preferences.language)) {
        score += 10;
        reasons.push(`Speaks ${preferences.language}`);
      }
      
      // Interests (10 points)
      if (preferences.interests) {
        const interestsArr = preferences.interests.split(',').map(i => i.trim().toLowerCase());
        const common = interestsArr.filter(i => 
          tenant.preferences?.interests?.map(x => x.toLowerCase())?.includes(i)
        );
        if (common.length > 0) {
          score += Math.min(10, common.length * 5);
          reasons.push(`Common interests: ${common.join(', ')}`);
        }
      }
      
      // Gender (5 points)
      if (tenant.gender === preferences.gender) {
        score += 5;
      }
      
      // Age similarity (5 points)
      if (tenant.age && preferences.age) {
        const ageDiff = Math.abs(tenant.age - preferences.age);
        if (ageDiff <= 3) {
          score += 5;
          reasons.push('Similar age');
        }
      }
      
      // Room vacancy check
      const hasVacancy = tenant.roomId && 
        tenant.roomId.currentOccupants?.length < tenant.roomId.maxOccupants;
      
      return {
        tenant: {
          name: tenant.name,
          age: tenant.age,
          gender: tenant.gender,
          roomNumber: tenant.roomId?.roomNumber,
          occupation: tenant.preferences?.occupation,
          sleepTiming: tenant.preferences?.sleepTiming,
          interests: tenant.preferences?.interests
        },
        compatibilityScore: Math.max(0, Math.min(100, score)),
        reasons,
        hasVacancy
      };
    });
    
    scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    
    return {
      matches: scored.slice(0, 10),
      bestMatch: scored[0] || null
    };
  } catch (error) {
    console.error('Roommate matching error:', error);
    return { matches: [], bestMatch: null };
  }
}
