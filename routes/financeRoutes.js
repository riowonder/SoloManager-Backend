const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get finance data with period filter (Admin only)
router.get('/data', authenticate, requireAdmin, financeController.getFinanceData);

// Get finance summary for all periods (Admin only)
router.get('/summary', authenticate, requireAdmin, financeController.getFinanceSummary);

module.exports = router; 