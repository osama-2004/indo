import { createContext, useContext, useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { authAPI } from './api/auth'
import { cartAPI } from './api/cart'
import { favoritesAPI } from './api/favorites'

// Pages import
import { Navbar } from './components/Navbar' 
import { ForgotPassword } from './pages/ForgotPassword' 
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Services from './pages/Services'
import ServiceDetail from './pages/ServiceDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import RFQ from './pages/RFQ'
import Complaint from './pages/Complaint'
import AdminDashboard from './pages/AdminDashboard'
import SupplierDashboard from './pages/SupplierDashboard' 
import Profile from './pages/Profile'
import Favorites from './pages/Favorites'

// ==========================================
// 0. TOAST GLOBAL CONTEXT
// ==========================================
const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="custom-toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`custom-toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ==========================================
// 1. AUTH GLOBAL CONTEXT
// ==========================================
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('indus_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('indus_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isLoggedIn = !!token;

  useEffect(() => {
    const syncAuth = () => {
      setToken(localStorage.getItem('indus_token') || null);
      try {
        const stored = localStorage.getItem('indus_user');
        setUser(stored ? JSON.parse(stored) : null);
      } catch {
        setUser(null);
      }
    };

    window.addEventListener('authChanged', syncAuth);
    return () => window.removeEventListener('authChanged', syncAuth);
  }, []);

  const login = async (username, password) => {
    return await authAPI.login(username, password);
  };

  const signup = async (userData) => {
    return await authAPI.register(userData);
  };

  const socialLogin = async (socialData) => {
    return await authAPI.socialLogin(socialData);
  };

  const logout = () => {
    authAPI.logout();
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const freshUser = await authAPI.getProfile();
        localStorage.setItem('indus_user', JSON.stringify(freshUser));
        setUser(freshUser);
      } catch (err) {
        console.error('Failed to refresh user profile:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn, login, signup, socialLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// ==========================================
// 2. FAVORITES GLOBAL CONTEXT PROVIDER
// ==========================================
const FavoritesContext = createContext();

export function FavoritesProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [favorites, setFavorites] = useState([]);

  // Fetch favorites from API when user logs in
  useEffect(() => {
    const fetchFavorites = async () => {
      if (isLoggedIn) {
        try {
          const list = await favoritesAPI.getFavorites();
          setFavorites(list.map(p => p.id));
        } catch (err) {
          console.error('Error fetching favorites:', err);
        }
      } else {
        // Retrieve from localStorage if anonymous
        try {
          const saved = localStorage.getItem('indus_favorites');
          setFavorites(saved ? JSON.parse(saved) : []);
        } catch {
          setFavorites([]);
        }
      }
    };

    fetchFavorites();
    window.addEventListener('authChanged', fetchFavorites);
    return () => window.removeEventListener('authChanged', fetchFavorites);
  }, [isLoggedIn]);

  const toggleFavorite = async (product) => {
    const productId = product.id;
    if (isLoggedIn) {
      try {
        const res = await favoritesAPI.toggleFavorite(productId);
        if (res.isFavorite) {
          setFavorites(prev => [...prev, productId]);
        } else {
          setFavorites(prev => prev.filter(id => id !== productId));
        }
      } catch (err) {
        console.error('Error toggling favorite on server:', err);
      }
    } else {
      // Offline/Local Storage toggle
      setFavorites(prev => {
        const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
        localStorage.setItem('indus_favorites', JSON.stringify(next));
        return next;
      });
    }
  };

  const isFavorite = (productId) => favorites.includes(productId);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}

// ==========================================
// 3. SHOPPING CART GLOBAL CONTEXT PROVIDER
// ==========================================
const CartContext = createContext();

export function CartProvider({ children }) {
  const { isLoggedIn } = useAuth();
  const [cart, setCart] = useState([]);
  const { showToast } = useToast();

  const fetchCart = async () => {
    if (isLoggedIn) {
      try {
        const items = await cartAPI.getCart();
        setCart(items);
      } catch (err) {
        console.error('Error fetching cart:', err);
      }
    } else {
      // Anonymous local storage
      try {
        const savedCart = localStorage.getItem('indus_cart') || localStorage.getItem('cart');
        setCart(savedCart ? JSON.parse(savedCart) : []);
      } catch {
        setCart([]);
      }
    }
  };

  useEffect(() => {
    fetchCart();
    window.addEventListener('authChanged', fetchCart);
    window.addEventListener('cartUpdated', fetchCart);
    return () => {
      window.removeEventListener('authChanged', fetchCart);
      window.removeEventListener('cartUpdated', fetchCart);
    };
  }, [isLoggedIn]);

  const addToCart = async (product, quantity = 1) => {
    if (isLoggedIn) {
      try {
        const updatedItems = await cartAPI.addToCart(product.id, quantity);
        setCart(updatedItems);
        showToast(`🛒 Added ${quantity}x ${product.name} to cart!`, 'success');
      } catch (err) {
        console.error('Error adding to cart on server:', err);
        showToast('❌ Failed to add item to cart', 'error');
      }
    } else {
      setCart(prevCart => {
        const existingItem = prevCart.find(item => item.id === product.id);
        let nextCart;
        if (existingItem) {
          nextCart = prevCart.map(item => 
            item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
          );
        } else {
          nextCart = [...prevCart, { ...product, quantity }];
        }
        localStorage.setItem('indus_cart', JSON.stringify(nextCart));
        localStorage.setItem('cart', JSON.stringify(nextCart));
        return nextCart;
      });
      showToast(`🛒 Added ${quantity}x ${product.name} to cart!`, 'success');
    }
  };

  const removeFromCart = async (productId) => {
    if (isLoggedIn) {
      try {
        const updatedItems = await cartAPI.removeCartItem(productId);
        setCart(updatedItems);
      } catch (err) {
        console.error('Error removing from cart on server:', err);
      }
    } else {
      setCart(prevCart => {
        const nextCart = prevCart.filter(item => item.id !== productId);
        localStorage.setItem('indus_cart', JSON.stringify(nextCart));
        localStorage.setItem('cart', JSON.stringify(nextCart));
        return nextCart;
      });
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    if (isLoggedIn) {
      try {
        const updatedItems = await cartAPI.updateCartItem(productId, newQuantity);
        setCart(updatedItems);
      } catch (err) {
        console.error('Error updating quantity on server:', err);
      }
    } else {
      setCart(prevCart => {
        const nextCart = prevCart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item);
        localStorage.setItem('indus_cart', JSON.stringify(nextCart));
        localStorage.setItem('cart', JSON.stringify(nextCart));
        return nextCart;
      });
    }
  };

  const clearCart = async () => {
    if (isLoggedIn) {
      try {
        await cartAPI.clearCart();
        setCart([]);
      } catch (err) {
        console.error('Error clearing cart on server:', err);
      }
    } else {
      setCart([]);
      localStorage.removeItem('indus_cart');
      localStorage.removeItem('cart');
    }
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

// ==========================================
// 4. ROLE PROTECTED ROUTE COMPONENTS
// ==========================================
function AdminProtectedRoute({ children }) {
  const { user, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F4F4F5' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '380px', textAlign: 'center' }}>
          <h2 style={{ color: '#EF4444', marginBottom: '10px', fontSize: '24px' }}>Access Denied</h2>
          <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '25px' }}>Only Administrators are authorized to view this page.</p>
          <button onClick={() => window.location.href = '#/home'} style={{ padding: '12px 24px', backgroundColor: '#C24133', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return children;
}

function SupplierProtectedRoute({ children }) {
  const { user, isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'supplier' && user?.role !== 'admin') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F4F4F5' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '380px', textAlign: 'center' }}>
          <h2 style={{ color: '#EF4444', marginBottom: '10px', fontSize: '24px' }}>Access Denied</h2>
          <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '25px' }}>Only Suppliers are authorized to view this page.</p>
          <button onClick={() => window.location.href = '#/home'} style={{ padding: '12px 24px', backgroundColor: '#C24133', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return children;
}

// ==========================================
// 5. MAIN APP ROOT COMPONENT WITH ROUTING
// ==========================================
function App() {
  const { isLoggedIn } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Dashboard Routes */}
        <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/supplier" element={<SupplierProtectedRoute><SupplierDashboard /></SupplierProtectedRoute>} />
        
        <Route path="/*" element={
          <div className="app-layout">
            <Navbar />
            <main>
              <Routes>
                <Route path="/home" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/:id" element={<ServiceDetail />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/cart" element={<Cart />} />
                
                <Route 
                  path="/checkout" 
                  element={isLoggedIn ? <Checkout /> : <Navigate to="/login" replace />} 
                />
                
                <Route path="/rfq" element={<RFQ />} />
                <Route path="/complaint" element={<Complaint />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        } />
      </Routes>
    </HashRouter>
  )
}

export default function Root() {
  return (
    <AuthProvider>
      <ToastProvider>
        <FavoritesProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </FavoritesProvider>
      </ToastProvider>
    </AuthProvider>
  );
}