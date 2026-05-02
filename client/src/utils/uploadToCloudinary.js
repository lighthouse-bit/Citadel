// client/src/utils/uploadToCloudinary.js

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a single file directly to Cloudinary
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Optional progress callback (0-100)
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadToCloudinary = async (file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'citadel');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
        });
      } else {
        reject(new Error('Upload failed'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
    );
    xhr.send(formData);
  });
};

/**
 * Upload multiple files directly to Cloudinary
 * @param {File[]} files - Array of files to upload
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<{url: string, publicId: string}[]>}
 */
export const uploadMultipleToCloudinary = async (files, onProgress = null) => {
  const uploads = files.map((file, index) =>
    uploadToCloudinary(file, (percent) => {
      if (onProgress) {
        // Calculate overall progress
        onProgress(Math.round((index / files.length) * 100 + percent / files.length));
      }
    })
  );
  return Promise.all(uploads);
};

export default uploadToCloudinary;