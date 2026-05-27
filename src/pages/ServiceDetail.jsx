import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFavorites, useCart, useAuth, useToast } from '../App'; 
import { productsAPI } from '../api/products';
import { samplesAPI } from '../api/samples';
import { reviewsAPI } from '../api/reviews';
import './ServiceDetail.css'

const getProductImage = (imageName) => {
  if (!imageName) return 'https://placehold.co/300x300/e2e8f0/64748b?text=IndusConnect';
  if (imageName.startsWith('data:') || imageName.startsWith('http') || imageName.startsWith('/uploads/')) {
    return imageName;
  }
  const cleanPath = imageName.startsWith('/') ? imageName.substring(1) : imageName;
  return `${import.meta.env.BASE_URL}${cleanPath}`;
};

const StarRating = ({ rating, totalReviews }) => (
  <div className="star-rating-container">
    <div className="stars-gold">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={i < rating ? "star-filled" : "star-empty"}>★</span>
      ))}
    </div>
    <span className="reviews-count-text">{rating} ({totalReviews} Reviews)</span>
  </div>
);

// Interactive star picker for the write-review form
const StarPicker = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
    {[1, 2, 3, 4, 5].map(star => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '28px', padding: '0 2px',
          color: star <= value ? '#f59e0b' : '#d1d5db',
          transition: 'color 0.15s, transform 0.1s',
          transform: star <= value ? 'scale(1.15)' : 'scale(1)'
        }}
      >★</button>
    ))}
  </div>
);

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCart } = useCart();
  const { user, isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reviews');
  const [qty, setQty] = useState(1); 
  const [visibleReviews, setVisibleReviews] = useState(4);

  // ── Reviews state ──────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  // My existing review (one per user per product)
  const myReview = isLoggedIn && user
    ? reviews.find(r => r.user_id === user.id)
    : null;

  // ── Sample request state ───────────────────────────────────────────────────
  const [sampleMessage, setSampleMessage] = useState('');
  const [sampleSubmitting, setSampleSubmitting] = useState(false);
  const [sampleSuccess, setSampleSuccess] = useState('');

  // ── Fetch product ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const data = await productsAPI.getProduct(id);
        setProduct(data);
        const moqNum = parseInt((data?.moq || '1').toString().replace(/\D/g, '')) || 1;
        setQty(moqNum);
      } catch (err) {
        console.error("Error loading product detail from server:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // ── Fetch reviews ──────────────────────────────────────────────────────────
  const loadReviews = async () => {
    setLoadingReviews(true);
    try {
      const data = await reviewsAPI.getReviews(id);
      setReviews(data);
    } catch (err) {
      console.error('Failed loading reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (id) loadReviews();
  }, [id]);

  // Pre-fill form if user already has a review
  useEffect(() => {
    if (myReview) {
      setReviewRating(myReview.rating);
      setReviewComment(myReview.comment || '');
    }
  }, [myReview?.id]);

  const isFav = product ? isFavorite(product.id) : false;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddToCart = async () => {
    if (!product) return;
    const moqNum = parseInt((product.moq || '1').toString().replace(/\D/g, '')) || 1;
    if (qty < moqNum) {
      showToast(`⚠️ Minimum order quantity (MOQ) for this product is ${moqNum} units.`, 'warning');
      setQty(moqNum);
      return;
    }
    try {
      await addToCart(product, qty);
      navigate('/cart');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSampleRequest = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      showToast('⚠️ Please log in to request a sample.', 'warning');
      navigate('/login');
      return;
    }
    setSampleSubmitting(true);
    setSampleSuccess('');
    try {
      await samplesAPI.requestSample(product.id, sampleMessage);
      setSampleSuccess('✅ Sample request submitted! The supplier will review your request soon.');
      setSampleMessage('');
    } catch (err) {
      setSampleSuccess('❌ ' + (err.message || 'Failed to submit sample request.'));
    } finally {
      setSampleSubmitting(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      showToast('⚠️ Please log in to leave a review.', 'warning');
      navigate('/login');
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) {
      showToast('⚠️ Please select a star rating.', 'warning');
      return;
    }
    setSubmittingReview(true);
    try {
      await reviewsAPI.submitReview(id, reviewRating, reviewComment);
      showToast(myReview ? '✅ Review updated!' : '✅ Review submitted!', 'success');
      setReviewComment('');
      setReviewRating(5);
      await loadReviews();
      // Also refresh product rating display
      const updated = await productsAPI.getProduct(id);
      setProduct(updated);
    } catch (err) {
      showToast('❌ ' + (err.message || 'Failed to submit review.'), 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    setDeletingReviewId(reviewId);
    try {
      await reviewsAPI.deleteReview(reviewId);
      showToast('✅ Review deleted.', 'success');
      await loadReviews();
      const updated = await productsAPI.getProduct(id);
      setProduct(updated);
    } catch (err) {
      showToast('❌ ' + (err.message || 'Failed to delete review.'), 'error');
    } finally {
      setDeletingReviewId(null);
    }
  };

  const scrollToReviews = () => {
    setActiveTab('reviews');
    document.getElementById('tabs-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Rating summary ─────────────────────────────────────────────────────────
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length
  }));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontSize: '20px', color: '#6b7280' }}>
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '15px' }}>
        <h2>Product not found</h2>
        <button onClick={() => navigate('/services')} style={{ padding: '10px 20px', backgroundColor: '#c24438', color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer' }}>Back to Products</button>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      
      {/* ======================================================================
          SECTION 1: MAIN PRODUCT DETAILS SPLIT CARD PRESENTATION VIEW
          ====================================================================== */}
      <div className="detail-card-main">
        
        {/* Left Column: Product Image */}
        <div className="image-column">
          <div className="main-image-holder" style={{cursor: 'pointer', position: 'relative'}}>
            <button 
              className={`heart-icon-btn ${isFav ? 'active-fav' : ''}`}
              style={{
                position: 'absolute', top: '15px', right: '15px', zIndex: 10,
                color: isFav ? '#c24438' : '#999', border: 'none',
                background: 'rgba(255,255,255,0.8)', borderRadius: '50%',
                width: '36px', height: '36px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)', cursor: 'pointer'
              }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product); }}
            >
              {isFav ? '❤️' : '♡'}
            </button>
            <img 
              src={getProductImage(product.image)} 
              alt={product.name} 
              className="img-fluid" 
              onError={(e) => { e.target.src = 'https://placehold.co/300x300/e2e8f0/64748b?text=No+Image'; }}
            />
          </div>
        </div>

        {/* Right Column: Product Info */}
        <div className="info-column">
          <nav className="category-path">{product.category}</nav>
          <h1 className="main-product-title">{product.name}</h1>
          
          <StarRating rating={product.rating || 0} totalReviews={product.reviews || 0} />
          
          <div className="price-display">EGP {Number(product.price).toLocaleString()}</div>

          <section className="description-block">
            <h3>What is it ?</h3>
            <p>{product.description || 'Premium industrial grade product listed on IndusConnect.'}</p>
          </section>

          <section className="special-block">
            <h3>Why is it special ?</h3>
            <ul>
              <li>Eco-friendly</li>
              <li>Customizable</li>
              <li>Trendy & Functional</li>
            </ul>
          </section>

          <div className="action-row">
            <div className="qty-selector">
              <button onClick={() => {
                const moqNum = parseInt((product.moq || '1').toString().replace(/\D/g, '')) || 1;
                setQty(Math.max(moqNum, qty - 1));
              }}>-</button>
              <span>{qty}</span>
              <button onClick={() => setQty(qty + 1)}>+</button>
            </div>
            {product.moq && (
              <span style={{ fontSize: '11px', color: '#6b7280', alignSelf: 'center' }}>MOQ: {product.moq}</span>
            )}
            <button className="btn-add-cart" onClick={handleAddToCart}>Add to cart</button>
            <button className="btn-rfq" onClick={() => navigate('/rfq')}>RFQ</button>
          </div>
        </div>
      </div>

      {/* ======================================================================
          SECTION 2: SELLER METRICS STRIP
          ====================================================================== */}
      <div className="seller-info-strip">
        <div className="seller-profile" onClick={scrollToReviews} style={{cursor: 'pointer'}}>
          <div className="avatar-circle">👤</div>
          <p>Sold by <strong style={{textDecoration: 'underline'}}>{product.supplier_name || 'IndusConnect Official'}</strong></p>
          <span className="rating-tag">⭐ {avgRating} ({reviews.length} Reviews)</span>
        </div>
      </div>

      {/* ======================================================================
          SECTION 3: TRUST BADGES
          ====================================================================== */}
      <div className="trust-badges-grid">
        <div className="badge-item"><span>🚚</span><p>Fast Shipping</p></div>
        <div className="badge-item"><span>💰</span><p>Cash on Delivery</p></div>
        <div className="badge-item"><span>🏅</span><p>100% Premium quality</p></div>
        <div className="badge-item"><span>🛡️</span><p>Payment Protection</p></div>
      </div>

      {/* ======================================================================
          SECTION 4: TABS — REVIEWS + SAMPLE REQUEST
          ====================================================================== */}
      <div className="tabs-system" id="tabs-section">
        <div className="tabs-nav">
          <button className={activeTab === 'reviews' ? 'tab-link active' : 'tab-link'} onClick={() => setActiveTab('reviews')}>
            Reviews {reviews.length > 0 && <span style={{ marginLeft: '6px', backgroundColor: '#c24438', color: '#fff', borderRadius: '20px', padding: '1px 8px', fontSize: '11px' }}>{reviews.length}</span>}
          </button>
          <button className={activeTab === 'sample' ? 'tab-link active' : 'tab-link'} onClick={() => setActiveTab('sample')}>Sample Request</button>
        </div>

        <div className="tab-body">
          {activeTab === 'reviews' ? (

            <div className="reviews-list-area">

              {/* ── Rating Summary Bar ────────────────────────────── */}
              {reviews.length > 0 && (
                <div style={{
                  display: 'flex', gap: '24px', alignItems: 'center',
                  backgroundColor: '#fafafa', borderRadius: '12px',
                  padding: '16px 20px', marginBottom: '24px', flexWrap: 'wrap'
                }}>
                  {/* Big average number */}
                  <div style={{ textAlign: 'center', minWidth: '70px' }}>
                    <div style={{ fontSize: '42px', fontWeight: '800', color: '#111827', lineHeight: 1 }}>{avgRating}</div>
                    <div style={{ color: '#f59e0b', fontSize: '18px', margin: '4px 0' }}>
                      {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{reviews.length} reviews</div>
                  </div>
                  {/* Bar breakdown */}
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    {ratingCounts.map(({ star, count }) => (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', width: '14px' }}>{star}</span>
                        <span style={{ color: '#f59e0b', fontSize: '13px' }}>★</span>
                        <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '4px', backgroundColor: '#f59e0b',
                            width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#6b7280', width: '20px' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Write / Edit Review Form ──────────────────────── */}
              <div style={{
                backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
                padding: '20px', marginBottom: '24px'
              }}>
                <h4 style={{ margin: '0 0 14px 0', color: '#c24438', fontSize: '16px', fontWeight: '700' }}>
                  {myReview ? '✏️ Edit Your Review' : '⭐ Write a Review'}
                </h4>
                {isLoggedIn ? (
                  <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                        Your Rating <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <StarPicker value={reviewRating} onChange={setReviewRating} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                        Your Comment <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(Optional)</span>
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Share your experience with this product..."
                        rows={3}
                        disabled={submittingReview}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: '8px',
                          border: '1px solid #d1d5db', resize: 'vertical',
                          fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box',
                          outline: 'none', transition: 'border-color 0.2s'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button
                        type="submit"
                        disabled={submittingReview}
                        style={{
                          backgroundColor: '#c24438', color: '#fff', border: 'none',
                          borderRadius: '30px', padding: '10px 28px', fontSize: '14px',
                          fontWeight: 'bold', cursor: submittingReview ? 'not-allowed' : 'pointer',
                          opacity: submittingReview ? 0.7 : 1, transition: 'all 0.2s'
                        }}
                      >
                        {submittingReview ? '⏳ Submitting...' : myReview ? '💾 Update Review' : '📝 Submit Review'}
                      </button>
                      {myReview && (
                        <button
                          type="button"
                          disabled={deletingReviewId === myReview.id}
                          onClick={() => handleDeleteReview(myReview.id)}
                          style={{
                            backgroundColor: 'transparent', color: '#ef4444',
                            border: '1px solid #ef4444', borderRadius: '30px',
                            padding: '10px 20px', fontSize: '14px', fontWeight: '600',
                            cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {deletingReviewId === myReview.id ? '⏳ Deleting...' : '🗑️ Delete My Review'}
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                    <p style={{ color: '#6b7280', marginBottom: '12px', fontSize: '14px' }}>
                      Please log in to leave a review.
                    </p>
                    <button
                      onClick={() => navigate('/login')}
                      style={{ backgroundColor: '#c24438', color: '#fff', border: 'none', borderRadius: '30px', padding: '9px 24px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    >
                      Log In to Review
                    </button>
                  </div>
                )}
              </div>

              {/* ── Review List ───────────────────────────────────── */}
              <div className="list-header" style={{ marginBottom: '16px' }}>
                <h4 style={{color: '#c24438'}}>
                  {reviews.length === 0 ? 'No reviews yet' : `${reviews.length} Review${reviews.length !== 1 ? 's' : ''}`}
                </h4>
              </div>

              {loadingReviews ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '14px' }}>
                  Be the first to review this product!
                </div>
              ) : (
                reviews.slice(0, visibleReviews).map(rev => {
                  const avatarSrc = rev.user_avatar && (rev.user_avatar.startsWith('http') || rev.user_avatar.startsWith('data:') || rev.user_avatar.startsWith('/uploads/'))
                    ? rev.user_avatar
                    : `https://i.pravatar.cc/100?u=${rev.user_id}`;

                  return (
                    <div key={rev.id} className="single-review" style={{ position: 'relative' }}>
                      <img src={avatarSrc} alt="user" className="user-avatar-img"
                        onError={e => { e.target.src = `https://i.pravatar.cc/100?u=${rev.user_id}`; }}
                      />
                      <div className="review-content" style={{ flex: 1 }}>
                        <div className="review-top-line">
                          <h5>{rev.user_name}</h5>
                          <div className="mini-stars">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</div>
                          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#9ca3af' }}>
                            {new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        {rev.comment && <p className="review-text">{rev.comment}</p>}
                        {/* Admin delete any review */}
                        {user?.role === 'admin' && user.id !== rev.user_id && (
                          <button
                            onClick={() => handleDeleteReview(rev.id)}
                            disabled={deletingReviewId === rev.id}
                            style={{
                              marginTop: '6px', fontSize: '12px', color: '#ef4444',
                              background: 'none', border: 'none', cursor: 'pointer', padding: '0'
                            }}
                          >
                            {deletingReviewId === rev.id ? '⏳ Deleting...' : '🗑️ Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {visibleReviews < reviews.length && (
                <button className="btn-more-red" onClick={() => setVisibleReviews(prev => prev + 4)}>
                  Show More Reviews ↓
                </button>
              )}
            </div>

          ) : (

            <div className="sample-request-area">
              <h4 style={{ color: '#c24438', marginBottom: '8px' }}>Request a Product Sample</h4>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>Interested in testing this product before placing a bulk order? Send a sample request to the supplier.</p>
              {sampleSuccess && (
                <div style={{
                  padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                  backgroundColor: sampleSuccess.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                  color: sampleSuccess.startsWith('✅') ? '#15803d' : '#b91c1c',
                  border: `1px solid ${sampleSuccess.startsWith('✅') ? '#86efac' : '#fca5a5'}`,
                  fontSize: '14px'
                }}>
                  {sampleSuccess}
                </div>
              )}
              {isLoggedIn ? (
                <form onSubmit={handleSampleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>Product</label>
                    <input type="text" value={product?.name} disabled style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#6b7280', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Message to Supplier <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(Optional)</span>
                    </label>
                    <textarea
                      placeholder="Describe what you'd like to test, your use case, or any specific requirements..."
                      value={sampleMessage}
                      onChange={e => setSampleMessage(e.target.value)}
                      rows={4}
                      disabled={sampleSubmitting}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sampleSubmitting}
                    style={{ backgroundColor: '#c24438', color: '#fff', border: 'none', borderRadius: '30px', padding: '12px 35px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', opacity: sampleSubmitting ? 0.7 : 1, alignSelf: 'flex-start' }}
                  >
                    {sampleSubmitting ? 'Submitting...' : '📦 Submit Sample Request'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
                  <p style={{ color: '#6b7280', marginBottom: '15px' }}>Please log in to request a sample.</p>
                  <button onClick={() => navigate('/login')} style={{ backgroundColor: '#c24438', color: '#fff', border: 'none', borderRadius: '30px', padding: '10px 25px', cursor: 'pointer', fontWeight: 'bold' }}>Log In</button>
                </div>
              )}
            </div>

          )}
        </div>
      </div>
      
    </div>
  );
}