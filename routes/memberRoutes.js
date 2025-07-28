const express = require('express');
const router = express.Router(); 
const memberController = require('../controllers/memberController');
const { authenticate, requireManagerOrAdmin } = require('../middleware/auth');
const upload = require('../middleware/multer');

// Add new member
router.post('/add', authenticate, requireManagerOrAdmin, upload.single('image'), memberController.addMember);
router.get('/get-members', authenticate, requireManagerOrAdmin, memberController.getMembers);
router.get('/expired', authenticate, requireManagerOrAdmin, memberController.expiredSubscriptions);
router.post('/expiring-soon', authenticate, requireManagerOrAdmin, memberController.expiringSoon);

// Add search route 
router.get('/search', authenticate, requireManagerOrAdmin, memberController.searchMembers);

router.get('/:id', authenticate, requireManagerOrAdmin, memberController.getMemberById);
router.put('/:id', authenticate, requireManagerOrAdmin, upload.single('image'), memberController.updateMember);

// Subscription routes
router.post('/:userId/subscription', authenticate, requireManagerOrAdmin, memberController.addSubscription);
router.get('/:userId/subscriptions', authenticate, requireManagerOrAdmin, memberController.getSubscriptions);
router.put('/subscription/:subscriptionId', authenticate, requireManagerOrAdmin, memberController.updateSubscription);
router.delete('/subscription/:subscriptionId', authenticate, requireManagerOrAdmin, memberController.deleteSubscription);

module.exports = router; 