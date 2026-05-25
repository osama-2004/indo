import { useState, useRef, useEffect } from 'react';
import { ClipboardList, CalendarDays, FileText, Package } from 'lucide-react';
import { rfqAPI } from '../api/rfq';
import { useCart } from '../App';
import './RFQ.css';

export default function RFQ() {
  const { refreshCart } = useCart();
  const [form, setForm] = useState({
    product: '', date: '', quantity: '', budget: '', notes: '', file: null
  });

  const [supplierResponses, setSupplierResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const loadResponses = async () => {
    setLoading(true);
    try {
      const data = await rfqAPI.getRFQs();
      setSupplierResponses(data);
    } catch (err) {
      console.error("Failed loading RFQs from server:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResponses();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await rfqAPI.submitRFQ({
        product: form.product,
        date: form.date,
        quantity: form.quantity,
        budget: form.budget,
        notes: form.notes
      });
      alert("✅ RFQ Submitted Successfully! Check the supplier responses section below.");
      setForm({ product: '', date: '', quantity: '', budget: '', notes: '', file: null });
      
      // Reload RFQ list
      await loadResponses();
    } catch (err) {
      alert("Error submitting RFQ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    alert("💾 Draft saved!");
  };

  const handleConfirm = async (responseId) => {
    try {
      await rfqAPI.confirmRFQResponse(responseId);
      alert("✅ Offer confirmed and added to your shopping cart!");
      
      // Refresh responses list and navbar cart
      await loadResponses();
      if (refreshCart) {
        await refreshCart();
      }
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      alert("Error confirming offer: " + err.message);
    }
  };

  const handleFileChange = (file) => {
    if (file) {
      setForm(prev => ({ ...prev, file: file }));
    }
  };

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', padding: '40px 0', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '90%' }}>
        
        {/* ================= HEADER ================= */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
          <ClipboardList size={32} color="#c24438" />
          <h1 style={{ color: '#c24438', fontSize: '26px', fontWeight: 'bold', margin: 0 }}>RFQ List</h1>
        </div>

        {/* ================= RFQ FORM ================= */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '50px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Product / Service */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>Product / Service</label>
              <input 
                name="product" value={form.product} onChange={handleChange} type="text" placeholder="Enter product or service" required 
                disabled={submitting}
                style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            
            {/* Date Needed By */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>Date Needed By</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  name="date" value={form.date} onChange={handleChange} type="text" placeholder="mm/dd/yyyy" 
                  disabled={submitting}
                  style={{ width: '100%', height: '48px', padding: '0 40px 0 15px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
                />
                <CalendarDays size={20} color="#c24438" style={{ position: 'absolute', right: '15px', pointerEvents: 'none' }} />
              </div>
            </div>
            
            {/* Quantity */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>Quantity</label>
              <input 
                name="quantity" value={form.quantity} onChange={handleChange} type="text" placeholder="Enter quantity" 
                disabled={submitting}
                style={{ width: '100%', height: '48px', padding: '0 15px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
              />
            </div>
            
            {/* Budget */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>Budget</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  name="budget" value={form.budget} onChange={handleChange} type="text" placeholder="e.g. 5000"
                  disabled={submitting}
                  style={{ width: '100%', height: '48px', padding: '0 45px 0 15px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
                />
                <span style={{ position: 'absolute', right: '15px', color: '#c24438', fontSize: '14px', pointerEvents: 'none' }}>EGP</span>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>Additional Notes</label>
            <textarea 
              name="notes" value={form.notes} onChange={handleChange} placeholder="Add any additional information..." rows="4"
              disabled={submitting}
              style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: '#fff', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            ></textarea>
          </div>

          {/* Attachments */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>
              Attachments <span style={{ color: '#9ca3af', fontWeight: 'normal', fontSize: '12px' }}>(Optional)</span>
            </label>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileChange(e.dataTransfer.files[0]); }}
              onClick={() => !submitting && fileInputRef.current.click()}
              style={{ width: '100%', height: '120px', border: '2px dashed #d1d5db', borderRadius: '12px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <input type="file" hidden ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files[0])} disabled={submitting} />
              <FileText size={28} color="#c24438" style={{ marginBottom: '8px' }} />
              {form.file ? (
                <p style={{ margin: 0, fontSize: '13px', color: '#374151', fontWeight: '600' }}>{form.file.name}</p>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Drag & Drop here <br/> Or <br/> <span style={{ color: '#111827', fontWeight: 'bold' }}>Browse</span></p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <button type="submit" disabled={submitting} style={{ backgroundColor: '#c24438', color: '#fff', border: 'none', borderRadius: '30px', padding: '12px 35px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Submitting RFQ...' : 'Submit RFQ'}
            </button>
            <button type="button" disabled={submitting} onClick={handleSaveDraft} style={{ backgroundColor: 'transparent', color: '#c24438', border: '1px solid #c24438', borderRadius: '30px', padding: '12px 35px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
              Save as draft
            </button>
          </div>
        </form>

        {/* ================= SUPPLIER RESPONSES ================= */}
        <div>
          <h2 style={{ fontSize: '22px', color: '#1f2937', margin: '0 0 5px 0', fontWeight: 'bold' }}>Supplier Responses ({supplierResponses.length})</h2>
          <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 25px 0' }}>Compare offers and choose the best partner for your needs.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading supplier bids...</div>
            ) : supplierResponses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: '12px', backgroundColor: '#fff' }}>No supplier responses yet. Submit an RFQ above to instantly generate offers!</div>
            ) : supplierResponses.map((res) => {
              const isConfirmed = res.status === 'confirmed';
              
              return (
                <div key={res.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', border: isConfirmed ? '1px solid #c24438' : '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', transition: 'all 0.2s ease', boxShadow: isConfirmed ? '0 4px 15px rgba(194, 68, 56, 0.05)' : 'none' }}>
                  
                  {/* Company Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: '220px' }}>
                    <div style={{ width: '45px', height: '45px', backgroundColor: '#fef2f2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={24} color="#c24438" />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', color: '#111827', fontWeight: 'bold' }}>{res.name}</h3>
                      <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#ef4444' }}>{res.location} <span style={{ color: '#9ca3af', fontWeight: 'normal', fontSize: '11px' }}>({res.product})</span></p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#4b5563', fontWeight: 'bold' }}>
                        <span style={{ color: '#facc15' }}>★</span> {res.rating} <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>({res.reviews})</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Data Columns */}
                  <div style={{ display: 'flex', gap: '40px', flex: 1, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <span style={{ fontSize: '11px', color: '#9ca3af' }}>Unit price</span>
                       <span style={{ fontSize: '14px', color: '#111827', fontWeight: 'bold' }}>{res.unitPrice}</span>
                       <span style={{ fontSize: '10px', color: '#ef4444', height: '12px' }}>{res.unitDiscount}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <span style={{ fontSize: '11px', color: '#9ca3af' }}>Qty Offered</span>
                       <span style={{ fontSize: '14px', color: '#111827', fontWeight: 'bold' }}>{res.qty}</span>
                       <span style={{ fontSize: '10px', height: '12px' }}></span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <span style={{ fontSize: '11px', color: '#9ca3af' }}>Total Price</span>
                       <span style={{ fontSize: '14px', color: '#111827', fontWeight: 'bold' }}>{res.total}</span>
                       <span style={{ fontSize: '10px', color: '#ef4444', height: '12px' }}>{res.totalDiscount}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <span style={{ fontSize: '11px', color: '#9ca3af' }}>Delivery</span>
                       <span style={{ fontSize: '14px', color: '#111827', fontWeight: 'bold' }}>{res.delivery}</span>
                       <span style={{ fontSize: '10px', color: '#9ca3af', height: '12px' }}>{res.deliveryDate}</span>
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <button 
                    onClick={() => handleConfirm(res.id)}
                    style={{ 
                      backgroundColor: isConfirmed ? '#c24438' : '#fff', 
                      color: isConfirmed ? '#fff' : '#374151', 
                      border: isConfirmed ? 'none' : '1px solid #d1d5db', 
                      borderRadius: '30px', 
                      padding: '8px 24px', 
                      fontSize: '13px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      minWidth: '110px',
                      transition: '0.2s'
                    }}
                  >
                    {isConfirmed ? 'Confirmed ✓' : 'Confirm'}
                  </button>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  )
}