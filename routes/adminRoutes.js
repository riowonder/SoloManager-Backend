import express from 'express';
import {updateGymName, inviteManager} from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Update gym name (Admin only)
router.put('/update-gym-name', authenticate, requireAdmin, updateGymName);

// Invite manager (Admin only)
router.post('/invite-manager', authenticate, requireAdmin, inviteManager);

export default router;