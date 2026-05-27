import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFavorites, useCart, useAuth } from '../App'; 
import { authAPI } from '../api/auth';
import { favoritesAPI } from '../api/favorites';
import { ordersAPI } from '../api/orders';
import { samplesAPI } from '../api/samples';
import './Profile.css'

export default function Profile() {
  const [activeTab, setActiveTab] = useState('wishlist');
  const navigate = useNavigate();
  const fileInputRef = useRef(null); 
  
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCart } = useCart(); 
  const { user, logout, refreshUser } = useAuth();

  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedUser, setEditedUser] = useState({ name: '', email: '', phone: '' });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setEditedUser({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  // Load wishlist
  const loadWishlist = async () => {
    setLoadingWishlist(true);
    try {
      const data = await favoritesAPI.getFavorites();
      setWishlistProducts(data);
    } catch (err) {
      console.error('Failed loading wishlist:', err);
    } finally {
      setLoadingWishlist(false);
    }
  };

  // Load orders
  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await ordersAPI.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed loading orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load samples
  const loadSamples = async () => {
    setLoadingSamples(true);
    try {
      const data = await samplesAPI.getSamples();
      setSamples(data);
    } catch (err) {
      console.error('Failed loading samples:', err);
    } finally {
      setLoadingSamples(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wishlist') {
      loadWishlist();
    } else if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'samples') {
      loadSamples();
    }
  }, [activeTab]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await authAPI.uploadAvatar(file);
      await refreshUser();
      alert('Avatar uploaded successfully!');
    } catch (err) {
      alert('Error uploading avatar: ' + err.message);
    }
  };

  const handleSaveProfile = async () => {
    setUpdatingProfile(true);
    try {
      await authAPI.updateProfile({
        name: editedUser.name,
        email: editedUser.email,
        phone: editedUser.phone
      });
      await refreshUser();
      setIsEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    const moqNum = parseInt((product.moq || '1').toString().replace(/\D/g, '')) || 1;
    try {
      await addToCart(product, moqNum);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavoriteWishlist = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleFavorite(product);
      // Reload wishlist immediately after toggle
      setTimeout(loadWishlist, 100);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '15px' }}>
        <h2>Session expired. Please log in first.</h2>
        <button onClick={() => navigate('/login')} style={{ padding: '10px 20px', backgroundColor: '#C24133', color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold' }}>Log In</button>
      </div>
    );
  }

  // Avatar path helper
  const avatarSrc = user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:') || user.avatar.startsWith('/uploads/'))
    ? user.avatar
    : 'https://i.pravatar.cc/150?u=' + user.id;

  return (
    <div className="account-container">
      <div className="account-layout">
        
        <aside className="account-sidebar">
          
          <div className="user-info-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px' }}>
            
            <div 
              className="user-avatar-wrapper" 
              style={{ position: 'relative', width: '90px', height: '90px', marginBottom: '15px', cursor: 'pointer' }}
              onClick={() => fileInputRef.current.click()}
              title="Change Profile Picture"
            >
              <img 
                src={avatarSrc} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #E5E7EB' }} 
                onError={(e)=>{e.target.src='https://i.pravatar.cc/150?u=fallback'}}
              />
              <div style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#C24133', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', border: '2px solid #fff' }}>
                📷
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </div>

            {isEditingProfile ? (
              <div className="edit-profile-form" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="text" 
                  value={editedUser.name} 
                  onChange={(e) => setEditedUser({...editedUser, name: e.target.value})} 
                  placeholder="Full Name"
                  disabled={updatingProfile}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', textAlign: 'center', fontSize: '14px' }}
                />
                <input 
                  type="email" 
                  value={editedUser.email} 
                  onChange={(e) => setEditedUser({...editedUser, email: e.target.value})} 
                  placeholder="Email"
                  disabled={updatingProfile}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', textAlign: 'center', fontSize: '14px' }}
                />
                <input 
                  type="text" 
                  value={editedUser.phone} 
                  onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})} 
                  placeholder="Phone"
                  disabled={updatingProfile}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', textAlign: 'center', fontSize: '14px' }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '5px' }}>
                  <button onClick={() => {setIsEditingProfile(false); setEditedUser({ name: user.name, email: user.email, phone: user.phone });}} style={{ padding: '6px 12px', borderRadius: '15px', border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                  <button onClick={handleSaveProfile} disabled={updatingProfile} style={{ padding: '6px 15px', borderRadius: '15px', border: 'none', background: '#C24133', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                    {updatingProfile ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="user-details">
                <h4 style={{ margin: '0 0 5px 0', color: '#111827', textTransform: 'capitalize' }}>{user.name}</h4>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#6B7280' }}>{user.email}</p>
                <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#6B7280' }}>{user.phone || 'No phone number added'}</p>
                <button 
                  onClick={() => {setEditedUser({ name: user.name, email: user.email, phone: user.phone || '' }); setIsEditingProfile(true);}}
                  style={{ backgroundColor: '#F3F4F6', color: '#4B5563', border: 'none', padding: '6px 16px', borderRadius: '15px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✏️ Edit Profile
                </button>
              </div>
            )}
          </div>

          <nav className="sidebar-nav">
            <button 
              className={`nav-item-btn ${activeTab === 'orders' ? 'active' : ''}`} 
              onClick={() => setActiveTab('orders')}
            >
              <span className="icon">🛍️</span> My Orders <span className="arrow">›</span>
            </button>
            
            <button 
              className={`nav-item-btn ${activeTab === 'wishlist' ? 'active' : ''}`} 
              onClick={() => setActiveTab('wishlist')}
            >
              <span className="icon">❤️</span> Wishlist <span className="arrow">›</span>
            </button>
            
            <button 
              className={`nav-item-btn ${activeTab === 'samples' ? 'active' : ''}`} 
              onClick={() => setActiveTab('samples')}
            >
              <span className="icon">📦</span> My Samples <span className="arrow">›</span>
            </button>
            
            <div className="nav-divider"></div>
            
            <button 
              className={`nav-item-btn ${activeTab === 'address' ? 'active' : ''}`} 
              onClick={() => setActiveTab('address')}
            >
              <span className="icon">📍</span> Delivery Address <span className="arrow">›</span>
            </button>
            
            <button 
              className={`nav-item-btn ${activeTab === 'payment' ? 'active' : ''}`} 
              onClick={() => setActiveTab('payment')}
            >
              <span className="icon">💳</span> Payment Methods <span className="arrow">›</span>
            </button>
            
            <button 
              className="nav-item-btn signout-btn" 
              onClick={handleSignOut}
            >
              <span className="icon">🚪</span> Sign Out
            </button>
          </nav>
        </aside>

        <main className="account-main-content">
          
          {activeTab === 'wishlist' && (
            <div className="wishlist-tab-content">
              
              <div className="wishlist-header">
                <h2>Wishlist</h2>
                <div className="wishlist-actions">
                  <button className="action-btn share-btn" onClick={() => alert('Wishlist link copied!')}>
                    <span>🔄</span> Share
                  </button>
                  <button className="action-btn edit-btn" onClick={() => alert('Refresh wishlist...')}>
                    <span>✏️</span> Refresh
                  </button>
                </div>
              </div>

              {loadingWishlist ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '16px' }}>Loading wishlist items...</div>
              ) : wishlistProducts.length === 0 ? (
                <div className="empty-wishlist-state">
                  <div className="emoji-box-icon">
                    <div className="yellow-box">
                      <div className="box-eyes"><span>•</span><span>•</span></div>
                      <div className="box-mouth"></div>
                    </div>
                  </div>
                  <h3>Ready to make a wish?</h3>
                  <p>Start adding items you love to your wishlist by tapping on the heart icon</p>
                  <span className="status-subtext">Status</span>
                </div>
              ) : (
                <div className="wishlist-products-grid">
                  {wishlistProducts.map(product => {
                    const isFav = isFavorite(product.id);
                    
                    const cleanPath = (product.image || '').startsWith('/') ? product.image.substring(1) : product.image;
                    const imageSrc = product.image && (product.image.startsWith('http') || product.image.startsWith('data:') || product.image.startsWith('/uploads/'))
                      ? product.image
                      : `${import.meta.env.BASE_URL || '/'}${cleanPath}`;

                    return (
                      <Link to={`/services/${product.id}`} className="b2b-wish-card" key={product.id}>
                        <div className="wish-img-container">
                          <img 
                            src={imageSrc} 
                            alt={product.name} 
                            onError={(e) => { e.target.src = 'https://placehold.co/300x300/e2e8f0/64748b?text=IndusConnect'; }}
                          />
                          
                          <div className="wish-overlay-buttons">
                            <button 
                              className={`wish-circle-btn ${isFav ? 'active-fav' : ''}`} 
                              onClick={(e) => handleToggleFavoriteWishlist(e, product)}
                            >
                              {isFav ? '❤️' : '♡'}
                            </button>
                            
                            <button 
                              className="wish-circle-btn" 
                              onClick={(e) => handleAddToCart(e, product)}
                            >
                              🛒
                            </button>
                          </div>
                        </div>
                        
                        <div className="wish-card-info">
                          <span className="wish-cat-tag">{product.category}</span>
                          <h3 className="wish-prod-name">{product.name}</h3>
                          <p className="wish-prod-desc">{product.description || 'No description available.'}</p>
                          <div className="wish-prod-meta">
                            <span>👁️ {product.viewed_count || product.viewedCount || '10+'} viewed</span>
                            <span className="wish-rating">⭐ {product.rating || 5} <small>({product.reviews || 0})</small></span>
                          </div>
                        </div>
                        
                        <div className="wish-card-footer">
                          <div className="wish-footer-col">
                            <span className="w-lbl">MOQ</span>
                            <span className="w-val">{product.moq || '10 Unit'}</span>
                          </div>
                          <div className="wish-footer-col w-highlight">
                            <span className="w-lbl">Unit Price</span>
                            <span className="w-val">{product.unit_price || product.unitPrice || `${product.price} EGP`}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {activeTab === 'orders' && (
            <div className="wishlist-tab-content">
              <div className="wishlist-header">
                <h2>My Orders</h2>
              </div>
              
              {loadingOrders ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '16px' }}>Loading order history...</div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: '12px', backgroundColor: '#fff' }}>
                  <h3>You haven't placed any orders yet.</h3>
                  <Link to="/services" className="btn-primary" style={{ display: 'inline-block', marginTop: '15px', textDecoration: 'none' }}>Order Now</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {orders.map(order => (
                    <div key={order.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px', marginBottom: '15px' }}>
                        <div>
                          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Order ID</span>
                          <h4 style={{ margin: '2px 0 0 0', color: '#c24438' }}>#{order.id}</h4>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Placed On</span>
                          <h5 style={{ margin: '2px 0 0 0', color: '#374151' }}>{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h5>
                        </div>
                        <div>
                          <span style={{ fontSize: '13px', color: '#9ca3af', display: 'block', textAlign: 'right' }}>Status</span>
                          <span className={`status-badge ${order.status.toLowerCase().replace(' ', '-')}`} style={{ display: 'inline-block', marginTop: '2px' }}>{order.status}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                        {order.items?.map((item, index) => {
                          const itemImg = item.image && (item.image.startsWith('http') || item.image.startsWith('data:') || item.image.startsWith('/uploads/'))
                            ? item.image
                            : `${import.meta.env.BASE_URL || '/'}${item.image || ''}`;

                          return (
                            <div key={index} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                              <img src={itemImg} alt={item.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }} onError={(e)=>{e.target.src='https://placehold.co/50x50/e2e8f0/64748b?text=Img'}} />
                              <div style={{ flex: 1 }}>
                                <h5 style={{ margin: '0 0 3px 0', color: '#1f2937' }}>{item.name}</h5>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>EGP {item.price.toLocaleString()} × {item.quantity}</span>
                              </div>
                              <div style={{ fontWeight: 'bold', color: '#111827' }}>
                                EGP {(item.price * item.quantity).toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: '12px', fontSize: '14px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Shipping Address: </span>
                          <strong style={{ color: '#374151' }}>{order.address}</strong>
                        </div>
                        <div style={{ fontWeight: '800', fontSize: '16px', color: '#111827' }}>
                          Total: <span style={{ color: '#c24438' }}>EGP {order.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="wishlist-tab-content">
              <div className="wishlist-header">
                <h2>My Sample Requests</h2>
              </div>
              {loadingSamples ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '16px' }}>Loading sample requests...</div>
              ) : samples.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: '12px', backgroundColor: '#fff' }}>
                  <h3>No sample requests yet.</h3>
                  <p style={{ fontSize: '14px', marginBottom: '15px' }}>Browse products and click "Sample Request" to request a free sample.</p>
                  <Link to="/services" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>Browse Products</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {samples.map(sample => (
                    <div key={sample.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                      <div style={{ width: '55px', height: '55px', borderRadius: '10px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>📦</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '16px' }}>{sample.product_name}</h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Submitted: {new Date(sample.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: sample.status === 'approved' ? '#dcfce7' : sample.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                            color: sample.status === 'approved' ? '#15803d' : sample.status === 'rejected' ? '#b91c1c' : '#92400e'
                          }}>
                            {sample.status === 'approved' ? '✓ Approved' : sample.status === 'rejected' ? '✗ Rejected' : '⏳ Pending Review'}
                          </span>
                        </div>
                        {sample.message && (
                          <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#6b7280', backgroundColor: '#f9fafb', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #d1d5db' }}>
                            "{sample.message}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'address' && (
            <div className="wishlist-tab-content">
              <div className="wishlist-header">
                <h2>Delivery Address</h2>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '25px', backgroundColor: '#fff' }}>
                <span style={{ fontSize: '24px' }}>📍</span>
                <h4 style={{ marginTop: '10px', color: '#111827' }}>Primary Address</h4>
                <p style={{ color: '#4B5563', fontSize: '14px' }}>{user.phone ? 'Cairo, Giza, Egypt' : 'No primary address saved. Add one during checkout.'}</p>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="wishlist-tab-content">
              <div className="wishlist-header">
                <h2>Payment Methods</h2>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '25px', backgroundColor: '#fff' }}>
                <span style={{ fontSize: '24px' }}>💳</span>
                <h4 style={{ marginTop: '10px', color: '#111827' }}>Cash on Delivery (Default)</h4>
                <p style={{ color: '#4B5563', fontSize: '14px' }}>You have not linked any cards yet.</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}