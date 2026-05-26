import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../api/auth'
import './Auth.css' 
import logoImg from '../assets/logo.svg' 

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(''); 
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timer, setTimer] = useState(59);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const otpRefs = useRef([]);

  useEffect(() => {
    let interval;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Step 1: Send OTP to email
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.forgotPassword(email.trim());
      setSuccessMsg(res.message || 'OTP sent!');
      // In dev mode, auto-fill OTP if server returns it
      if (res.devOtp) {
        const otpDigits = res.devOtp.toString().split('').slice(0, 6);
        setOtp(otpDigits);
        console.log('🔑 Dev OTP auto-filled:', res.devOtp);
      }
      setStep('otp');
      setTimer(59);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (element, index) => {
    const value = element.value.replace(/[^0-9]/g, ''); 
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (element.nextSibling && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      if (index > 0) {
        otpRefs.current[index - 1].focus();
      }
    }
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp.every(slot => slot !== '')) return;
    setLoading(true);
    setError('');
    try {
      const otpCode = otp.join('');
      await authAPI.verifyOTP(email, otpCode);
      setStep('new-password');
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const otpCode = otp.join('');
      await authAPI.resetPassword(email, otpCode, password);
      setSuccessMsg('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.forgotPassword(email.trim());
      if (res.devOtp) {
        const otpDigits = res.devOtp.toString().split('').slice(0, 6);
        setOtp(otpDigits);
      }
      setTimer(59);
      setSuccessMsg('New OTP sent!');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return { text: 'Weak', class: 'weak' };
    if (password.length < 6) return { text: 'Weak', class: 'weak' };
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { text: 'Strong', class: 'strong' };
    }
    return { text: 'Medium', class: 'medium' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="reset-page-wrapper">
      
      <div className="reset-logo-area">
        <img src={logoImg} alt="IndusConnect" onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=IndusConnect'} />
      </div>

      <div className="reset-header-text">
        <h2>Reset Your Password</h2>
        <p>Enter the OTP sent to your email to reset your password.</p>
      </div>

      {error && (
        <div style={{ maxWidth: '420px', margin: '0 auto 15px', padding: '10px 16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '14px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ maxWidth: '420px', margin: '0 auto 15px', padding: '10px 16px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#15803d', fontSize: '14px', textAlign: 'center' }}>
          {successMsg}
        </div>
      )}

      <div className="reset-cards-layout">
        
        {step === 'email' && (
          <div className="reset-card">
            <div className="card-title-row">
              <div className="icon-badge email-icon-badge">✉️</div>
              <div>
                <h3>Find Your Account</h3>
                <p>Please enter your email address to search for your account.</p>
              </div>
            </div>
            <form onSubmit={handleEmailSubmit} className="reset-form-box">
              <div className="reset-input-group">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <button type="submit" className="reset-action-btn" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Continue'}
              </button>
            </form>
          </div>
        )}

        {step === 'otp' && (
          <div className="reset-card">
            <div className="card-title-row">
              <div className="icon-badge email-icon-badge">✉️</div>
              <div>
                <h3>Verify Your Email</h3>
                <p>Enter the 6-digit OTP code we sent to <span className="highlight-email">{email}</span></p>
              </div>
            </div>

            <form onSubmit={handleOtpSubmit} className="reset-form-box">
              <div className="otp-inputs-row">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    value={data}
                    ref={(el) => (otpRefs.current[index] = el)}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    disabled={loading}
                  />
                ))}
              </div>

              <div className="resend-code-text">
                Didn't receive the code? {' '}
                {timer > 0 ? (
                  <span className="timer-countdown">Resend code (00:{timer < 10 ? `0${timer}` : timer})</span>
                ) : (
                  <button type="button" className="resend-link-btn" onClick={handleResendOtp} disabled={loading}>
                    Resend code
                  </button>
                )}
              </div>

              <button type="submit" className="reset-action-btn" disabled={otp.some(slot => slot === '') || loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          </div>
        )}

        {step === 'new-password' && (
          <div className="reset-card">
            <div className="card-title-row">
              <div className="icon-badge lock-icon-badge">🔒</div>
              <div>
                <h3>Create New Password</h3>
                <p>Your new password must be different from previously used passwords.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="reset-form-box">
              <div className="reset-input-group" style={{ position: 'relative' }}>
                <label>New Password</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter new password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <span 
                  onClick={() => setShowPassword(!showPassword)} 
                  style={{ position: 'absolute', right: '15px', top: '38px', fontSize: '0.85rem', color: '#6b7280', cursor: 'pointer', fontWeight: '500', userSelect: 'none' }}
                >
                  {showPassword ? "Hide" : "Show"}
                </span>
              </div>

              <div className="strength-bar-wrapper">
                <div className={`bar-segment ${password.length >= 1 ? strength.class : ''}`}></div>
                <div className={`bar-segment ${password.length >= 4 && strength.class !== 'weak' ? strength.class : ''}`}></div>
                <div className={`bar-segment ${password.length >= 7 && strength.class === 'strong' ? strength.class : ''}`}></div>
              </div>
              <span className={`strength-label-text ${strength.class}`}>Password strength: {strength.text}</span>

              <div className="reset-input-group" style={{ marginTop: '20px', position: 'relative' }}>
                <label>Confirm New Password</label>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="Re-enter new password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <span 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                  style={{ position: 'absolute', right: '15px', top: '38px', fontSize: '0.85rem', color: '#6b7280', cursor: 'pointer', fontWeight: '500', userSelect: 'none' }}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </span>
              </div>

              <button type="submit" className="reset-action-btn" style={{ marginTop: '30px' }} disabled={loading}>
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>

              <div className="reset-footer-links">
                Remember your password? <Link to="/login">Back to login</Link>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}