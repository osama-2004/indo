import { Link, useNavigate } from 'react-router-dom';
import { useCart, useAuth, useToast } from '../App';
import './Cart.css'; 

const getSmartImageSrc = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/150?text=No+Image';
  if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('/uploads/')) {
    return imagePath;
  }
  const baseUrl = import.meta.env.BASE_URL;
  if (baseUrl && baseUrl !== '/' && imagePath.startsWith(baseUrl)) {
    return imagePath;
  }
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  return `${cleanBase}${cleanPath}`;
};

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleQtyChange = async (productId, currentQty, delta, moq) => {
    const moqNum = parseInt((moq || '1').toString().replace(/\D/g, '')) || 1;
    const nextQty = currentQty + delta;
    if (nextQty < moqNum) {
      showToast(`⚠️ Minimum order quantity for this product is ${moqNum} units.`, 'warning');
      return;
    }
    try {
      await updateQuantity(productId, nextQty);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckout = () => {
    if (isLoggedIn) {
      navigate('/checkout');
    } else {
      showToast('⚠️ Please log in first to proceed to checkout!', 'warning');
      navigate('/login');
    }
  };

  const subtotal = cart.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  const shipping = cart.length > 0 ? 50 : 0; // matching backend flat shipping rate 50 EGP
  const tax = Math.round(subtotal * 0.14); // matching backend 14% VAT EGP
  const total = subtotal + shipping + tax;

  return (
    <div className="cart-page page-enter">
      <div className="cart-inner">
        <h1 className="cart-title">Shopping Cart</h1>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <Link to="/services" className="btn-primary">Browse Products</Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-items">
              {cart.map(item => {
                const itemImgSrc = getSmartImageSrc(item.image);

                return (
                  <div className="cart-item" key={item.id}>
                    <div className="cart-item-img">
                      <img 
                        src={itemImgSrc} 
                        alt={item.name} 
                        onError={(e) => { e.target.src = 'https://placehold.co/150x150/e2e8f0/64748b?text=Image+Not+Found'; }}
                      />
                    </div>
                    
                    <div className="cart-item-info">
                      <h3>{item.name}</h3>
                      <p className="cart-item-seller">Seller: {item.seller || 'IndusConnect Official'}</p>
                      {item.moq && (
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0' }}>
                          MOQ: <strong>{item.moq}</strong>
                          {(() => {
                            const moqNum = parseInt((item.moq || '1').toString().replace(/\D/g, '')) || 1;
                            return item.quantity < moqNum ? (
                              <span style={{ color: '#dc2626', marginLeft: '8px', fontWeight: 'bold' }}>⚠ Below minimum quantity!</span>
                            ) : null;
                          })()}
                        </p>
                      )}
                      <div className="cart-item-controls">
                        <div className="qty-controls">
                          <button onClick={() => handleQtyChange(item.id, item.quantity, -1, item.moq)}>−</button>
                          <span>{item.quantity || 1}</span>
                          <button onClick={() => handleQtyChange(item.id, item.quantity, 1, item.moq)}>+</button>
                        </div>
                        <button className="remove-btn" onClick={() => handleRemove(item.id)}>
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="cart-item-price">
                      EGP {((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="cart-summary">
              <h3>Order Summary</h3>
              <div className="summary-line">
                <span>Subtotal ({cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} items)</span>
                <span>EGP {subtotal.toLocaleString()}</span>
              </div>
              <div className="summary-line">
                <span>Shipping</span>
                <span>EGP {shipping}</span>
              </div>
              <div className="summary-line">
                <span>Tax (14%)</span>
                <span>EGP {tax.toLocaleString()}</span>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span>EGP {total.toLocaleString()}</span>
              </div>
              
              <button 
                className="btn-primary checkout-btn" 
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </button>
              <Link to="/services" className="continue-shopping">
                ← Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}