const router=require('express').Router();
const controller=require('../controllers/reportingController');
const {authenticateAdmin}=require('../middleware/auth');
router.use(authenticateAdmin);router.get('/financial',controller.getFinancialReport);router.get('/financial/export',controller.exportFinancialReport);module.exports=router;
