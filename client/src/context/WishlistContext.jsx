import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { wishlistAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { trackEvent } from '../utils/analytics';

export const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [artworks, setArtworks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'customer') {
      setArtworks([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await wishlistAPI.getAll();
      setArtworks(data.artworks || []);
    } catch {
      setArtworks([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const artworkIds = useMemo(() => new Set(artworks.map(artwork => artwork.id)), [artworks]);
  const isWishlisted = useCallback(id => artworkIds.has(id), [artworkIds]);

  const toggleWishlist = useCallback(async (artwork) => {
    if (!isAuthenticated || user?.role !== 'customer') {
      window.dispatchEvent(new CustomEvent('citadel:open-auth', { detail: { mode: 'login' } }));
      toast('Sign in to save artworks to your wishlist');
      return false;
    }

    const wasSaved = artworkIds.has(artwork.id);
    setArtworks(previous => wasSaved
      ? previous.filter(item => item.id !== artwork.id)
      : [{ ...artwork, wishlistedAt: new Date().toISOString() }, ...previous]);

    try {
      if (wasSaved) await wishlistAPI.remove(artwork.id);
      else await wishlistAPI.add(artwork.id);
      trackEvent(wasSaved ? 'remove_from_wishlist' : 'add_to_wishlist', {
        item_id: artwork.id,
        item_name: artwork.title,
        price: Number(artwork.price || 0),
        currency: 'USD',
      });
      toast.success(wasSaved ? 'Removed from wishlist' : 'Saved to your wishlist');
      return !wasSaved;
    } catch (error) {
      setArtworks(previous => wasSaved
        ? [artwork, ...previous.filter(item => item.id !== artwork.id)]
        : previous.filter(item => item.id !== artwork.id));
      toast.error(error.response?.data?.error || 'Could not update your wishlist');
      return wasSaved;
    }
  }, [artworkIds, isAuthenticated, user?.role]);

  const value = useMemo(() => ({
    artworks,
    isLoading,
    isWishlisted,
    toggleWishlist,
    refreshWishlist,
  }), [artworks, isLoading, isWishlisted, refreshWishlist, toggleWishlist]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};
