// server/src/services/imageService.js
const cloudinary = require('../config/cloudinary');

exports.uploadToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    // If Cloudinary is not configured, return a placeholder
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'demo') {
      console.warn('Cloudinary not configured, using placeholder');
      resolve({
        secure_url: `https://via.placeholder.com/800x600?text=${encodeURIComponent(file.originalname || 'Image')}`,
        public_id: `placeholder_${Date.now()}`,
      });
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `citadel/${folder}`,
        transformation: [
          { quality: 'auto:best' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Pipe the buffer
    if (file.buffer) {
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);
      bufferStream.pipe(uploadStream);
    } else {
      reject(new Error('No file buffer provided'));
    }
  });
};

exports.deleteFromCloudinary = async (publicId) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'demo') {
    console.warn('Cloudinary not configured, skipping delete');
    return { result: 'ok' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};