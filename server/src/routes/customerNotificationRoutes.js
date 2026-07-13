const router = require('express').Router();
const controller = require('../controllers/customerNotificationController');
const { authenticateCustomer } = require('../middleware/auth');

router.use(authenticateCustomer);
router.get('/', controller.list);
router.patch('/read-all', controller.markAllAsRead);
router.delete('/', controller.clear);
router.patch('/:id/read', controller.markAsRead);
router.delete('/:id', controller.remove);

module.exports = router;
