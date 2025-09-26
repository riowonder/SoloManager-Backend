import express from 'express';
import { sendExpiryMessage } from '../services/whatsappService.js';

const router = express.Router();
router.get('/send-test-message', sendExpiryMessage);    

router.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

export default router;