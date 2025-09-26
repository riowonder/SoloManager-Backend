import express from 'express';
import * as financeController from '../controllers/financeController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get finance data with period filter (Admin only)
router.get('/data', authenticate, requireAdmin, financeController.getFinanceData);

// Get finance summary for all periods (Admin only)
router.get('/summary', authenticate, requireAdmin, financeController.getFinanceSummary);

export default router;