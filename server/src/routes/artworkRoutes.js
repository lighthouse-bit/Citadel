// server/src/routes/artworkRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const artworkController = require('../controllers/artworkController');
const { authenticateAdmin } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.get('/', artworkController.getAllArtworks);
router.get('/featured', artworkController.getFeaturedArtworks);
router.get('/slug/:slug', artworkController.getArtworkBySlug);
router.get('/:id', artworkController.getArtworkById);

// Admin routes
router.post('/', authenticateAdmin, upload.array('images', 10), artworkController.createArtwork);
router.put('/:id', authenticateAdmin, artworkController.updateArtwork);
router.delete('/:id', authenticateAdmin, artworkController.deleteArtwork);

module.exports = router;