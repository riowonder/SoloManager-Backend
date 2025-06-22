const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Add new custom field
router.post('/add-field', authenticate, requireAdmin, dashboardController.addFieldToDocuments);
// router.post('/update-gym-name', authenticate, requireAdmin, dashboardController.updateGymName);

module.exports = router; 