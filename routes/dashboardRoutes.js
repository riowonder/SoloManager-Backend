import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Add new custom field
router.post('/add-field', authenticate, requireAdmin, dashboardController.addFieldToDocuments);
// router.post('/update-gym-name', authenticate, requireAdmin, dashboardController.updateGymName);

export default router;