import { client } from './client';

export const reviewsAPI = {
  // GET /api/reviews/:productId — public
  getReviews: (productId) => client.get(`/api/reviews/${productId}`),

  // POST /api/reviews/:productId — auth required (submit or update own review)
  submitReview: (productId, rating, comment) =>
    client.post(`/api/reviews/${productId}`, { rating, comment }),

  // DELETE /api/reviews/:reviewId — auth required (owner or admin)
  deleteReview: (reviewId) => client.delete(`/api/reviews/${reviewId}`),
};
