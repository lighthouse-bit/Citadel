const router = require('express').Router();
const controller = require('../controllers/accountController');
const { authenticateCustomer } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/security');

router.use(authenticateCustomer);
router.get('/profile', controller.getProfile);
router.patch('/profile', controller.updateProfile);
router.post('/password', authRateLimit, controller.changePassword);
router.post('/addresses', controller.createAddress);
router.put('/addresses/:id', controller.updateAddress);
router.patch('/addresses/:id/default', controller.setDefaultAddress);
router.delete('/addresses/:id', controller.deleteAddress);

module.exports = router;
