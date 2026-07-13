const router = require('express').Router();
const controller = require('../controllers/supportController');
const { authenticateAdmin } = require('../middleware/auth');

router.use(authenticateAdmin);
router.get('/', controller.listAdminTickets);
router.get('/:id', controller.getAdminTicket);
router.patch('/:id', controller.updateAdminTicket);
router.post('/:id/messages', controller.replyAsAdmin);

module.exports = router;
