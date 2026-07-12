const router = require('express').Router();
const controller = require('../controllers/customerController');
const { authenticateAdmin } = require('../middleware/auth');
router.use(authenticateAdmin);
router.get('/export', controller.exportCustomers);
router.get('/', controller.getCustomers);
router.get('/:id', controller.getCustomer);
router.patch('/:id', controller.updateCustomer);
module.exports = router;
