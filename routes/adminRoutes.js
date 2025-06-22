const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Update gym name (Admin only)
router.put('/update-gym-name', authenticate, requireAdmin, adminController.updateGymName);

// Invite manager (Admin only)
router.post('/invite-manager', authenticate, requireAdmin, adminController.inviteManager);

module.exports = router; 