const router = require('express').Router();
const controller = require('../controllers/privacyRequestController');
const { authenticateAdmin, authenticateCustomer } = require('../middleware/auth');

router.get('/admin', authenticateAdmin, controller.listAdminRequests);
router.patch('/admin/:id', authenticateAdmin, controller.updateRequest);
router.get('/', authenticateCustomer, controller.listOwnRequests);
router.post('/', authenticateCustomer, controller.createRequest);

module.exports = router;
