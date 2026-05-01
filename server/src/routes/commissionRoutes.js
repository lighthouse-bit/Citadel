const express = require('express');
const router = express.Router();
const multer = require('multer');
const commissionController = require('../controllers/commissionController');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// ─────────────────────────────────────────────────────────
// PUBLIC / USER ROUTES
// ─────────────────────────────────────────────────────────

// Submit new commission (guest or logged-in user)
router.post(
  '/',
  authenticateUser,
  upload.array('referenceImages', 5),
  commissionController.createCommission
);

// Get current user's commissions
router.get(
  '/my-commissions',
  authenticateUser,
  commissionController.getMyCommissions
);

// Get a single commission by ID - for logged in user (payment page needs this)
router.get(
  '/my-commissions/:id',          // ← separate from admin /:id
  authenticateUser,
  commissionController.getMyCommissionById  // ← new controller function
);

router.post(
  '/:id/confirm-payment',
  authenticateUser,
  commissionController.confirmPayment
);

// ─────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────

router.get('/', authenticateAdmin, commissionController.getAllCommissions);
router.get('/:id', authenticateAdmin, commissionController.getCommissionById);
router.patch('/:id/status', authenticateAdmin, commissionController.updateCommissionStatus);
router.post(
  '/:id/progress',
  authenticateAdmin,
  upload.single('image'),
  commissionController.addProgressImage
);

module.exports = router;