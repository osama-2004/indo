import { client } from './client';

export const favoritesAPI = {
  getFavorites: () => client.get('/api/favorites'),
  
  toggleFavorite: (productId) => client.post(`/api/favorites/${productId}`),
  
  removeFavorite: (productId) => client.delete(`/api/favorites/${productId}`)
};
