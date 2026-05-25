import { client } from './client';

export const productsAPI = {
  getProducts: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return client.get(`/api/products${queryString ? `?${queryString}` : ''}`);
  },

  getProduct: (id) => client.get(`/api/products/${id}`),

  getAdminProducts: () => client.get('/api/products/all'),

  getSupplierProducts: () => client.get('/api/products/supplier'),

  createProduct: (productData) => {
    let body = productData;
    // Check if we have a file and need FormData
    if (productData.imageFile) {
      body = new FormData();
      Object.keys(productData).forEach(key => {
        if (key === 'imageFile') {
          body.append('image', productData.imageFile);
        } else {
          body.append(key, productData[key]);
        }
      });
    }
    return client.post('/api/products', body);
  },

  updateProduct: (id, productData) => {
    let body = productData;
    if (productData.imageFile) {
      body = new FormData();
      Object.keys(productData).forEach(key => {
        if (key === 'imageFile') {
          body.append('image', productData.imageFile);
        } else {
          body.append(key, productData[key]);
        }
      });
    }
    return client.put(`/api/products/${id}`, body);
  },

  deleteProduct: (id) => client.delete(`/api/products/${id}`),

  updateProductStatus: (id, status) => client.put(`/api/products/${id}/status`, { status })
};
