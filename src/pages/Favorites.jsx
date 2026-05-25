import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites, useCart } from '../App'; 
import { favoritesAPI } from '../api/favorites';
import './favorites.css'; 

const getSafeImageSrc = (imagePath) => {
  if (!imagePath) return 'https://placehold.co/300x300/e2e8f0/64748b?text=No+Image';
  if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('/uploads/')) return imagePath;

  const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
    ? import.meta.env.BASE_URL 
    : `${import.meta.env.BASE_URL}/`;
    
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  
  return `${baseUrl}${cleanPath}`;
};

export default function Favorites() {
  const { toggleFavorite } = useFavorites();
  const { addToCart } = useCart();

  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const data = await favoritesAPI.getFavorites();
      setFavoriteProducts(data);
    } catch (error) {
      console.error("Failed fetching wishlist from server:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleFavorite(product);
      // Wait a moment then reload list
      setTimeout(fetchFavorites, 100);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addToCart(product, 1);
      alert(`🛒 ${product.name} added to cart!`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="favorites-page-container">
      <div className="favorites-container">
        
        <div className="favorites-header">
          <div>
            <h1>My Wishlist</h1>
            <p>You have saved {favoriteProducts.length} items</p>
          </div>
          <Link to="/services" className="favorites-btn">Back to Shop</Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '18px' }}>Loading wishlist items...</div>
        ) : favoriteProducts.length === 0 ? (
          <div className="favorites-empty-state">
            <div className="favorites-empty-icon">❤️</div>
            <h3>Your Wishlist is Empty</h3>
            <p>Tap the heart icon on products to save them here.</p>
            <Link to="/services" className="favorites-btn favorites-btn-accent">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="modern-products-grid">
            {favoriteProducts.map(product => {
              const imageSrc = getSafeImageSrc(product.image);
              
              return (
                <Link 
                  to={`/services/${product.id}`} 
                  className="b2b-product-card" 
                  key={product.id} 
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="card-img-container">
                    <img 
                      src={imageSrc} 
                      alt={product.name} 
                      onError={(e) => { e.target.src = 'https://placehold.co/300x300/e2e8f0/64748b?text=Image+Not+Found'; }}
                    />
                    
                    <div className="img-overlay-actions inline-icons" style={{ opacity: 1 }}>
                      <button 
                        className="circle-icon fav-icon-btn" 
                        onClick={(e) => handleRemoveFavorite(e, product)} 
                      >
                        ❤️
                      </button>

                      <button 
                        className="circle-icon cart-icon-btn" 
                        onClick={(e) => handleAddToCart(e, product)} 
                      >
                        🛒
                      </button>
                    </div>
                  </div>

                  <div className="card-info-v2">
                    <span className="cat-tag">{product.category || 'Product'}</span>
                    <h3 className="prod-name">{product.name}</h3>
                    <p className="prod-desc">{product.description || 'No description available.'}</p>
                    
                    <div className="rating-row">
                      <span className="star-icon">⭐</span>
                      <span className="rating-val">{product.rating || 'N/A'}</span>
                    </div>

                    <div className="card-separator"></div>

                    <div className="card-b2b-footer">
                      <div className="footer-item">
                        <div className="footer-icon">📦</div>
                        <div className="footer-text">
                          <div className="label">MOQ</div>
                          <div className="value">{product.moq || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="footer-divider"></div>
                      <div className="footer-item">
                        <div className="footer-icon red-tag">🏷️</div>
                        <div className="footer-text">
                          <div className="label">Unit Price</div>
                          <div className="value">{product.unit_price || product.unitPrice || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}