import { client } from './client';

export const authAPI = {
  login: async (username, password) => {
    const data = await client.post('/api/auth/login', { username, password });
    if (data.token) {
      localStorage.setItem('indus_token', data.token);
      localStorage.setItem('indus_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChanged'));
    }
    return data;
  },

  register: async (userData) => {
    const data = await client.post('/api/auth/register', userData);
    if (data.token) {
      localStorage.setItem('indus_token', data.token);
      localStorage.setItem('indus_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChanged'));
    }
    return data;
  },

  getProfile: () => client.get('/api/auth/me'),

  updateProfile: async (profileData) => {
    const data = await client.put('/api/auth/profile', profileData);
    if (data.user) {
      localStorage.setItem('indus_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChanged'));
    }
    return data;
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const data = await client.post('/api/auth/profile/avatar', formData);
    
    // Update local storage user image
    const storedUser = localStorage.getItem('indus_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      user.avatar = data.avatar;
      localStorage.setItem('indus_user', JSON.stringify(user));
      window.dispatchEvent(new Event('authChanged'));
    }
    return data;
  },

  socialLogin: async (socialData) => {
    const data = await client.post('/api/auth/social-login', socialData);
    if (data.token) {
      localStorage.setItem('indus_token', data.token);
      localStorage.setItem('indus_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChanged'));
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('indus_token');
    localStorage.removeItem('indus_user');
    window.dispatchEvent(new Event('authChanged'));
  }
};
