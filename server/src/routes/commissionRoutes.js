// server/src/routes/commissionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const commissionController = require('../controllers/commissionController');
const { authenticateAdmin } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.post('/', upload.array('referenceImages', 5), commissionController.createCommission);

// Admin routes
router.get('/', authenticateAdmin, commissionController.getAllCommissions);
router.get('/:id', authenticateAdmin, commissionController.getCommissionById);
router.patch('/:id/status', authenticateAdmin, commissionController.updateCommissionStatus);
router.post('/:id/progress', authenticateAdmin, upload.single('image'), commissionController.addProgressImage);

module.exports = router;