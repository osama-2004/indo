import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import './Auth.css'
import logo from '../assets/logo.svg';

export default function SignUp() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'Buyer', terms: false })
  const [showPassword, setShowPassword] = useState(false) 
  const [showTerms, setShowTerms] = useState(false) 
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialModal, setSocialModal] = useState({ isOpen: false, provider: '', name: 'Osama Korashy', email: 'osama@gmail.com', role: 'Buyer' });
  const [socialLoading, setSocialLoading] = useState(false);
  const navigate = useNavigate()
  const { signup, socialLogin } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if(!form.terms) return alert("Please accept the terms")
    
    setError('')
    setLoading(true)

    try {
      const lowerRole = form.role.toLowerCase(); // 'buyer' or 'supplier'
      const name = form.username; // Default name to username for form simplicity

      const res = await signup({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: lowerRole,
        name
      });

      // Auto-route based on roles
      if (res.user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (res.user.role === 'supplier') {
        navigate('/supplier', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
      role: form.role // Use the currently selected role from the form
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
      setError(err.message || 'Social registration failed.');
      setSocialModal({ ...socialModal, isOpen: false });
    } finally {
      setSocialLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="auth-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="auth-card">
        
        {/* ==========================================
            1. REGISTRATION FORM SELECTION SECTION
            ========================================== */}
        <div className="auth-form-section">
          <div className="brand-logo">
            <img src={logo} alt="Logo" />
          </div>

          <h1 className="welcome-text">Create an account</h1>

          <form onSubmit={handleSubmit} className="login-form">
            
            {error && (
              <div style={{ color: '#EF4444', backgroundColor: '#FEE2E2', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {/* Username Entry view */}
            <div className="input-group">
              <input
                type="text"
                placeholder="Username"
                className="input-field"
                value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
                required
                disabled={loading}
              />
            </div>
            
            {/* Email Registration entry field */}
            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                className="input-field"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                required
                disabled={loading}
              />
            </div>

            {/* Password Input Group control triggers */}
            <div className="input-group" style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="input-field"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                required
                disabled={loading}
              />
              <span className="eye-icon" onClick={togglePasswordVisibility} style={{ cursor: 'pointer', position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
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

            {/* Account Role Privilege Selectors - Modified to Checkboxes */}
            <div className="role-container" style={{ display: 'flex', gap: '20px', margin: '15px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.role === 'Buyer'} onChange={() => setForm({...form, role: 'Buyer'})} disabled={loading} /> 
                <span>Buyer</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.role === 'Supplier'} onChange={() => setForm({...form, role: 'Supplier'})} disabled={loading} /> 
                <span>Supplier</span>
              </label>
            </div>

            {/* Legal terms Acceptance inputs - Reverted to Original */}
            <div className="terms-container">
              <input 
                type="checkbox" 
                checked={form.terms} 
                onChange={e => setForm({...form, terms: e.target.checked})}
                id="terms"
                disabled={loading}
              />
              <label htmlFor="terms">
                I agree to <span className="terms-link" onClick={() => setShowTerms(true)}>Terms & Privacy Policy</span>
              </label>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          {/* Social login option interfaces separator */}
          <div className="divider">
            <span>or continue with</span>
          </div>

          {/* Federated Identity Provider anchors - Colors adjusted */}
          <div className="social-login" style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
            <button type="button" className="social-btn" onClick={() => handleOpenSocial('Google')} style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '50%', padding: '10px', cursor: 'pointer' }}>
              <img src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png" alt="Google" style={{ width: '20px' }} />
            </button>
            <button type="button" className="social-btn" onClick={() => handleOpenSocial('Apple')} style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '50%', padding: '10px', cursor: 'pointer' }}>
              <img src="https://cdn-icons-png.flaticon.com/512/0/747.png" alt="Apple" style={{ width: '20px' }} />
            </button>
            <button type="button" className="social-btn" onClick={() => handleOpenSocial('Facebook')} style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '50%', padding: '10px', cursor: 'pointer' }}>
              <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook" style={{ width: '20px' }} />
            </button>
          </div>

          {/* Alternative login routing viewport links */}
          <div className="auth-footer">
            Already have an account? <Link to="/login" className="login-link-red">Login</Link>
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
          3. LEGAL MODAL COMPONENT WINDOW OVERLAY - Reverted to Original
          ========================================== */}
      {showTerms && (
        <div className="modal-overlay">
          <div className="terms-modal">
            <button type="button" className="close-modal" onClick={() => setShowTerms(false)}>&times;</button>
            <h2>Terms & Privacy Policy</h2>
            
            <div className="modal-content">
              <h3>Terms</h3>
              <p>By using IndusConnect, you agree to use the platform responsibly and provide accurate information. The platform connects buyer, suppliers and manufacturers but is not responsible for transactions between users. We may apply a commission on completed deals. We reserve the right to suspend any account that violates our policies.</p>
              
              <h3>Privacy Policy</h3>
              <p>We collect basic user information such as name, email and business details to improve our services. Your data is kept secure and will not be shared with third parties without your consent, except when required to operate the platform. By using IndusConnect, you agree to our data practices.</p>
            </div>

            <button type="button" className="accept-btn" onClick={() => { setForm({...form, terms: true}); setShowTerms(false); }}>
              Accept
            </button>
          </div>
        </div>
      )}

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
              <h2 style={{ fontSize: '20px', margin: '5px 0' }}>Register with {socialModal.provider}</h2>
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
                {socialLoading ? 'Creating Account...' : `Register with ${socialModal.provider}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}