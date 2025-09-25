const express = require('express');
const router = express.Router();

const {sendExpiryMessage} = require('../services/whatsappService');
router.get('/send-test-message', sendExpiryMessage);

module.exports = router; 