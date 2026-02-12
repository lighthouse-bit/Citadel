const express = require('express');
const router = express.Router();
const multer = require('multer');
const commissionController = require('../controllers/commissionController');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// Public/User route - Submit commission
// Using authenticateUser allows both logged-in users (req.user exists) and guests (req.user null)
router.post('/', authenticateUser, upload.array('referenceImages', 5), commissionController.createCommission);

// User Protected Route - Get My Commissions
router.get('/my-commissions', authenticateUser, commissionController.getMyCommissions);

// Admin routes
router.get('/', authenticateAdmin, commissionController.getAllCommissions);
router.get('/:id', authenticateAdmin, commissionController.getCommissionById);
router.patch('/:id/status', authenticateAdmin, commissionController.updateCommissionStatus);
router.post('/:id/progress', authenticateAdmin, upload.single('image'), commissionController.addProgressImage);

module.exports = router;