const CLOUDINARY_UPLOAD_SEGMENT = '/image/upload/';

export const isCloudinaryImage = (src) => {
  if (!src || typeof src !== 'string') return false;

  try {
    const url = new URL(src);
    return url.hostname === 'res.cloudinary.com' && url.pathname.includes(CLOUDINARY_UPLOAD_SEGMENT);
  } catch {
    return false;
  }
};

export const getOptimizedImageUrl = (src, { width, quality = 'auto:good' } = {}) => {
  if (!isCloudinaryImage(src)) return src;

  const transformations = ['f_auto', `q_${quality}`];
  if (width) transformations.push(`w_${Math.round(width)}`, 'c_limit');

  return src.replace(
    CLOUDINARY_UPLOAD_SEGMENT,
    `${CLOUDINARY_UPLOAD_SEGMENT}${transformations.join(',')}/`,
  );
};

export const getResponsiveImageSrcSet = (src, widths = []) => {
  if (!isCloudinaryImage(src)) return undefined;

  return [...new Set(widths)]
    .filter((width) => Number.isFinite(width) && width > 0)
    .sort((a, b) => a - b)
    .map((width) => `${getOptimizedImageUrl(src, { width })} ${width}w`)
    .join(', ');
};
