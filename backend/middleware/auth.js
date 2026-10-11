import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Please log in to continue.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password -aadhaarImage -selfieImage');

    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ success: false, message: 'Your session has ended. Please log in again.' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' });
  }
};

// Role-based access
export const isOwner = (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Owner only.' });
  }
};

export const isTenant = (req, res, next) => {
  if (req.user && (req.user.role === 'tenant' || req.user.role === 'owner')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Tenant or Owner only.' });
  }
};

// Generate JWT token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};
