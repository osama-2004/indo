import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Boxes, Tags } from 'lucide-react'; 
import { useFavorites, useCart } from '../App'; 
import { productsAPI } from '../api/products';
import './Services.css';

const categoriesList = ['Textile', 'Raw Material', 'Furniture', 'Electronic & Spare Parts', 'Industrial suppliers', 'Food & Beverage Suppliers'];

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [currentQuery, setCurrentQuery] = useState(searchParams.get('search') || '');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceMax, setPriceMax] = useState(50000); 
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('Recommended');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  
  const productsPerPage = 9; 

  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchFromAPI = async () => {
      setLoading(true);
      try {
        const filters = {
          search: currentQuery,
          category: selectedCategories.length > 0 ? selectedCategories.join(',') : '',
          maxPrice: priceMax,
          minRating
        };
        const data = await productsAPI.getProducts(filters);
        setAllProducts(data);
      } catch (error) {
        console.error("Failed fetching products from server:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFromAPI();
  }, [currentQuery, selectedCategories, priceMax, minRating]);

  useEffect(() => {
    const queryFromUrl = searchParams.get('search') || '';
    setCurrentQuery(queryFromUrl);
    setCurrentPage(1); 
    
    if (queryFromUrl.trim() !== '') {
      setSelectedCategories([]);
    }
  }, [searchParams]);

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceMax(50000); 
    setMinRating(0);
    setSort('Recommended');
    setCurrentPage(1);
    setCurrentQuery('');
    setSearchParams({});
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

  const filteredAndSorted = useMemo(() => {
    // API already filtered them. We just sort client-side.
    return [...allProducts].sort((a, b) => {
      if (sort === 'Price: Low to High') return a.price - b.price;
      if (sort === 'Newest') return b.id - a.id;
      return 0;
    });
  }, [allProducts, sort]);

  const totalPages = Math.ceil(filteredAndSorted.length / productsPerPage);

  const currentProducts = useMemo(() => {
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    return filteredAndSorted.slice(indexOfFirstProduct, indexOfLastProduct);
  }, [filteredAndSorted, currentPage, productsPerPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    const element = document.getElementById("products-grid-start");
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="services-page-container">
      
      {/* ==========================================
          1. HERO SECTION
          ========================================== */}
      <section className="services-hero-section-new">
        <div className="container services-hero-flex">
          
          <div className="services-hero-text">
            <h1 className="services-hero-title">
              Discover trusted products from <br />
              <span className="highlight-verified">verified</span> suppliers
            </h1>
            <div className="services-hero-btns">
              <a href="#products-grid-start" className="services-btn-red">Shop Now</a>
              <a href="#products-grid-start" className="services-btn-outline">Read more</a>
            </div>
          </div>

          <div className="services-hero-graphic">
            <div className="services-shape-wrapper">
              <div className="services-abstract-line line-1"></div>
              <div className="services-abstract-line line-2"></div>
              <img 
                src={`${import.meta.env.BASE_URL}hero_men_warehouse.png`} 
                alt="Verified Products Layout" 
                className="services-display-img" 
                onError={(e)=>{e.target.src='https://placehold.co/600x400/f3f4f6/64748b?text=IndusConnect'}}
              />
            </div>
          </div>

        </div>
      </section>

      {/* ==========================================
          2. MAIN CONTENT LAYOUT SECTION
          ========================================== */}
      <div className="services-content-layout container" id="products-grid-start">
        
        {/* Sidebar Filter Controls */}
        <aside className="filter-sidebar">
          <div className="filter-header-row">
            <h2 className="filter-title">Filter Options</h2>
            <button className="clear-link" onClick={clearFilters}>Clear all</button>
          </div>
          
          {/* Category Filter */}
          <div className="filter-section-v2">
            <h4>By Categories</h4>
            <div className="checkbox-list">
              {categoriesList.map(cat => (
                <label key={cat} className="custom-check">
                  <input 
                    type="checkbox" 
                    checked={selectedCategories.includes(cat)} 
                    onChange={() => {
                        setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
                        setCurrentPage(1); 
                    }} 
                  />
                  <span className="box"></span> {cat}
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="filter-section-v2">
            <h4>Price Range</h4>
            <p className="price-label">Up to: {Number(priceMax).toLocaleString()} EGP</p>
            <input 
              type="range" min="10" max="50000" step="50" value={priceMax} 
              onChange={(e) => {
                  setPriceMax(Number(e.target.value));
                  setCurrentPage(1);
              }} 
              className="price-range-input" 
            />
          </div>

          {/* Star Rating Filter */}
          <div className="filter-section-v2">
            <h4>Rating</h4>
            {[5, 4, 3, 2, 1].map(star => (
              <label key={star} className="custom-check star-row">
                <input 
                  type="checkbox" 
                  checked={minRating === star} 
                  onChange={() => { 
                    setMinRating(prev => prev === star ? 0 : star); 
                    setCurrentPage(1); 
                  }} 
                />
                <span className="box"></span>
                <span className="stars-gold">{'★'.repeat(star)}{'☆'.repeat(5-star)}</span>
              </label>
            ))}
          </div>
        </aside>

        {/* ==========================================
            3. PRODUCTS DISPLAY MAIN AREA
            ========================================== */}
        <main className="products-main-area">
          
          {/* Top Utilities Bar */}
          <div className="top-bar-new">
            <Link to="/rfq" className="rfq-system-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>RFQ System</Link>
            <div className="sort-dropdown-new">
              <span>Sort By :</span>
              <select value={sort} onChange={(e) => { setSort(e.target.value); setCurrentPage(1); }}>
                <option value="Recommended">Recommended</option>
                <option value="Newest">Newest</option>
                <option value="Price: Low to High">Price: Low to High</option>
              </select>
            </div>
          </div>

          {/* Search Feedback Header */}
          {currentQuery && <p className="search-results-feedback">Showing results for: "<strong>{currentQuery}</strong>"</p>}

          {/* Products Dynamic Grid */}
          <div className="modern-products-grid">
            {loading ? (
              <div style={{ colSpan: '3', textAlign: 'center', padding: '100px 0', width: '100%', gridColumn: 'span 3', color: '#6b7280', fontSize: '18px', fontWeight: '500' }}>
                Loading products from server...
              </div>
            ) : currentProducts.map(product => {
              const imageSrc = product.image.startsWith('data:') || product.image.startsWith('http') || product.image.startsWith('/uploads/')
                ? (product.image.startsWith('/uploads/') ? `${product.image}` : product.image)
                : `${import.meta.env.BASE_URL}${product.image.replace(/^\//, '')}`;
                
              const isFav = isFavorite(product.id);
              
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
                      onError={(e) => { e.target.src = 'https://placehold.co/300x300/e2e8f0/64748b?text=No+Image'; }}
                    />
                    
                    <div className="img-overlay-actions inline-icons">
                      <button 
                        className={`circle-icon fav-icon-btn ${isFav ? 'is-fav' : ''}`} 
                        onClick={(e) => {
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          toggleFavorite(product);
                        }} 
                      >
                        {isFav ? '❤️' : '♡'}
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
                    <span className="cat-tag">{product.category}</span>
                    <h3 className="prod-name">{product.name}</h3>
                    <p className="prod-desc">{product.description || 'No description available.'}</p>
                    
                    <div className="view-stats">
                      <span className="eye-icon">👁</span> 
                      <span>{product.viewed_count || product.viewedCount || '10+'} viewed in past week</span>
                    </div>

                    <div className="rating-row">
                      <span className="star-icon">⭐</span>
                      <span className="rating-val">{product.rating}</span>
                      <span className="reviews-count">({product.reviews})</span>
                    </div>

                    {/* 🛠️ التصميم الجديد لأسفل الكارت مطابق للصورة */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '15px', marginTop: '15px' }}>
                      
                      {/* MOQ */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Boxes size={26} color="#c24438" strokeWidth={1.5} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', color: '#4b5563', marginBottom: '2px' }}>MOQ</span>
                          <span style={{ fontSize: '16px', fontWeight: '800', color: '#1f2937' }}>{product.moq}</span>
                        </div>
                      </div>

                      {/* Vertical Divider */}
                      <div style={{ height: '35px', width: '1px', backgroundColor: '#1f2937', opacity: '0.2' }}></div>

                      {/* Unit Price */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Tags size={26} color="#c24438" strokeWidth={1.5} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', color: '#4b5563', marginBottom: '2px' }}>Unit Price</span>
                          <span style={{ fontSize: '16px', fontWeight: '800', color: '#1f2937' }}>{product.unit_price || product.unitPrice || `${Number(product.price).toLocaleString()} EGP`}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Fallback UI */}
            {!loading && currentProducts.length === 0 && (
              <div className="no-products-found" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '60px 0' }}>
                <p>No products match your search or filter criteria.</p>
                <button className="clear-link" onClick={clearFilters}>Reset Filters</button>
              </div>
            )}
          </div>

          {/* ==========================================
              4. PAGINATION NAVIGATION CONTROLS
              ========================================== */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                disabled={currentPage === 1} 
                onClick={() => handlePageChange(currentPage - 1)}
                className="page-btn"
              >
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, index) => (
                <button 
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`page-btn ${currentPage === index + 1 ? 'active' : ''}`}
                >
                  {index + 1}
                </button>
              ))}

              <button 
                disabled={currentPage === totalPages} 
                onClick={() => handlePageChange(currentPage + 1)}
                className="page-btn"
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}