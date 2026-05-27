import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, useAuth } from '../App';
import { ordersAPI } from '../api/orders';
import './Checkout.css';
const VisaLogo = () => (
  <svg viewBox="0 0 36 24" width="36" height="24" className="payment-svg-logo visa" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <rect width="36" height="24" rx="4" fill="#1434CB"/>
    <path d="M12.5 16h1.8l1.1-7h-1.8l-1.1 7zm5.5-7h-1.7c-.5 0-.9.3-1.1.8l-2.7 6.2h1.9l.4-1h2.3l.2 1h1.7l-1-7zm-2.8 4.7l.8-2.2.5 2.2h-1.3zm8.3-7h-1.8l-1.1 4.7-.8-4c-.2-.7-.7-.7-1.3-.7h-2l-.1.4c.8.2 1.6.5 2.1.8l1.6 5.8h1.9l2.8-7zm4.3 0h-1.5c-.5 0-.8.3-.8.8l-.2.9c.4.2.8.3 1.3.5.8.3 1 .5 1 .8 0 .4-.5.6-.9.6-.6 0-1-.1-1.5-.3l-.2-.1-.2 1.3c.4.2 1.1.3 1.8.3 1.6 0 2.6-.8 2.6-2 0-1-.6-1.5-1.9-2.1-.6-.3-1-.6-1-1 0-.3.4-.6 1.2-.6.5 0 .8.1 1.2.2l.2.1.2-1.3z" fill="#FFF"/>
  </svg>
);

const MastercardLogo = () => (
  <svg viewBox="0 0 36 24" width="36" height="24" className="payment-svg-logo mastercard" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <rect width="36" height="24" rx="4" fill="#0A0A0A"/>
    <circle cx="15.5" cy="12" r="7" fill="#EB001B"/>
    <circle cx="20.5" cy="12" r="7" fill="#F79E1B" opacity="0.85"/>
    <path d="M18 12a6.97 6.97 0 0 1 2.5-5.38 6.97 6.97 0 0 1-2.5 10.76A6.97 6.97 0 0 1 18 12z" fill="#FF5F00"/>
  </svg>
);

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  // ── Step control ────────────────────────────────
  const [step, setStep] = useState('details');

  // 1. Receivers list — initialized from logged-in user
  const [receivers, setReceivers] = useState(() => {
    const defaultName = user?.name || 'Receiver';
    const defaultPhone = user?.phone || '';
    return [{ id: 'default_user', name: defaultName, phone: defaultPhone }];
  });
  const [selectedReceiver, setSelectedReceiver] = useState('default_user');

  // 2. Add receiver state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // 3. Edit receiver state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [address, setAddress] = useState('');
  const [deliveryInstruction, setDeliveryInstruction] = useState('call');

  // ── Card form state ─────────────────────────────
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardError, setCardError] = useState('');

  // ── InstaPay state ──────────────────────────────
  const [instaPayConfirmed, setInstaPayConfirmed] = useState(false);
  const [instaRef, setInstaRef] = useState('');

  const subtotal = cart.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  const shipping = cart.length > 0 ? 50 : 0;
  const tax = Math.round(subtotal * 0.14 * 100) / 100;
  const total = subtotal + shipping + tax;

  // ── Receiver helpers ────────────────────────────
  const handleAddNewReceiver = () => {
    if (newName.trim() && newPhone.trim()) {
      const newId = 'user_' + Date.now();
      setReceivers([...receivers, { id: newId, name: newName, phone: newPhone }]);
      setSelectedReceiver(newId);
      setShowAddForm(false);
      setNewName('');
      setNewPhone('');
    }
  };

  const startEditing = (e, rec) => {
    e.stopPropagation();
    setEditingId(rec.id);
    setEditName(rec.name);
    setEditPhone(rec.phone);
    setShowAddForm(false);
  };

  const saveEdit = (e) => {
    e.stopPropagation();
    if (editName.trim() && editPhone.trim()) {
      setReceivers(receivers.map(r => r.id === editingId ? { ...r, name: editName, phone: editPhone } : r));
      setEditingId(null);
    }
  };

  const cancelEdit = (e) => { e.stopPropagation(); setEditingId(null); };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    const updated = receivers.filter(r => r.id !== id);
    setReceivers(updated);
    if (selectedReceiver === id) setSelectedReceiver(updated.length > 0 ? updated[0].id : null);
  };

  // ── Card number formatter ───────────────────────
  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  // ── Validate card fields ────────────────────────
  const validateCard = () => {
    const num = cardNumber.replace(/\s/g, '');
    if (num.length !== 16) return 'Card number must be 16 digits.';
    if (!cardName.trim()) return 'Name on card is required.';
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return 'Expiry must be MM/YY.';
    if (cardCVV.length < 3) return 'CVV must be 3 or 4 digits.';
    return '';
  };

  // ── Proceed from details → payment ──────────────
  const handleProceedToPayment = () => {
    const receiverObj = receivers.find(r => r.id === selectedReceiver);
    if (!receiverObj || !address.trim()) {
      setError('Please fill in your address and select a receiver.');
      return;
    }
    // MOQ Validation
    const moqViolations = cart.filter(item => {
      const moqNum = parseInt((item.moq || '1').toString().replace(/\D/g, '')) || 1;
      return (item.quantity || 1) < moqNum;
    });
    if (moqViolations.length > 0) {
      setError(`Minimum order quantity not met for: ${moqViolations.map(i => i.name).join(', ')}. Please update quantities in your cart.`);
      return;
    }
    setError('');
    setStep('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Final order placement ───────────────────────
  const handleConfirmOrder = async () => {
    if (paymentMethod === 'card') {
      const err = validateCard();
      if (err) { setCardError(err); return; }
      setCardError('');
    }
    if (paymentMethod === 'insta' && !instaPayConfirmed) {
      setError('Please confirm you have sent the InstaPay transfer.');
      return;
    }

    const receiverObj = receivers.find(r => r.id === selectedReceiver);
    setError('');
    setLoading(true);

    try {
      const orderPayload = {
        address: address.trim(),
        receiverName: receiverObj.name,
        receiverPhone: receiverObj.phone,
        deliveryInstruction,
        paymentMethod,
        ...(paymentMethod === 'card' && { cardLast4: cardNumber.replace(/\s/g, '').slice(-4) }),
        ...(paymentMethod === 'insta' && { instaRef: instaRef.trim() })
      };

      await ordersAPI.createOrder(orderPayload);
      await clearCart();
      setShowSuccess(true);
      setStep('done');
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Payment method panel renderer ───────────────
  const renderPaymentPanel = () => {
    if (paymentMethod === 'card') {
      return (
        <div className="payment-panel card-panel">
          <div className="card-preview">
            <div className="card-chip">
              <div className="chip-lines">
                <div /><div /><div /><div /><div />
              </div>
            </div>
            <div className="card-number-display">
              {(cardNumber || '•••• •••• •••• ••••').padEnd(19, '•')}
            </div>
            <div className="card-bottom-row">
              <div>
                <div className="card-label">CARD HOLDER</div>
                <div className="card-value">{cardName || 'Full Name'}</div>
              </div>
              <div>
                <div className="card-label">EXPIRES</div>
                <div className="card-value">{cardExpiry || 'MM/YY'}</div>
              </div>
            </div>
          </div>

          {cardError && (
            <div className="payment-error">{cardError}</div>
          )}

          <div className="card-form">
            <div className="card-field">
              <label>Card Number</label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                disabled={loading}
                autoComplete="cc-number"
              />
            </div>
            <div className="card-field">
              <label>Name on Card</label>
              <input
                type="text"
                placeholder="Osama Al-korashy"
                value={cardName}
                onChange={e => setCardName(e.target.value)}
                disabled={loading}
                autoComplete="cc-name"
              />
            </div>
            <div className="card-field-row">
              <div className="card-field">
                <label>Expiry Date</label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                  disabled={loading}
                  autoComplete="cc-exp"
                />
              </div>
              <div className="card-field">
                <label>CVV</label>
                <input
                  type="password"
                  placeholder="•••"
                  value={cardCVV}
                  onChange={e => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  disabled={loading}
                  autoComplete="cc-csc"
                />
              </div>
            </div>
            <div className="card-security-note">
              🔒 Your payment is secured with 256-bit SSL encryption
            </div>
          </div>
        </div>
      );
    }

    if (paymentMethod === 'insta') {
      return (
        <div className="payment-panel insta-panel">
          <div className="insta-header">
            <div className="insta-logo">
              <span className="insta-icon">⚡</span>
              <span>InstaPay</span>
            </div>
            <div className="insta-amount">EGP {total.toLocaleString()}</div>
          </div>

          <div className="insta-instructions">
            <p>Transfer <strong>EGP {total.toLocaleString()}</strong> to:</p>
            <div className="insta-account">
              <div className="insta-number">📱 01012345678</div>
              <div className="insta-name">IndusConnect — Payments</div>
            </div>
            <p className="insta-note">Use your reference number below in the transfer notes so we can identify your payment:</p>
            <div className="insta-ref-display">
              REF-{Date.now().toString().slice(-6)}
            </div>
          </div>

          <div className="card-field" style={{ marginTop: '20px' }}>
            <label>Your Transfer Reference / Screenshot ID</label>
            <input
              type="text"
              placeholder="e.g. TXN-12345678"
              value={instaRef}
              onChange={e => setInstaRef(e.target.value)}
              disabled={loading}
            />
          </div>

          <label className="insta-confirm-check">
            <input
              type="checkbox"
              checked={instaPayConfirmed}
              onChange={e => setInstaPayConfirmed(e.target.checked)}
              disabled={loading}
            />
            <span>I confirm I have completed the InstaPay transfer of <strong>EGP {total.toLocaleString()}</strong></span>
          </label>
        </div>
      );
    }

    // Cash on Delivery
    return (
      <div className="payment-panel cash-panel">
        <div className="cash-icon">💵</div>
        <h3>Cash on Delivery</h3>
        <p>You'll pay <strong>EGP {total.toLocaleString()}</strong> when your order arrives.</p>
        <p className="cash-note">Please have the exact amount ready. Our delivery agent does not carry change for large amounts.</p>
        <div className="cash-summary-mini">
          <div><span>Subtotal</span><span>EGP {subtotal.toLocaleString()}</span></div>
          <div><span>Tax (14%)</span><span>EGP {tax.toLocaleString()}</span></div>
          <div><span>Shipping</span><span>EGP {shipping}</span></div>
          <div className="cash-total-row"><span>Total Due on Delivery</span><span>EGP {total.toLocaleString()}</span></div>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────
  return (
    <div className="checkout-wrapper">
      <div className={`checkout-container ${showSuccess ? 'content-blur' : ''}`}>

        {/* Progress steps */}
        <div className="checkout-steps">
          <div className={`step ${step !== 'payment' ? 'step-active' : 'step-done'}`}>
            <div className="step-circle">{step === 'payment' || step === 'done' ? '✓' : '1'}</div>
            <span>Delivery</span>
          </div>
          <div className="step-line" />
          <div className={`step ${step === 'payment' ? 'step-active' : step === 'done' ? 'step-done' : 'step-pending'}`}>
            <div className="step-circle">2</div>
            <span>Payment</span>
          </div>
        </div>

        <h1 className="main-title">{step === 'payment' ? 'Payment' : 'Checkout'}</h1>

        {error && (
          <div className="checkout-error">{error}</div>
        )}

        {/* ═══════ STEP 1: DELIVERY DETAILS ═══════ */}
        {step === 'details' && (
          <div className="checkout-content">
            <div className="checkout-form">

              <section className="form-section">
                <h2 className="section-heading">Delivery Address</h2>
                <div className="address-input-wrapper">
                  <span className="location-icon">📍</span>
                  <input
                    type="text"
                    placeholder="e.g., Cairo - Giza, Egypt"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </section>

              <section className="form-section">
                <h2 className="section-heading">Who will receive this order?</h2>
                <div className="receiver-grid">
                  {receivers.map(rec => (
                    editingId === rec.id ? (
                      <div key={rec.id} className="receiver-box new-form-box" style={{ flexDirection: 'column', gap: '10px', alignItems: 'stretch', cursor: 'default' }}>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} disabled={loading} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                        <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} disabled={loading} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                          <button type="button" onClick={saveEdit} style={{ flex: 1, padding: '8px', background: '#b33939', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save</button>
                          <button type="button" onClick={cancelEdit} style={{ flex: 1, padding: '8px', background: '#f3f4f6', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div key={rec.id} className={`receiver-box ${selectedReceiver === rec.id ? 'active' : ''}`} onClick={() => !loading && setSelectedReceiver(rec.id)} style={{ position: 'relative' }}>
                        <div className="receiver-info" style={{ flex: 1 }}>
                          <span className="name">{rec.name}</span>
                          <span className="phone">{rec.phone}</span>
                        </div>
                        <div className="receiver-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginRight: selectedReceiver === rec.id ? '30px' : '0' }}>
                          <button disabled={loading} onClick={(e) => startEditing(e, rec)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '5px', opacity: 0.7 }} title="Edit">✏️</button>
                          <button disabled={loading} onClick={(e) => handleDelete(e, rec.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '5px', opacity: 0.7 }} title="Delete">🗑️</button>
                        </div>
                        {selectedReceiver === rec.id && <span className="check-mark" style={{ position: 'absolute', right: '15px' }}>✓</span>}
                      </div>
                    )
                  ))}

                  {!showAddForm && (
                    <div className="receiver-box add-new" onClick={() => { if (!loading) { setShowAddForm(true); setEditingId(null); } }} style={{ cursor: 'pointer' }}>
                      <span className="plus-icon">+</span>
                      <span>Add someone else</span>
                    </div>
                  )}

                  {showAddForm && (
                    <div className="receiver-box new-form-box" style={{ flexDirection: 'column', gap: '10px', alignItems: 'stretch', cursor: 'default' }}>
                      <input type="text" placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} disabled={loading} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                      <input type="text" placeholder="Phone Number" value={newPhone} onChange={e => setNewPhone(e.target.value)} disabled={loading} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <button type="button" onClick={handleAddNewReceiver} style={{ flex: 1, padding: '8px', background: '#b33939', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add</button>
                        <button type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, padding: '8px', background: '#f3f4f6', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="form-section">
                <h2 className="section-heading">Delivery Instructions</h2>
                <div className="radio-list">
                  <label className="radio-item">
                    <input type="radio" name="delivery" checked={deliveryInstruction === 'leave'} onChange={() => setDeliveryInstruction('leave')} disabled={loading} />
                    <span className="custom-radio"></span> 🏠 Leave at my door
                  </label>
                  <label className="radio-item">
                    <input type="radio" name="delivery" checked={deliveryInstruction === 'call'} onChange={() => setDeliveryInstruction('call')} disabled={loading} />
                    <span className="custom-radio"></span> 📞 Call me before arriving
                  </label>
                </div>
              </section>

              <section className="form-section">
                <h2 className="section-heading">Pay with</h2>
                <div className="payment-list">
                  <label className="payment-item">
                    <input type="radio" name="pay" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} disabled={loading} />
                    <span className="custom-radio"></span>
                    <span>💳 Credit / Debit Card</span>
                    <div className="card-logos">
                      <VisaLogo />
                      <MastercardLogo />
                    </div>
                  </label>
                  <label className="payment-item">
                    <input type="radio" name="pay" checked={paymentMethod === 'insta'} onChange={() => setPaymentMethod('insta')} disabled={loading} />
                    <span className="custom-radio"></span>
                    <span>⚡ InstaPay</span>
                  </label>
                  <label className="payment-item">
                    <input type="radio" name="pay" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} disabled={loading} />
                    <span className="custom-radio"></span>
                    <span>💵 Cash on Delivery</span>
                  </label>
                </div>
              </section>

              <div className="footer-buttons">
                <button
                  className="btn-confirm"
                  onClick={handleProceedToPayment}
                  disabled={loading || cart.length === 0 || !address.trim() || !selectedReceiver}
                  style={{ opacity: (cart.length === 0 || !address.trim() || !selectedReceiver) ? 0.5 : 1 }}
                >
                  Continue to Payment →
                </button>
                <button className="btn-back" disabled={loading} onClick={() => navigate(-1)}>Back</button>
              </div>
            </div>

            {/* Summary sidebar */}
            <SummarySidebar cart={cart} subtotal={subtotal} tax={tax} shipping={shipping} total={total} />
          </div>
        )}

        {/* ═══════ STEP 2: PAYMENT ═══════ */}
        {step === 'payment' && (
          <div className="checkout-content">
            <div className="checkout-form">

              {/* Payment method selector */}
              <section className="form-section">
                <h2 className="section-heading">Payment Method</h2>
                <div className="payment-list">
                  <label className="payment-item">
                    <input type="radio" name="pay2" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} disabled={loading} />
                    <span className="custom-radio"></span>
                    <span>💳 Credit / Debit Card</span>
                    <div className="card-logos">
                      <VisaLogo />
                      <MastercardLogo />
                    </div>
                  </label>
                  <label className="payment-item">
                    <input type="radio" name="pay2" checked={paymentMethod === 'insta'} onChange={() => setPaymentMethod('insta')} disabled={loading} />
                    <span className="custom-radio"></span>
                    <span>⚡ InstaPay</span>
                  </label>
                  <label className="payment-item">
                    <input type="radio" name="pay2" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} disabled={loading} />
                    <span className="custom-radio"></span>
                    <span>💵 Cash on Delivery</span>
                  </label>
                </div>
              </section>

              {/* Dynamic payment panel */}
              {renderPaymentPanel()}

              <div className="footer-buttons" style={{ marginTop: '30px' }}>
                <button
                  className="btn-confirm"
                  onClick={handleConfirmOrder}
                  disabled={loading || cart.length === 0}
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? (
                    <span className="btn-spinner">⏳ Processing…</span>
                  ) : (
                    `Place Order — EGP ${total.toLocaleString()}`
                  )}
                </button>
                <button className="btn-back" disabled={loading} onClick={() => setStep('details')}>← Back</button>
              </div>
            </div>

            {/* Summary sidebar */}
            <SummarySidebar cart={cart} subtotal={subtotal} tax={tax} shipping={shipping} total={total} />
          </div>
        )}

      </div>

      {/* ═══════ SUCCESS MODAL ═══════ */}
      {showSuccess && (
        <div className="modal-overlay">
          <div className="success-card">
            <div className="success-icon-ring">
              <span className="success-check">✓</span>
            </div>
            <h2 className="thanks-msg">Order Placed!</h2>
            <p className="thanks-sub">
              {paymentMethod === 'cash' && 'Your order is confirmed. Pay on delivery.'}
              {paymentMethod === 'card' && 'Payment confirmed. Your order is on its way!'}
              {paymentMethod === 'insta' && 'InstaPay transfer received. Your order is being processed!'}
            </p>
            <div className="status-container">
              <p>Your order is on its way</p>
              <div className="plane-icon">✈️</div>
            </div>
            <div className="success-actions">
              <button className="btn-continue" onClick={() => navigate('/services')}>
                Continue Shopping
              </button>
              <button
                className="btn-back"
                style={{ marginTop: '12px', display: 'block', width: '100%', textAlign: 'center' }}
                onClick={() => { setShowSuccess(false); navigate('/home'); }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary Sidebar Sub-component ──────────────
function SummarySidebar({ cart, subtotal, tax, shipping, total }) {
  return (
    <div className="payment-summary">
      <h2 className="section-heading">Order Summary</h2>
      <div className="summary-items-list">
        {cart.map(item => (
          <div key={item.id} className="summary-item-row">
            <span className="summary-item-name">{item.name} × {item.quantity}</span>
            <span className="summary-item-price">EGP {((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="summary-details">
        <div className="summary-row">
          <span>Subtotal ({cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} items)</span>
          <span>EGP {subtotal.toLocaleString()}</span>
        </div>
        <div className="summary-row">
          <span>Tax (14%)</span>
          <span>EGP {tax.toLocaleString()}</span>
        </div>
        <div className="summary-row">
          <span>Shipping Fee</span>
          <span>EGP {shipping.toLocaleString()}</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-row total">
          <span>Total</span>
          <span>EGP {total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}