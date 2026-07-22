/**
 * Emergency Detector (Feature #26)
 * Detect emergency complaints and trigger immediate notifications.
 */

export function isEmergencyComplaint(description) {
  const emergencyKeywords = {
    'gas-leak': ['gas leak', 'gas leaking', 'smell of gas', 'gas cylinder', 'lpg leak'],
    'fire': ['fire', 'burning', 'smoke', 'flames', 'short circuit fire', 'electrical fire'],
    'medical': ['medical emergency', 'unconscious', 'heart attack', 'not breathing', 'bleeding heavily', 'seizure', 'fell down stairs', 'accident'],
    'security': ['break in', 'theft', 'intruder', 'someone broke in', 'robbery', 'stalking', 'assault']
  };
  
  const lowerDesc = description.toLowerCase();
  
  for (const [type, keywords] of Object.entries(emergencyKeywords)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return { isEmergency: true, emergencyType: type };
      }
    }
  }
  
  return { isEmergency: false, emergencyType: null };
}

export function getEmergencyResponse(emergencyType) {
  const responses = {
    'gas-leak': {
      immediateAction: 'EVACUATE immediately. Do NOT turn on any electrical switches. Open all windows.',
      contacts: ['Fire Department: 101', 'Gas Emergency: 1906'],
      priority: 'CRITICAL'
    },
    'fire': {
      immediateAction: 'EVACUATE immediately. Use fire extinguisher if safe. Do NOT use elevator.',
      contacts: ['Fire Department: 101', 'Ambulance: 102'],
      priority: 'CRITICAL'
    },
    'medical': {
      immediateAction: 'Call ambulance immediately. Provide first aid if trained. Do NOT move the person unless in danger.',
      contacts: ['Ambulance: 102', 'Emergency: 112'],
      priority: 'CRITICAL'
    },
    'security': {
      immediateAction: 'Stay in a safe location. Do NOT confront. Call police immediately.',
      contacts: ['Police: 100', 'Women Helpline: 1091', 'Emergency: 112'],
      priority: 'HIGH'
    }
  };
  
  return responses[emergencyType] || {
    immediateAction: 'Contact management immediately.',
    contacts: ['Emergency: 112'],
    priority: 'HIGH'
  };
}
