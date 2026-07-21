const cloudinary = require('../config/cloudinary');

const publicFolders = new Set(['commissions', 'customer-uploads', 'support']);
const adminFolders = new Set(['artworks', 'commission-progress']);

exports.createSignature = (req, res) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(503).json({ error: 'Image uploads are not configured on the server' });
  }

  const requested = String(req.body.folder || 'customer-uploads').toLowerCase();
  if (adminFolders.has(requested) && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access is required for this upload' });
  }
  const folderName = publicFolders.has(requested) || adminFolders.has(requested) ? requested : 'customer-uploads';
  const folder = `citadel/${folderName}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, CLOUDINARY_API_SECRET);
  return res.json({ cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, folder, timestamp, signature });
};
