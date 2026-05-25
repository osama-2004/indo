import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

// ==========================================
// DATA ARCHITECTURE: PARTNERS & REVIEWS FALLBACKS
// ==========================================
const partners = [
  { name: 'Bosch', logo: 'logo_industrial_2.png' },
  { name: 'Caterpillar', logo: 'logo_industrial_3.png' },
  { name: 'ABB Group', logo: 'logo_industrial_1.png' },
  { name: 'Honeywell', logo: 'logo_industrial_2.png' },
];

const initialReviews = [
  { id: 1, name: 'Sami Mansour', role: 'Buyer', rating: 4, text: 'I found reliable suppliers much faster than before. The process was smooth and saved me a lot of time.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop' },
  { id: 2, name: 'Nour El-Din', role: 'Supplier', rating: 5, text: 'IndusConnect helped me reach new clients managing deals and communication became much easier.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop' },
  { id: 3, name: 'Omar Khaled', role: 'General Manager', rating: 4, text: 'A practical platform that makes business connections simple and trustworthy. It really simplifies the process.', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop' },
];

// Sub-Component: Star Evaluation Mapping Rendering Engine
const StarRating = ({ rating }) => (
  <div className="star-rating">
    {[...Array(5)].map((_, i) => (
      <span key={i} className={`star ${i < rating ? 'star--filled' : ''}`}>★</span>
    ))}
  </div>
);

// ==========================================
// CORE UI COMPONENT: LANDING HOMEPAGE INTERFACE
// ==========================================
function Home() {
  const [allReviews, setAllReviews] = useState(initialReviews);
  const [showMore, setShowMore] = useState(true);

  const handleMoreReviews = () => {
    const extraReviews = [
      { id: 4, name: 'Laila Ahmed', role: 'Manufacturer', rating: 5, text: 'Excellent platform for scaling production and finding quality raw materials.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop' },
      { id: 5, name: 'Zaid Ali', role: 'Trader', rating: 4, text: 'The networking tools are top-notch. Highly recommended for B2B deals.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop' },
    ];
    setAllReviews([...initialReviews, ...extraReviews]);
    setShowMore(false);
  };

  return (
    <div className="home-container">
      
      {/* ======================================================================
          SECTION 1: HERO LANDING VIEWPORT PRESENTATION (MATCHING TARGET DESIGN)
          ====================================================================== */}
      <section className="hero-section-new">
        <div className="container hero-flex-layout">
          
          {/* Left Anchor Frame: Corporate Typography & Call-To-Actions Buttons */}
          <div className="hero-text-content">
            <h1 className="hero-title-main">
              All Suppliers, Traders &amp; Manufacturers <br /> in One Place.
            </h1>
            <p className="hero-description-text">
              Find the right supplier, get the best price, and manage your orders.
            </p>
            <div className="hero-action-btns">
              <Link to="/services" className="btn-filled-red" style={{ textDecoration: 'none' }}>Shop Now</Link>
              <a href="#our-story" className="btn-outline-dark" style={{ textDecoration: 'none' }}>Read more</a>
            </div>
          </div>

          {/* Right Anchor Frame: Abstract Overlaid Circle Rings Graphic Illustration */}
          <div className="hero-graphic-display">
            <div className="image-and-shape-wrapper">
              {/* Overlaid Vectorized Outline Border Ring */}
              <div className="red-outline-shape"></div>
              {/* 🛠️ CRITICAL IMAGE ROUTE FIXED USING BASE_URL CONFIGURATIONS FOR GITHUB PAGES */}
              <img 
                src={`${import.meta.env.BASE_URL}hero_men_warehouse.png`} 
                alt="Boxes and Order Checklist Presentation Layout" 
                className="hero-main-image" 
                onError={(e) => { e.target.src = 'https://via.placeholder.com/500?text=IndusConnect+Hero'; }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================================
          SECTION 2: CORPORATE PROFILE PRESENTATION MODULE (OUR STORY)
          ====================================================================== */}
      <section className="story-section" id="our-story">
        <div className="container story-flex">
          <div className="story-img-box">
            {/* 🛠️ Dynamic Base URL safe pathways for secondary visuals rendering */}
            <img 
              src={`${import.meta.env.BASE_URL}story_handshake.png`} 
              alt="IndusConnect Corporate Partnership Trust Handshake" 
              onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=IndusConnect+Story'; }}
            />
          </div>
          <div className="story-content">
            <h2>Our Story</h2>
            <p>IndusConnect is a B2B platform connecting startups, manufacturers, suppliers, and traders in one trusted network.</p>
          </div>
        </div>
      </section>
      

      {/* ======================================================================
          SECTION 3: FEATURES AND BENEFITS PRESENTATION MODULE (UPDATED UI)
          ====================================================================== */}
          <section className="features-section" style={{ padding: '80px 0', backgroundColor: '#fff', fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', width: '90%' }}>
                <h2 className="section-header" style={{ textAlign: 'center', marginBottom: '60px', fontSize: '28px', color: '#1e293b', fontWeight: '800' }}>
                  What we Have
                </h2>
    
              <div className="features-grid" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  gap: '30px', 
                  flexWrap: 'wrap',
                  textAlign: 'center' 
                }}>
      
                {/* 1. Verified (Hand Holding Heart) */}
              <div className="feature-item" style={{ flex: '1', minWidth: '220px' }}>
                <svg width="46" height="46" viewBox="0 0 512 512" fill="#c24438" style={{ marginBottom: '20px', marginInline: 'auto' }}>
                  <path d="M312 32c-13.3 0-26.1 3-37.5 8.5L256 49l-18.5-8.5C226.1 35 213.3 32 200 32c-44.2 0-80 35.8-80 80c0 40.5 48.7 85.5 136 142.1h.2H256h.2c87.3-56.5 136-101.5 136-142.1c0-44.2-35.8-80-80-80zM86.8 288c-18.8 0-35.7 10.7-43.6 27.6L24.9 354.2c-5.9 12.6-2.5 27.5 8.2 36.3l119 97c11.1 9 25 14.1 39.5 14.5l112.5 3.5c15 .5 29.5-4 41.5-12.8L448 408c16.3-11.9 20-34.8 8.1-51.1l-25.5-35c-11.9-16.3-34.8-20-51.1-8.1l-66.2 48.4c-4.4 3.2-10.4 4.5-15.6 3.4L208.6 347.1l111-46.6c13.7-5.7 22.4-19.4 22.4-34.4v-4c0-22.1-17.9-40-40-40H86.8z"/>
                </svg>
                <p style={{ fontWeight: '500', color: '#374151', fontSize: '15px', lineHeight: '1.5', maxWidth: '240px', marginInline: 'auto' }}>
                  Verified businesses and transparent transactions
                </p>
              </div>

              {/* 2. Speed (Dashboard/Speedometer) */}
            <div className="feature-item" style={{ flex: '1', minWidth: '220px' }}>
                <svg width="46" height="46" viewBox="0 0 512 512" fill="#c24438" style={{ marginBottom: '20px', marginInline: 'auto' }}>
                  <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256s256-114.6 256-256S397.4 0 256 0zm0 464c-114.7 0-208-93.3-208-208S141.3 48 256 48s208 93.3 208 208s-93.3 208-208 208zm88.8-261.2l-64.8 82.5c-4.4 5.6-11.9 7.8-18.4 5.4c-6.5-2.4-10.7-8.6-10.7-15.5V192c0-8.8 7.2-16 16-16s16 7.2 16 16v56.7l50.4-64.2c5.4-6.9 15.2-8.1 22.1-2.7c6.9 5.4 8.1 15.2 2.7 22.1c-1.1 1.4-2.5 2.6-4 3.5l-9.3 5.4z"/>
                </svg>
                <p style={{ fontWeight: '500', color: '#374151', fontSize: '15px', lineHeight: '1.5', maxWidth: '240px', marginInline: 'auto' }}>
                  Find the right partner in minutes, not weeks
                </p>
            </div>

              {/* 3. Smart (Solid Lightbulb) */}
            <div className="feature-item" style={{ flex: '1', minWidth: '220px' }}> 
                <svg width="34" height="46" viewBox="0 0 384 512" fill="#c24438" style={{ marginBottom: '20px', marginInline: 'auto' }}>
                  <path d="M192 0C86 0 0 86 0 192c0 60.4 29.2 113.3 73.6 147.2C85 348 96 364.5 96 384h192c0-19.5 11-36 22.4-44.8C354.8 305.3 384 252.4 384 192 384 86 298 0 192 0zM128 416v32c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32v-32H128z"/>
                </svg>
                <p style={{ fontWeight: '500', color: '#374151', fontSize: '15px', lineHeight: '1.5', maxWidth: '240px', marginInline: 'auto' }}>
                  Smart connections tailored to your business needs
                </p>
            </div>

              {/* 4. Partners (Solid Team/Users) */}
            <div className="feature-item" style={{ flex: '1', minWidth: '220px' }}>
                <svg width="58" height="46" viewBox="0 0 640 512" fill="#c24438" style={{ marginBottom: '20px', marginInline: 'auto' }}>
                  <path d="M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM609.3 512H471.4c5.4-9.4 8.6-20.3 8.6-32v-8c0-60.7-27.1-115.2-69.8-151.8c2.4-.1 4.7-.2 7.1-.2h61.4C567.8 320 640 392.2 640 480.6c0 17.3-14 31.4-30.7 31.4zM432 256a96 96 0 1 0 0-192 96 96 0 1 0 0 192z"/>
                </svg>
                <p style={{ fontWeight: '500', color: '#374151', fontSize: '15px', lineHeight: '1.5', maxWidth: '240px', marginInline: 'auto' }}>
                  Build partnerships that scale with you
                </p>
            </div>

            </div>
           </div>
         </section>

      {/* ======================================================================
          SECTION 4: METRICS TRACKING AND REPUTATION METRICS STRIP BANNER
          ====================================================================== */}
      <section className="trust-section">
        <h2 className="section-header">Built on Trust</h2>
        <div className="trust-stats-bar">
          <div className="container stats-flex">
            <div className="stat-unit"><h3>3 k +</h3><p>Buyers</p></div>
            <div className="stat-unit"><h3>11 k +</h3><p>Suppliers</p></div>
            <div className="stat-unit"><h3>20 k +</h3><p>Manufacture</p></div>
            <div className="stat-unit"><h3>500 +</h3><p>Startups</p></div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION 5: CUSTOMER SATISFACTION EVALUATION FEEDS (CLIENT FEEDBACKS)
          ====================================================================== */}
      <section className="clients-section">
        <div className="container">
          <h2 className="section-header">Satisfied Clients Speaks</h2>
          <div className="clients-grid">
            {allReviews.map((rev) => (
              <div key={rev.id} className="split-review-card">
                <div className="rev-side-profile">
                  <img src={rev.avatar} alt={rev.name} className="client-avatar" />
                  <p className="rev-name">{rev.name}</p>
                  <StarRating rating={rev.rating} />
                </div>
                <div className="rev-content-bubble">
                  <span className="quote-mark">“</span>
                  <h4 className="rev-role">{rev.role}</h4>
                  <p className="rev-text">{rev.text}</p>
                </div>
              </div>
            ))}
          </div>
          {showMore && (
            <div className="more-rev-wrapper">
              <button className="btn-more-reviews" onClick={handleMoreReviews}>More Reviews ↓</button>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================================
          SECTION 6: INTEGRATED VENDOR COLLABORATION LOGOTYPES FEED MARQUEE
          ====================================================================== */}
      <section className="partners-section">
        <div className="container partners-main-container">
          <h2 className="section-header">Collaboration and Partners</h2>
          <div className="partners-logos">
            {partners.map((partner, index) => {
              // 🛠️ Asset parsing injection layout pipeline mapping
              const partnerImgSrc = `${import.meta.env.BASE_URL}${partner.logo}`;
              return (
                <div key={index} className="partner-logo-item">
                  <img 
                    src={partnerImgSrc} 
                    alt={partner.name} 
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/120x40?text=Partner'; }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}

export default Home;