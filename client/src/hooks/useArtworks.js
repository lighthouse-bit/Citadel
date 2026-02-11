// client/src/hooks/useArtworks.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useArtworks = (params = {}) => {
  return useQuery({
    queryKey: ['artworks', params],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/artworks`, { params });
      return data;
    },
  });
};

export const useArtwork = (id) => {
  return useQuery({
    queryKey: ['artwork', id],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/artworks/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useFeaturedArtworks = () => {
  return useQuery({
    queryKey: ['artworks', 'featured'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/artworks/featured`);
      return data;
    },
  });
};

export const useCreateArtwork = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await axios.post(`${API_URL}/artworks`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artworks'] });
    },
  });
};

export const useUpdateArtwork = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data } = await axios.put(`${API_URL}/artworks/${id}`, updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['artworks'] });
      queryClient.invalidateQueries({ queryKey: ['artwork', data.id] });
    },
  });
};

export const useDeleteArtwork = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      await axios.delete(`${API_URL}/artworks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artworks'] });
    },
  });
};