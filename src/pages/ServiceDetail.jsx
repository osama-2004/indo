import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFavorites, useCart, useAuth } from '../App'; 
import { productsAPI } from '../api/products';
import { samplesAPI } from '../api/samples';
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

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCart } = useCart();
  const { user, isLoggedIn } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reviews');
  const [qty, setQty] = useState(1); 
  const [visibleReviews, setVisibleReviews] = useState(3);

  // Sample request state
  const [sampleMessage, setSampleMessage] = useState('');
  const [sampleSubmitting, setSampleSubmitting] = useState(false);
  const [sampleSuccess, setSampleSuccess] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const data = await productsAPI.getProduct(id);
        setProduct(data);
      } catch (err) {
        console.error("Error loading product detail from server:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const isFav = product ? isFavorite(product.id) : false;

  const reviewsData = [
    { id: 1, name: 'Laila Hassan', stars: 4, text: 'Excellent quality, exactly as described.', img: 'https://i.pravatar.cc/100?u=1' },
    { id: 2, name: 'Nour Yehia', stars: 3, text: 'Durable and perfect for our projects.', img: 'https://i.pravatar.cc/100?u=2' },
    { id: 3, name: 'Zain Adam', stars: 5, text: 'Meet all our specifications, highly recommended.', img: 'https://i.pravatar.cc/100?u=3' },
    { id: 4, name: 'Omar Ali', stars: 5, text: 'Fantastic piece of art!', img: 'https://i.pravatar.cc/100?u=4' },
  ];

  const handleAddToCart = async () => {
    if (!product) return;
    // MOQ enforcement
    const moqNum = parseInt((product.moq || '1').toString().replace(/\D/g, '')) || 1;
    if (qty < moqNum) {
      alert(`Minimum order quantity (MOQ) for this product is ${moqNum} units. Please increase your quantity.`);
      setQty(moqNum);
      return;
    }
    try {
      await addToCart(product, qty);
      alert(`🛒 Added ${qty}x ${product.name} to your cart successfully!`);
      navigate('/cart');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSampleRequest = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert('Please log in to request a sample.');
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

  const scrollToReviews = () => {
    setActiveTab('reviews');
    document.getElementById('tabs-section')?.scrollIntoView({ behavior: 'smooth' });
  };

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
        
        {/* Left Column Aspect Frame: Dynamic Product Media Viewport Wrapper */}
        <div className="image-column">
          <div className="main-image-holder" style={{cursor: 'pointer', position: 'relative'}}>
            <button 
              className={`heart-icon-btn ${isFav ? 'active-fav' : ''}`}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                zIndex: 10,
                color: isFav ? '#c24438' : '#999',
                border: 'none',
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(product);
              }}
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

        {/* Right Column Aspect Frame: Commercial Typography & Specifications */}
        <div className="info-column">
          <nav className="category-path">{product.category}</nav>
          <h1 className="main-product-title">{product.name}</h1>
          
          <StarRating rating={product.rating || 5} totalReviews={product.reviews || 0} />
          
          <div className="price-display">EGP {Number(product.price).toLocaleString()}</div>

          {/* Context Block: Main Description Statement Container */}
          <section className="description-block">
            <h3>What is it ?</h3>
            <p>{product.description || 'Premium industrial grade product listed on IndusConnect.'}</p>
          </section>

          {/* Context Block: Technical/Commercial Advantages Enumeration Bullet List */}
          <section className="special-block">
            <h3>Why is it special ?</h3>
            <ul>
              <li>Eco-friendly</li>
              <li>Customizable</li>
              <li>Trendy & Functional</li>
            </ul>
          </section>

          {/* Action Row Component: Dynamic Order Controllers */}
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
          SECTION 2: SELLER METRICS & AUTHENTICATION BADGING STRIP BANNER
          ====================================================================== */}
      <div className="seller-info-strip">
        <div className="seller-profile" onClick={scrollToReviews} style={{cursor: 'pointer'}}>
          <div className="avatar-circle">👤</div>
          <p>Sold by <strong style={{textDecoration: 'underline'}}>{product.supplier_name || 'IndusConnect Official'}</strong></p>
          <span className="rating-tag">⭐ 4.8 ({reviewsData.length} Reviews)</span>
        </div>
      </div>

      {/* ======================================================================
          SECTION 3: LEGAL TRUST ASSURANCE BADGES CONTEXTUAL Bannered GRID
          ====================================================================== */}
      <div className="trust-badges-grid">
        <div className="badge-item"><span>🚚</span><p>Fast Shipping</p></div>
        <div className="badge-item"><span>💰</span><p>Cash on Delivery</p></div>
        <div className="badge-item"><span>🏅</span><p>100% Premium quality</p></div>
        <div className="badge-item"><span>🛡️</span><p>Payment Protection</p></div>
      </div>

      {/* ======================================================================
          SECTION 4: INTERACTIVE TAB PANELS HOUSING USER REVIEW PANELS & DEALS MOCK SAMPLES
          ====================================================================== */}
      <div className="tabs-system" id="tabs-section">
        {/* Navigation header controls for managing contextual switch renders */}
        <div className="tabs-nav">
          <button className={activeTab === 'reviews' ? 'tab-link active' : 'tab-link'} onClick={() => setActiveTab('reviews')}>Reviews</button>
          <button className={activeTab === 'sample' ? 'tab-link active' : 'tab-link'} onClick={() => setActiveTab('sample')}>Sample Request</button>
        </div>

        {/* Tab content wrapper running conditional processing loops */}
        <div className="tab-body">
          {activeTab === 'reviews' ? (
            
            /* Sub-Panel Content Block Module: Client Feedback Lists Viewport */
            <div className="reviews-list-area">
              <div className="list-header">
                <h4 style={{color: '#c24438'}}>Review List</h4>
                <select className="sort-box"><option>Sort By: Newest</option></select>
              </div>

              {/* Dynamic rendering looping through current active arrays */}
              {reviewsData.slice(0, visibleReviews).map(rev => (
                <div key={rev.id} className="single-review">
                  <img src={rev.img} alt="user" className="user-avatar-img" />
                  <div className="review-content">
                    <div className="review-top-line">
                      <h5>{rev.name}</h5>
                      <div className="mini-stars">{'★'.repeat(rev.stars)}{'☆'.repeat(5-rev.stars)}</div>
                    </div>
                    <p className="review-text">{rev.text}</p>
                  </div>
                </div>
              ))}
              
              {/* Incremental visual truncation load more pagination buttons trigger */}
              {visibleReviews < reviewsData.length && (
                <button className="btn-more-red" onClick={() => setVisibleReviews(prev => prev + 2)}>More Reviews ↓</button>
              )}
            </div>
          ) : (
            
            /* Sub-Panel Content Block Module: Corporate Sample Request forms panel fallback */
            <div className="sample-request-area">
              <h4 style={{ color: '#c24438', marginBottom: '8px' }}>Request a Product Sample</h4>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>Interested in testing this product before placing a bulk order? Send a sample request to the supplier.</p>
              {sampleSuccess && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', backgroundColor: sampleSuccess.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: sampleSuccess.startsWith('✅') ? '#15803d' : '#b91c1c', border: `1px solid ${sampleSuccess.startsWith('✅') ? '#86efac' : '#fca5a5'}`, fontSize: '14px' }}>
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
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>Message to Supplier <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(Optional)</span></label>
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