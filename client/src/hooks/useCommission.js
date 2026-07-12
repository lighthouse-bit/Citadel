// client/src/hooks/useCommission.js
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config/api';


export const useCreateCommission = () => {
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await axios.post(
        `${API_URL}/commissions`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return data;
    },
  });
};
