import { createContext, useContext, useState, useEffect } from 'react';
import { artworksAPI } from '../services/api';

const ArtworksContext = createContext();

export const ArtworksProvider = ({ children }) => {
  const [artworks, setArtworks] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load artworks from API on mount
  useEffect(() => {
    fetchArtworks();
  }, []);

  const fetchArtworks = async () => {
    try {
      // Fetch all available artworks
      const response = await artworksAPI.getAll({ limit: 100 });
      setArtworks(response.data.artworks);
    } catch (error) {
      console.error('Failed to load artworks:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  // Add new artwork (Optimistic Update)
  const addArtwork = async (newArtwork) => {
    setArtworks(prev => [newArtwork, ...prev]);
    // In a real app, you might want to re-fetch to get the server-generated ID if needed immediately
  };

  // Update artwork
  const updateArtwork = (id, updates) => {
    setArtworks(prev => 
      prev.map(artwork => 
        artwork.id === id ? { ...artwork, ...updates } : artwork
      )
    );
  };

  // Delete artwork
  const deleteArtwork = (id) => {
    setArtworks(prev => prev.filter(artwork => artwork.id !== id));
  };

  // Get single artwork
  const getArtworkById = (id) => {
    return artworks.find(artwork => artwork.id === id);
  };

  // Get featured artworks
  const getFeaturedArtworks = () => {
    return artworks.filter(artwork => artwork.featured);
  };

  // Get available artworks
  const getAvailableArtworks = () => {
    return artworks.filter(artwork => artwork.status === 'AVAILABLE');
  };

  const value = {
    artworks,
    isLoaded,
    fetchArtworks,
    addArtwork,
    updateArtwork,
    deleteArtwork,
    getArtworkById,
    getFeaturedArtworks,
    getAvailableArtworks,
  };

  return (
    <ArtworksContext.Provider value={value}>
      {children}
    </ArtworksContext.Provider>
  );
};

export const useArtworks = () => {
  const context = useContext(ArtworksContext);
  if (!context) {
    throw new Error('useArtworks must be used within ArtworksProvider');
  }
  return context;
};