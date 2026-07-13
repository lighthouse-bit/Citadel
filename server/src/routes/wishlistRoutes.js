const router = require('express').Router();
const controller = require('../controllers/wishlistController');
const { authenticateCustomer } = require('../middleware/auth');

router.use(authenticateCustomer);
router.get('/', controller.list);
router.post('/:artworkId', controller.add);
router.delete('/:artworkId', controller.remove);

module.exports = router;
