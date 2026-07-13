const router = require('express').Router();
const controller = require('../controllers/wishlistController');
const { authenticateAdmin, authenticateCustomer } = require('../middleware/auth');

router.post('/unsubscribe/:token', controller.unsubscribe);
router.get('/alerts/:id/open.gif', controller.trackOpen);
router.get('/alerts/:id/click', controller.trackClick);
router.get('/admin/performance', authenticateAdmin, controller.getAlertPerformance);
router.use(authenticateCustomer);
router.get('/', controller.list);
router.get('/preferences', controller.getPreferences);
router.patch('/preferences', controller.updatePreferences);
router.post('/:artworkId', controller.add);
router.delete('/:artworkId', controller.remove);

module.exports = router;
