// client/src/utils/uploadToCloudinary.js

import { API_URL } from '../config/api';

const getUploadSignature = async folder => {
  const token = localStorage.getItem('citadel_token');
  const response = await fetch(`${API_URL}/uploads/signature`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ folder }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not prepare image upload');
  return data;
};

/**
 * Upload a single file directly to Cloudinary
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Optional progress callback (0-100)
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadToCloudinary = async (file, onProgress = null, folder = 'customer-uploads') => {
  if (!file?.type?.startsWith('image/')) throw new Error('Only image files can be uploaded');
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10MB`);
  const credentials = await getUploadSignature(folder);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', credentials.apiKey);
  formData.append('timestamp', String(credentials.timestamp));
  formData.append('signature', credentials.signature);
  formData.append('folder', credentials.folder);
  if (credentials.type === 'authenticated') formData.append('type', credentials.type);

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
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
        });
      } else {
        let message = 'Image upload failed';
        try { message = JSON.parse(xhr.responseText)?.error?.message || message; } catch { /* Cloudinary returned a non-JSON error */ }
        reject(new Error(message));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`
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
export const uploadMultipleToCloudinary = async (files, onProgress = null, folder = 'customer-uploads') => {
  const uploads = files.map((file, index) =>
    uploadToCloudinary(file, (percent) => {
      if (onProgress) {
        // Calculate overall progress
        onProgress(Math.round((index / files.length) * 100 + percent / files.length));
      }
    }, folder)
  );
  return Promise.all(uploads);
};

export const uploadDigitalMaster = async (file, onProgress = null) => {
  if (!file?.type?.startsWith('image/')) throw new Error('The digital master must be an image file');
  if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name} is larger than 50MB`);
  const credentials = await getUploadSignature('digital-originals');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', credentials.apiKey);
  formData.append('timestamp', String(credentials.timestamp));
  formData.append('signature', credentials.signature);
  formData.append('folder', credentials.folder);
  formData.append('type', 'authenticated');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (onProgress) xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          publicId: data.public_id,
          format: data.format,
          resourceType: data.resource_type || 'image',
          originalFilename: data.original_filename ? `${data.original_filename}.${data.format}` : file.name,
          bytes: data.bytes || file.size,
        });
      } else {
        let message = 'Protected master upload failed';
        try { message = JSON.parse(xhr.responseText)?.error?.message || message; } catch { /* non-JSON provider error */ }
        reject(new Error(message));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Protected master upload failed')));
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`);
    xhr.send(formData);
  });
};

export default uploadToCloudinary;
