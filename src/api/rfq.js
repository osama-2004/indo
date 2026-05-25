import { client } from './client';

export const rfqAPI = {
  submitRFQ: (rfqData) => client.post('/api/rfq', rfqData),
  
  getRFQs: () => client.get('/api/rfq'),
  
  respondToRFQ: (rfqId, responseData) => client.post(`/api/rfq/${rfqId}/respond`, responseData),
  
  confirmRFQResponse: (responseId) => client.put(`/api/rfq/response/${responseId}/confirm`)
};
