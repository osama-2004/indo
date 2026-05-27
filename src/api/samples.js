import { client } from './client';

export const samplesAPI = {
  requestSample: (productId, message) => client.post('/api/samples', { productId, message }),
  
  getSamples: () => client.get('/api/samples'),
  
  updateSampleStatus: (sampleId, status) => client.put(`/api/samples/${sampleId}/status`, { status }),

  approveSample: (sampleId) => client.patch(`/api/sample-request/${sampleId}/approve`),
  
  rejectSample: (sampleId) => client.patch(`/api/sample-request/${sampleId}/reject`),
  
  deleteSample: (sampleId) => client.delete(`/api/sample-request/${sampleId}`)
};
