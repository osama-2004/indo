import { client } from './client';

export const ordersAPI = {
  createOrder: (orderData) => client.post('/api/orders', orderData),
  
  getOrders: () => client.get('/api/orders'),
  
  getOrder: (id) => client.get(`/api/orders/${id}`),
  
  updateOrderStatus: (id, status) => client.put(`/api/orders/${id}/status`, { status })
};
