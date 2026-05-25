import { useState } from 'react'
import { client } from '../api/client'
import './Complaint.css'

export default function Complaint() {
  const [form, setForm] = useState({
    name: '', email: '', type: '', description: '', file: null
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await client.post('/api/complaints', {
        name: form.name,
        email: form.email,
        type: form.type,
        description: form.description
      });
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="complaint-container">
        <div className="complaint-success-view">
          <div className="success-check">✅</div>
          <h2>Complaint Submitted Successfully!</h2>
          <p>We will review your issue and get back to you within 24-48 hours.</p>
          <button className="main-submit-btn" onClick={() => { setForm({ name: '', email: '', type: '', description: '', file: null }); setSubmitted(false); }}>Submit Another</button>
        </div>
      </div>
    )
  }

  return (
    <div className="complaint-container">
      
      <div className="complaint-title-area">
        <span className="complaint-main-icon">📝</span>
        <h1 className="complaint-header-text">Add Complaint</h1>
      </div>

      <form className="complaint-form-style" onSubmit={handleSubmit}>
        
        {error && (
          <div style={{ color: '#EF4444', backgroundColor: '#FEE2E2', padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div className="complaint-row">
          <div className="input-block">
            <label>Your Name</label>
            <input 
              type="text" 
              placeholder="Enter your name" 
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              disabled={submitting}
              required 
            />
          </div>
          <div className="input-block">
            <label>Email</label>
            <input 
              type="email" 
              placeholder="name@gmail.com" 
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              disabled={submitting}
              required 
            />
          </div>
        </div>

        <div className="input-block full-width">
          <label>Complaint Type</label>
          <select 
            value={form.type} 
            onChange={e => setForm({...form, type: e.target.value})}
            disabled={submitting}
            required
          >
            <option value="">Select an issue</option>
            <option>Payment Issue</option>
            <option>Product Quality</option>
            <option>Delivery Problem</option>
          </select>
        </div>

        <div className="input-block full-width">
          <label>Complaint Details</label>
          <textarea 
            rows="6" 
            placeholder="Describe your issue in details ..."
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            disabled={submitting}
            required
          ></textarea>
        </div>

        <div className="input-block full-width">
          <label>Upload File <span className="optional-text">(Optional)</span></label>
          <div className="file-custom-upload">
            <input 
              type="file" 
              id="file-input" 
              disabled={submitting}
              onChange={e => setForm({...form, file: e.target.files[0]})} 
            />
            <label htmlFor="file-input" className="file-btn-label">choose file</label>
            <span className="file-name-display">
              {form.file ? form.file.name : 'No file chosen'}
            </span>
          </div>
        </div>

        <div className="submit-wrapper">
          <button type="submit" className="main-submit-btn" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </div>
      </form>

      <div className="bottom-info-cards">
        <div className="info-item-card">
          <span className="info-icon">🛡️</span>
          <div className="info-text">
            <strong>Privacy Protected</strong>
            <p>Your information is safe with us.</p>
          </div>
        </div>
        <div className="info-item-card">
          <span className="info-icon">⏰</span>
          <div className="info-text">
            <strong>Response Time</strong>
            <p>We usually reply within 24-48 hours.</p>
          </div>
        </div>
        <div className="info-item-card">
          <span className="info-icon">🎧</span>
          <div className="info-text">
            <strong>Need Help?</strong>
            <p>Contact our support team anytime.</p>
          </div>
        </div>
      </div>
    </div>
  )
}