// server/src/routes/commissionRoutes.js
const express    = require('express');
const router     = express.Router();
const commissionController = require('../controllers/commissionController');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');

// ✅ No multer needed anywhere — all images go through Cloudinary directly

// ─────────────────────────────────────────────────────────
// PUBLIC / USER ROUTES
// ─────────────────────────────────────────────────────────

// Submit new commission — JSON body with Cloudinary URLs
router.post(
  '/',
  authenticateUser,
  commissionController.createCommission
);

// Get current user's commissions
router.get(
  '/my-commissions',
  authenticateUser,
  commissionController.getMyCommissions
);

// Get single commission for logged-in user
router.get(
  '/my-commissions/:id',
  authenticateUser,
  commissionController.getMyCommissionById
);

// Confirm payment
router.post(
  '/:id/confirm-payment',
  authenticateUser,
  commissionController.confirmPayment
);

// ─────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────

router.get('/',    authenticateAdmin, commissionController.getAllCommissions);
router.get('/:id', authenticateAdmin, commissionController.getCommissionById);

router.patch(
  '/:id/status',
  authenticateAdmin,
  commissionController.updateCommissionStatus
);

// ✅ Progress image — now accepts JSON with Cloudinary URL
router.post(
  '/:id/progress',
  authenticateAdmin,
  commissionController.addProgressImage
);

module.exports = router;