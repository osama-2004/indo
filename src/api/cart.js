import { client } from './client';

export const cartAPI = {
  getCart: () => client.get('/api/cart'),
  
  addToCart: (productId, quantity = 1) => client.post('/api/cart', { productId, quantity }),
  
  updateCartItem: (productId, quantity) => client.put(`/api/cart/${productId}`, { quantity }),
  
  removeCartItem: (productId) => client.delete(`/api/cart/${productId}`),
  
  clearCart: () => client.delete('/api/cart')
};
