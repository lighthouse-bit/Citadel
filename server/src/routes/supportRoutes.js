const router = require('express').Router();
const controller = require('../controllers/supportController');
const { authenticateCustomer } = require('../middleware/auth');

router.use(authenticateCustomer);
router.get('/', controller.listCustomerTickets);
router.post('/', controller.createTicket);
router.get('/:id', controller.getCustomerTicket);
router.post('/:id/messages', controller.replyAsCustomer);
router.patch('/:id/close', controller.closeCustomerTicket);

module.exports = router;
