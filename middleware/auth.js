const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const Manager = require('../models/manager');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.ZM_Cookie;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's an admin
    let user = await Admin.findById(decoded.id);
    if (user) {
      req.user = { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        gym_name: user.gym_name, 
        role: user.role,
        gym_id: user._id // For admin, gym_id is their own ID
      };
      return next();
    }
    
    // Check if it's a manager
    user = await Manager.findById(decoded.id);
    if (user) {
      // Get the admin (gym) details for the manager
      const admin = await Admin.findById(user.gym_id);
      if (!admin) {
        return res.status(401).json({ success: false, message: 'Associated gym not found' });
      }
      
      req.user = { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        gym_name: admin.gym_name, 
        role: user.role,
        gym_id: user.gym_id // Manager's gym_id
      };
      return next();
    }
    
    return res.status(401).json({ success: false, message: 'User not found' });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

// Only allow admins
exports.requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Admin access required' });
};

// Allow managers and admins
exports.requireManagerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Manager or Admin access required' });
};

// Only allow managers
exports.requireManager = (req, res, next) => {
  if (req.user && req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Manager access required' });
};

// Check if user has access to specific gym (for managers)
exports.requireGymAccess = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next(); // Admins have access to their own gym
  }
  
  if (req.user && req.user.role === 'manager') {
    // For managers, check if they have access to the requested gym
    const requestedGymId = req.params.gymId || req.body.gym_id || req.query.gym_id;
    if (requestedGymId && requestedGymId !== req.user.gym_id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to this gym' });
    }
    return next();
  }
  
  return res.status(403).json({ success: false, message: 'Access denied' });
}; 