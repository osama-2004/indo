import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, useAuth } from '../App';
import './Navbar.css';
import logo from '../assets/logo.svg';

const DashboardIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)
const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const HeartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)
const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const CartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)
const MenuIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  
  const { cart } = useCart();
  const { user, isLoggedIn, logout } = useAuth();

  const topSearches = ["Package", "Textile", "Lighting", "Industrial suppliers", "Manufacture", "Ready to produce", "Raw Materials"];

  const performSearch = (term) => {
    const finalTerm = term || searchQuery;
    if (finalTerm.trim()) {
      navigate(`/services?search=${encodeURIComponent(finalTerm.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
      setMenuOpen(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch();
  };

  const closeMenu = () => setMenuOpen(false);

  const handleSignOut = () => {
    logout();
    closeMenu();
    navigate('/login');
  };

  const totalCartCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  return (
    <>
      <header className="navbar transparent-nav">
        <div className="navbar-inner">
          
          <div className="nav-left">
            <button className="nav-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
              <MenuIcon />
            </button>

            <Link to="/" className="nav-logo" onClick={closeMenu}>
              <img src={logo} alt="IndusConnect" />
            </Link>
          </div>

          <div className="nav-right">
            
            {isLoggedIn && user?.role === 'admin' && (
              <Link to="/admin" className="nav-icon-btn admin-icon" title="Admin Dashboard">
                <DashboardIcon />
              </Link>
            )}

            {isLoggedIn && user?.role === 'supplier' && (
              <Link to="/supplier" className="nav-icon-btn admin-icon" title="Supplier Dashboard">
                <DashboardIcon />
              </Link>
            )}
            
            <button className="nav-icon-btn" onClick={() => setSearchOpen(true)} title="Search">
              <SearchIcon />
            </button>
            
            <Link to="/favorites" className="nav-icon-btn" title="Favorites">
              <HeartIcon />
            </Link>

            <Link to="/profile" className="nav-icon-btn" title="Profile">
              <UserIcon />
            </Link>

            <Link to="/cart" className="nav-icon-btn nav-cart-btn" title="Cart">
              <CartIcon />
              {totalCartCount > 0 && <span className="cart-badge">{totalCartCount}</span>}
            </Link>
          </div>

        </div>

        {/* Side Mobile Menu */}
        {menuOpen && (
          <div className="nav-mobile-menu">
            <nav>
              <Link to="/" onClick={closeMenu}>Home</Link>
              <Link to="/services" onClick={closeMenu}>Products Catalog</Link>
              <Link to="/favorites" onClick={closeMenu}>My Wishlist ❤️</Link>
              <Link to="/rfq" onClick={closeMenu}>RFQ Panel</Link>
              <Link to="/complaint" onClick={closeMenu}>Add Complaint</Link>
              
              {isLoggedIn ? (
                <>
                  <div className="nav-divider" style={{ height: '1px', backgroundColor: '#eee', margin: '10px 0' }}></div>
                  <span style={{ padding: '8px 25px', fontSize: '13px', color: '#999', textTransform: 'capitalize' }}>Logged in as: {user.username} ({user.role})</span>
                  {user.role === 'admin' && <Link to="/admin" onClick={closeMenu}>Admin Dashboard 🛠️</Link>}
                  {user.role === 'supplier' && <Link to="/supplier" onClick={closeMenu}>Supplier Dashboard 📦</Link>}
                  <Link to="/profile" onClick={closeMenu}>My Account Profile 👤</Link>
                  <a href="#/login" onClick={handleSignOut} style={{ color: '#EF4444' }}>Sign Out 🚪</a>
                </>
              ) : (
                <>
                  <div className="nav-divider" style={{ height: '1px', backgroundColor: '#eee', margin: '10px 0' }}></div>
                  <Link to="/login" onClick={closeMenu}>Log In</Link>
                  <Link to="/signup" onClick={closeMenu}>Sign Up</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Search Modal overlay */}
      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-modal" onClick={e => e.stopPropagation()}>
            <button className="close-search-btn" onClick={() => setSearchOpen(false)}>
              <XIcon />
            </button>
            
            <form className="modal-search-box" onSubmit={handleSearchSubmit}>
              <SearchIcon />
              <input
                type="text"
                placeholder="What are you looking for ?"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </form>

            <div className="top-searches">
              <h3>Top Searches</h3>
              <div className="tags-grid">
                {topSearches.map((tag, i) => (
                  <button 
                    key={i} 
                    className="tag-item"
                    onClick={() => performSearch(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}