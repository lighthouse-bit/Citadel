const router=require('express').Router();
const controller=require('../controllers/marketingController');
const {authenticateAdmin}=require('../middleware/auth');
router.post('/promotions/validate',controller.validatePromotion);
router.use(authenticateAdmin);
router.get('/promotions',controller.listPromotions);router.post('/promotions',controller.createPromotion);router.put('/promotions/:id',controller.updatePromotion);router.delete('/promotions/:id',controller.deletePromotion);
router.get('/templates',controller.listTemplates);router.post('/templates',controller.saveTemplate);router.put('/templates/:id',controller.saveTemplate);router.post('/templates/test',controller.testEmail);
router.get('/campaigns',controller.listCampaigns);router.post('/campaigns',controller.createCampaign);router.post('/campaigns/:id/send',controller.sendCampaign);
module.exports=router;
