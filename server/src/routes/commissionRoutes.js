// server/src/routes/commissionRoutes.js
const express    = require('express');
const router     = express.Router();
const commissionController = require('../controllers/commissionController');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────
// PUBLIC / USER ROUTES
// ─────────────────────────────────────────────────────────

// ✅ No multer needed — images come as Cloudinary URLs in JSON body
router.post(
  '/',
  authenticateUser,
  commissionController.createCommission
);

router.get(
  '/my-commissions',
  authenticateUser,
  commissionController.getMyCommissions
);

router.get(
  '/my-commissions/:id',
  authenticateUser,
  commissionController.getMyCommissionById
);

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
router.patch('/:id/status', authenticateAdmin, commissionController.updateCommissionStatus);

// ✅ Progress images still go through backend via Cloudinary service
// But we need to update this too — share commissionController.js
// and I'll update addProgressImage as well
router.post(
  '/:id/progress',
  authenticateAdmin,
  commissionController.addProgressImage
);

module.exports = router;