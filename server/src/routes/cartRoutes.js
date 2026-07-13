const router = require('express').Router();
const controller = require('../controllers/cartController');
const { authenticateCustomer } = require('../middleware/auth');

router.use(authenticateCustomer);
router.get('/', controller.getCart);
router.post('/merge', controller.mergeCart);
router.post('/:artworkId', controller.addItem);
router.delete('/:artworkId', controller.removeItem);
router.delete('/', controller.clearCart);

module.exports = router;
