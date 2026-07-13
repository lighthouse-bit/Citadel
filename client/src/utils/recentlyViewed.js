const KEY = 'citadel_recently_viewed';

export const getGuestRecentlyViewed = () => {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(items) ? items.filter(item => item?.id).slice(0, 12) : [];
  } catch {
    localStorage.removeItem(KEY);
    return [];
  }
};

export const recordGuestArtworkView = artwork => {
  const compact = {
    id: artwork.id,
    title: artwork.title,
    price: artwork.price,
    category: artwork.category,
    medium: artwork.medium,
    status: artwork.status,
    images: artwork.images?.slice(0, 1),
    viewedAt: new Date().toISOString(),
  };
  const items = [compact, ...getGuestRecentlyViewed().filter(item => item.id !== artwork.id)].slice(0, 12);
  localStorage.setItem(KEY, JSON.stringify(items));
  return items;
};
