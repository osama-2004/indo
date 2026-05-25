import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import './Auth.css'
import logo from '../assets/logo.svg';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialModal, setSocialModal] = useState({ isOpen: false, provider: '', name: 'Osama Korashy', email: 'osama@gmail.com', role: 'Buyer' });
  const [socialLoading, setSocialLoading] = useState(false);
  const navigate = useNavigate()
  const { login, socialLogin } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const usernameInput = form.username.trim();
    const passwordInput = form.password;

    try {
      const res = await login(usernameInput, passwordInput);
      
      // Auto-route based on roles
      if (res.user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (res.user.role === 'supplier') {
        navigate('/supplier', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenSocial = (provider) => {
    setSocialModal({
      isOpen: true,
      provider,
      name: provider === 'Google' ? 'Osama Korashy' : provider === 'Facebook' ? 'Osama FB' : 'Osama Apple',
      email: provider === 'Google' ? 'osama@gmail.com' : provider === 'Facebook' ? 'osama.fb@facebook.com' : 'osama@apple.id',
      role: 'Buyer'
    });
  };

  const handleSocialSubmit = async (e) => {
    e.preventDefault();
    setSocialLoading(true);
    setError('');
    try {
      const res = await socialLogin({
        email: socialModal.email.trim(),
        name: socialModal.name.trim(),
        provider: socialModal.provider.toLowerCase(),
        role: socialModal.role.toLowerCase()
      });
      setSocialModal({ ...socialModal, isOpen: false });
      
      // Auto-route based on roles
      if (res.user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (res.user.role === 'supplier') {
        navigate('/supplier', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Social login failed.');
      setSocialModal({ ...socialModal, isOpen: false });
    } finally {
      setSocialLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        {/* ==========================================
            1. AUTHENTICATION FORM CONTROLS PANEL
            ========================================== */}
        <div className="auth-form-section">
          <div className="brand-logo">
            <img src={logo} alt="Logo" />
          </div>

          <h1 className="welcome-text">Welcome back!</h1>

          <form onSubmit={handleSubmit} className="login-form">
            
            {error && (
              <div style={{ color: '#EF4444', backgroundColor: '#FEE2E2', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {/* Username Input Field */}
            <div className="input-group">
              <input
                type="text"
                placeholder="Username or Email"
                className="input-field"
                value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
                required
                disabled={loading}
              />
            </div>
            
            {/* Password Input Field with Interactive Visibility Toggles */}
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="input-field"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                required
                disabled={loading}
              />
              <span className="eye-icon" onClick={togglePasswordVisibility} style={{ cursor: 'pointer' }}>
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                )}
              </span>
            </div>

            {/* Remember Me checkbox and Forgotten Account Link triggers */}
            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" /> 
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password">Forget password ?</Link>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <Link to="/signup" className="signup-link">Sign Up</Link>
          </form>

          {/* Graphical Divider Line */}
          <div className="divider">
            <span>or continue with</span>
          </div>

          {/* Social Authentication Access Points */}
          <div className="social-login">
            <button type="button" className="social-btn" onClick={() => handleOpenSocial('Google')}>
              <img src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png" alt="Google" />
            </button>
            <button type="button" className="social-btn" onClick={() => handleOpenSocial('Apple')}>
              <img src="https://cdn-icons-png.flaticon.com/512/0/747.png" alt="Apple" />
            </button>
            <button type="button" className="social-btn" onClick={() => handleOpenSocial('Facebook')}>
              <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook" />
            </button>
          </div>
        </div>

        {/* ==========================================
            2. DECORATIVE SIDE MEDIA PRESENTATION PANEL
            ========================================== */}
        <div className="auth-image-section">
          <div className="image-wrapper">
            <img src={`${import.meta.env.BASE_URL}hero_men_warehouse.png`} alt="Business warehouse" onError={(e)=>{e.target.src='https://placehold.co/400x600/f3f4f6/64748b?text=IndusConnect'}} />
          </div>
        </div>

      </div>

      {/* ==========================================
          MOCK SOCIAL AUTH MODAL
          ========================================== */}
      {socialModal.isOpen && (
        <div className="modal-overlay">
          <div className="terms-modal social-modal-card">
            <button type="button" className="close-modal" onClick={() => setSocialModal({ ...socialModal, isOpen: false })}>&times;</button>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img 
                src={
                  socialModal.provider === 'Google' ? 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' :
                  socialModal.provider === 'Apple' ? 'https://cdn-icons-png.flaticon.com/512/0/747.png' :
                  'https://cdn-icons-png.flaticon.com/512/124/124010.png'
                } 
                alt={socialModal.provider} 
                style={{ width: '50px', height: '50px', marginBottom: '10px' }} 
              />
              <h2 style={{ fontSize: '20px', margin: '5px 0' }}>Sign in with {socialModal.provider}</h2>
              <p style={{ color: '#6B7280', fontSize: '12px', margin: '0' }}>Simulated OAuth verification for local development</p>
            </div>

            <form onSubmit={handleSocialSubmit}>
              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', display: 'block' }}>Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={socialModal.name} 
                  onChange={e => setSocialModal({ ...socialModal, name: e.target.value })} 
                  required 
                  disabled={socialLoading} 
                />
              </div>

              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', display: 'block' }}>Email Address</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={socialModal.email} 
                  onChange={e => setSocialModal({ ...socialModal, email: e.target.value })} 
                  required 
                  disabled={socialLoading} 
                />
              </div>

              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4B5563', marginBottom: '5px', display: 'block' }}>Select Role</label>
                <div className="role-container" style={{ display: 'flex', gap: '20px', marginTop: '5px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="checkbox" 
                      checked={socialModal.role === 'Buyer'} 
                      onChange={() => setSocialModal({ ...socialModal, role: 'Buyer' })} 
                      disabled={socialLoading} 
                    /> 
                    <span>Buyer</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="checkbox" 
                      checked={socialModal.role === 'Supplier'} 
                      onChange={() => setSocialModal({ ...socialModal, role: 'Supplier' })} 
                      disabled={socialLoading} 
                    /> 
                    <span>Supplier</span>
                  </label>
                </div>
              </div>

              <button type="submit" className="login-btn" style={{ marginTop: '20px' }} disabled={socialLoading}>
                {socialLoading ? 'Verifying account...' : `Continue with ${socialModal.provider}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}