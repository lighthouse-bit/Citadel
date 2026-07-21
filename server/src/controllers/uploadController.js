const cloudinary = require('../config/cloudinary');

const allowedFolders = new Set(['commissions', 'customer-uploads', 'support']);

exports.createSignature = (req, res) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(503).json({ error: 'Image uploads are not configured on the server' });
  }

  const requested = String(req.body.folder || 'customer-uploads').toLowerCase();
  const folderName = allowedFolders.has(requested) ? requested : 'customer-uploads';
  const folder = `citadel/${folderName}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, CLOUDINARY_API_SECRET);
  return res.json({ cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, folder, timestamp, signature });
};
