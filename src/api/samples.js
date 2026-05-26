import { client } from './client';

export const samplesAPI = {
  requestSample: (productId, message) => client.post('/api/samples', { productId, message }),
  
  getSamples: () => client.get('/api/samples'),
  
  updateSampleStatus: (sampleId, status) => client.put(`/api/samples/${sampleId}/status`, { status })
};
