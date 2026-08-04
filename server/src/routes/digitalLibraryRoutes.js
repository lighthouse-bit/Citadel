const router = require('express').Router();
const controller = require('../controllers/digitalLibraryController');
const { authenticateAdmin, authenticateCustomer } = require('../middleware/auth');

router.get('/certificate/:id', controller.verifyCertificate);
router.get('/admin/summary', authenticateAdmin, controller.adminSummary);
router.get('/admin/entitlements', authenticateAdmin, controller.adminListEntitlements);
router.patch('/admin/entitlements/:id/access', authenticateAdmin, controller.adminUpdateAccess);
router.post('/admin/entitlements/:id/resend-email', authenticateAdmin, controller.adminResendDeliveryEmail);
router.get('/', authenticateCustomer, controller.listLibrary);
router.post('/:id/download', authenticateCustomer, controller.createDownload);
router.get('/:id/license', authenticateCustomer, controller.downloadLicense);

module.exports = router;
