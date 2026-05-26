import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, Box, Bell, ClipboardList, 
  ReceiptText, Users, CheckCircle2, Clock, 
  XCircle, Search, ArrowRight, Plus, SlidersHorizontal, X, UploadCloud, Pencil, Trash2, Image as ImageIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip
} from 'recharts';
import { productsAPI } from '../api/products';
import { ordersAPI } from '../api/orders';
import { rfqAPI } from '../api/rfq';
import './SupplierDashboard.css';
import logo from '../assets/logo.svg';
import Footer from '../components/Footer';

const SALES_DATA = [
  { name: 'JAN', sales: 1800 }, { name: 'FEB', sales: 2900 },
  { name: 'MAR', sales: 3000 }, { name: 'APR', sales: 3600 },
  { name: 'MAY', sales: 2200 }, { name: 'JUN', sales: 2800 }
];

const ORDER_STATUS_DATA = [
  { name: 'Confirmed', value: 40, color: '#10B981' },
  { name: 'Pending', value: 25, color: '#3B82F6' },
  { name: 'Arrived', value: 15, color: '#F59E0B' }
];

const DEFAULT_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='300' height='300' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%2364748b'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function SupplierDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  
  const [newProduct, setNewProduct] = useState({ 
    name: '', category: '', price: '', quantity: '', status: 'Approved', image: '', imageFile: null
  });

  // RFQ Quote modal state
  const [rfqQuoteModal, setRfqQuoteModal] = useState({ open: false, rfqId: null, rfqProduct: '' });
  const [quoteUnitPrice, setQuoteUnitPrice] = useState('');
  const [quoteDeliveryDays, setQuoteDeliveryDays] = useState('');
  
  const fileInputRef = useRef(null);

  // Load products
  const fetchSupplierProducts = async () => {
    try {
      const data = await productsAPI.getSupplierProducts();
      setSupplierProducts(data);
    } catch (err) {
      console.error('Failed fetching supplier products:', err);
    }
  };

  // Load orders
  const fetchSupplierOrders = async () => {
    try {
      const data = await ordersAPI.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed fetching supplier orders:', err);
    }
  };

  // Load RFQs
  const fetchIncomingRfqs = async () => {
    try {
      const data = await rfqAPI.getRFQs();
      setRfqs(data);
    } catch (err) {
      console.error('Failed fetching RFQs:', err);
    }
  };

  const handleRFQStatusUpdate = async (rfqId, status) => {
    try {
      await rfqAPI.updateRFQStatus(rfqId, status);
      alert(`RFQ ${status} successfully!`);
      fetchIncomingRfqs();
    } catch (err) {
      alert('Failed to update RFQ status: ' + err.message);
    }
  };

  const handleSendQuote = async (e) => {
    e.preventDefault();
    if (!quoteUnitPrice || !quoteDeliveryDays) {
      alert('Please fill in unit price and delivery days.');
      return;
    }
    try {
      await rfqAPI.respondToRFQ(rfqQuoteModal.rfqId, {
        unitPrice: parseFloat(quoteUnitPrice),
        deliveryDays: parseInt(quoteDeliveryDays)
      });
      alert('Quotation sent successfully! The buyer will see your offer.');
      setRfqQuoteModal({ open: false, rfqId: null, rfqProduct: '' });
      setQuoteUnitPrice('');
      setQuoteDeliveryDays('');
      fetchIncomingRfqs();
    } catch (err) {
      alert('Failed to send quotation: ' + err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'products') {
      fetchSupplierProducts();
    } else if (activeTab === 'orders') {
      fetchSupplierOrders();
    } else if (activeTab === 'rfq') {
      fetchIncomingRfqs();
    } else if (activeTab === 'dashboard') {
      fetchSupplierProducts();
    }
  }, [activeTab]);

  const handleProductInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewProduct(prev => ({
        ...prev,
        imageFile: file,
        image: URL.createObjectURL(file)
      }));
    }
  };

  const handleOpenEditModal = (e, prod) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingProductId(prod.id);
    
    const imageSrc = prod.image && (prod.image.startsWith('data:') || prod.image.startsWith('http') || prod.image.startsWith('/uploads/'))
      ? prod.image
      : `${import.meta.env.BASE_URL || '/'}${prod.image}`;

    setNewProduct({
      name: prod.name,
      category: prod.category,
      price: prod.price,
      quantity: prod.moq ? String(prod.moq).replace(/\D/g,'') : '10',
      status: prod.status || 'Approved',
      image: imageSrc,
      imageFile: null
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await productsAPI.deleteProduct(id);
        alert('Product deleted successfully!');
        fetchSupplierProducts();
      } catch (err) {
        alert('Failed to delete product: ' + err.message);
      }
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        name: newProduct.name,
        category: newProduct.category,
        price: newProduct.price,
        description: 'Supplier listed catalog item.',
        moq: newProduct.quantity ? `${newProduct.quantity} Unit` : '10 Unit',
        unitPrice: `${newProduct.price}EGP`
      };

      if (newProduct.imageFile) {
        payload.imageFile = newProduct.imageFile;
      }

      if (isEditMode) {
        await productsAPI.updateProduct(editingProductId, payload);
        alert('Product updated successfully!');
      } else {
        await productsAPI.createProduct(payload);
        alert('Product listed successfully for Admin approval!');
      }
      
      setIsModalOpen(false);
      setIsEditMode(false);
      setNewProduct({ name: '', category: '', price: '', quantity: '', status: 'Approved', image: '', imageFile: null });
      fetchSupplierProducts();
    } catch (err) {
      alert('Failed listing product: ' + err.message);
    }
  };

  const filteredProducts = supplierProducts.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const renderPagination = () => (
    <div className="pagination-wrapper">
      <div className="pagination-controls">
        <span className={`page-step ${currentPage === 1 ? 'active' : ''}`} onClick={() => setCurrentPage(1)}>1</span>
        <span className={`page-step ${currentPage === 2 ? 'active' : ''}`} onClick={() => setCurrentPage(2)}>2</span>
        <span className={`page-step ${currentPage === 3 ? 'active' : ''}`} onClick={() => setCurrentPage(3)}>3</span>
        <button className="page-next"><ArrowRight size={16} /></button>
      </div>
    </div>
  );

  return (
    <div className="supplier-dashboard" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      
      <div style={{ display: 'flex', flex: 1 }}>
        <aside className="sidebar">
          <div className="logo-section">
            <img src={logo} alt="IndusConnect" className="logo-img" style={{ height: '35px', objectFit: 'contain' }} />
          </div>
          
          <nav className="nav-menu">
            <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setCurrentPage(1); }}><LayoutDashboard size={20}/> Dashboard</div>
            <div className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => { setActiveTab('products'); setCurrentPage(1); }}><Box size={20}/> My Products</div>
            <div className={`nav-item ${activeTab === 'rfq' ? 'active' : ''}`} onClick={() => { setActiveTab('rfq'); setCurrentPage(1); }}><ClipboardList size={20}/> RFQ</div>
            <div className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => { setActiveTab('orders'); setCurrentPage(1); }}><ReceiptText size={20}/> Orders</div>
          </nav>
        </aside>

        <main className="main-content">
          <header className="top-header">
            <button className="icon-btn"><Bell size={20}/></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4B5563' }}>Supplier Panel</span>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#c24438', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>SP</div>
            </div>
          </header>

          <div className="page-title-section">
            {activeTab === 'dashboard' && <LayoutDashboard size={28} className="title-icon" />}
            {activeTab === 'products' && <Box size={28} className="title-icon" />}
            {activeTab === 'rfq' && <ClipboardList size={28} className="title-icon" />}
            {activeTab === 'orders' && <ReceiptText size={28} className="title-icon" />}
            <h1 className="page-title">{activeTab === 'products' ? 'My Products' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
          </div>

          {activeTab === 'dashboard' && (
             <>
                <div className="stats-grid">
                  <div className="stat-card"><div><p>My Products</p><h2>{supplierProducts.length}</h2></div><div className="stat-icon"><Box size={20} color="#C24133"/></div></div>
                  <div className="stat-card"><div><p>Pending Review</p><h2>{supplierProducts.filter(p=>p.status==='Pending').length}</h2></div><div className="stat-icon"><Clock size={20} color="#F59E0B"/></div></div>
                  <div className="stat-card"><div><p>Active Orders</p><h2>12</h2></div><div className="stat-icon"><CheckCircle2 size={20} color="#10B981"/></div></div>
                  <div className="stat-card"><div><p>Estimated Sales</p><h2>24,500</h2></div><div className="stat-icon"><SlidersHorizontal size={20} color="#EF4444"/></div></div>
                </div>
                <div className="card-panel mt-30">
                  <div className="panel-header"><h3>Sales dynamics</h3><div className="year-selector">2026 <span className="arrow-down">▼</span></div></div>
                  <div className="chart-container" style={{ width: '100%' }}>
                    <ResponsiveContainer width="99%" height={280}>
                      <BarChart data={SALES_DATA} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barSize={12}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                        <BarTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}/>
                        <Bar dataKey="sales" fill="#E0E7FF" radius={[10, 10, 10, 10]} />
                        <Bar dataKey="sales" fill="#3B82F6" radius={[10, 10, 10, 10]} style={{ transform: 'scaleY(0.7)', transformOrigin: 'bottom' }}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
             </>
          )}

          {activeTab === 'products' && (
            <div className="card-panel p-0">
              <div className="panel-header-actions">
                <div className="search-box">
                  <Search size={16} className="search-icon" />
                  <input type="text" placeholder="Search my products..." value={productSearch} onChange={e=>setProductSearch(e.target.value)} />
                </div>
                <button className="btn-primary" onClick={() => { setIsEditMode(false); setNewProduct({ name: '', category: '', price: '', quantity: '', status: 'Approved', image: '', imageFile: null }); setIsModalOpen(true); }}>
                  <Plus size={16}/> Add New Product
                </button>
              </div>
              <table className="data-table">
                <thead><tr><th>Product Name ↕</th><th>Category</th><th>Price ↕</th><th>Quantity</th><th>Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
                <tbody>
                  {filteredProducts.length > 0 ? filteredProducts.map((item) => {
                    const imageSrc = item.image && (item.image.startsWith('data:') || item.image.startsWith('http') || item.image.startsWith('/uploads/'))
                      ? item.image
                      : `${import.meta.env.BASE_URL || '/'}${(item.image || '').replace(/^\//, '')}`;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-flex">
                            <img 
                              src={imageSrc} 
                              alt="" 
                              className="table-img" 
                              style={{width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #eee'}} 
                              onError={(e)=>{e.target.src=DEFAULT_IMG}}
                            />
                            <span className="fw-bold text-dark">{item.name}</span>
                          </div>
                        </td>
                        <td className="text-red">{item.category}</td>
                        <td className="fw-bold"><span className="text-red">{item.price}</span> <span className="text-muted">EGP</span></td>
                        <td className="fw-bold"><span className="text-red">{item.moq ? String(item.moq).replace(/\D/g,'') : '10'}</span> <span className="text-muted">Unit</span></td>
                        <td><span className={`status-badge ${item.status?.toLowerCase() || 'approved'}`}>{item.status} {item.status === 'Approved' && '✓'}</span></td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                            <button onClick={(e) => handleOpenEditModal(e, item)} style={{ border: 'none', background: 'none', color: '#4B5563', cursor: 'pointer' }}><Pencil size={18} /></button>
                            <button onClick={(e) => handleDeleteProduct(e, item.id)} style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (<tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>You haven't added any products yet.</td></tr>)}
                </tbody>
              </table>
              {filteredProducts.length > 0 && renderPagination()}
            </div>
          )}

          {activeTab === 'rfq' && (
            <div className="card-panel p-0">
              <table className="data-table">
                <thead><tr><th>Id ↕</th><th>Buyer ↕</th><th>Needed By</th><th>Product ↕</th><th>Qty</th><th>Budget</th><th>Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
                <tbody>
                  {rfqs.length > 0 ? rfqs.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-bold text-red">#{item.id}</td>
                      <td>
                        <div className="cell-flex">
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#c24438', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>BY</div>
                          <span className="fw-bold text-dark">{item.buyer_name}</span>
                        </div>
                      </td>
                      <td className="text-dark">{item.date_needed}</td>
                      <td className="fw-bold text-dark">{item.product}</td>
                      <td className="fw-bold"><span className="text-red">{item.quantity}</span> <span className="text-muted">Unit</span></td>
                      <td className="fw-bold"><span className="text-red">{item.budget ? item.budget.toLocaleString() : 'N/A'}</span> <span className="text-muted">EGP</span></td>
                      <td>
                        <span className={`status-badge ${(item.status || 'pending').toLowerCase()}`}>
                          {item.status === 'accepted' ? '✓ Accepted' : item.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {item.status !== 'accepted' && (
                            <button
                              onClick={() => setRfqQuoteModal({ open: true, rfqId: item.id, rfqProduct: item.product })}
                              style={{ backgroundColor: '#c24438', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              📤 Quote
                            </button>
                          )}
                          {item.status === 'pending' && (
                            <button
                              onClick={() => handleRFQStatusUpdate(item.id, 'rejected')}
                              style={{ backgroundColor: '#f3f4f6', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              ✗ Reject
                            </button>
                          )}
                          {item.status === 'rejected' && (
                            <button
                              onClick={() => handleRFQStatusUpdate(item.id, 'pending')}
                              style={{ backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              ↩ Undo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>No active RFQ requests listed.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'orders' && (
              <>
                <div className="card-panel">
                  <h3 className="chart-title">Order Status</h3>
                  <div className="donut-chart-wrapper">
                    <div className="donut-chart" style={{ width: '220px' }}>
                      <ResponsiveContainer width="99%" height={220}>
                        <PieChart><Pie data={ORDER_STATUS_DATA} innerRadius={65} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">{ORDER_STATUS_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><PieTooltip /></PieChart>
                      </ResponsiveContainer>
                      <div className="donut-center-text"><h2>{orders.length}</h2><p>Orders</p></div>
                    </div>
                    <div className="donut-legend">{ORDER_STATUS_DATA.map((item, index) => (<div className="legend-item" key={index}><span className="legend-dot" style={{ backgroundColor: item.color }}></span><span className="fw-bold text-dark">{Math.round(orders.length * item.value / 80)}</span> <span className="text-muted">{item.name}</span></div>))}</div>
                  </div>
                </div>
                <div className="card-panel p-0 mt-30">
                  <table className="data-table">
                    <thead><tr><th>Buyer ↕</th><th>Date ↕</th><th>Price ↕</th><th>Quantity</th><th>Status</th></tr></thead>
                    <tbody>
                      {orders.length > 0 ? orders.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <div className="cell-flex">
                              <img src={item.img} alt="" className="avatar-img" onError={(e)=>{e.target.src='https://i.pravatar.cc/150?u=buyer'+index}} />
                              <span className="fw-bold text-dark">{item.name}</span>
                            </div>
                          </td>
                          <td className="text-dark">{item.date}</td>
                          <td className="fw-bold"><span className="text-red">{item.price.toLocaleString()}</span> <span className="text-muted">EGP</span></td>
                          <td className="fw-bold"><span className="text-red">{item.qty}</span> <span className="text-muted">Unit</span></td>
                          <td><span className={`status-badge ${item.status.toLowerCase().replace(' ', '-')}`}>{item.status} {item.status === 'Delivered' && '✓'}</span></td>
                        </tr>
                      )) : (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No buyer orders received for your catalog yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
           )}
        </main>
      </div>

      <div style={{ width: '100%' }}><Footer /></div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '30px', borderRadius: '16px', width: '600px', maxWidth: '95%', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={18} color="#4b5563" /></button>
            <div style={{ marginBottom: '25px', borderBottom: '1px solid #e5e7eb', paddingBottom: '15px' }}>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}><Box size={24} color="#C24133" /> {isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
            </div>
            
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>Product Image</label>
                <div onClick={() => fileInputRef.current.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', border: '2px dashed #d1d5db', borderRadius: '12px', cursor: 'pointer', position: 'relative', backgroundColor: '#f9fafb', overflow: 'hidden' }}>
                  {newProduct.image ? <img src={newProduct.image} alt="Preview" style={{ height: '100%', width: '100%', objectFit: 'contain', backgroundColor: '#fff' }} /> : <div style={{ color: '#9CA3AF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}><ImageIcon size={32} /><span style={{fontSize:'12px', fontWeight:'500'}}>Click to upload image</span></div>}
                  <input type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} style={{ display: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>Product Name</label>
                  <input type="text" name="name" value={newProduct.name} onChange={handleProductInputChange} placeholder="e.g. Modern Office Desk" required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>Category</label>
                  <select name="category" value={newProduct.category} onChange={handleProductInputChange} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: '#fff' }}>
                    <option value="">Select Category</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Textile">Textile</option>
                    <option value="Raw Material">Raw Material</option>
                    <option value="Package">Package</option>
                    <option value="Electronic & Spare Parts">Electronic & Spare Parts</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>Price (EGP)</label>
                  <input type="number" name="price" value={newProduct.price} onChange={handleProductInputChange} placeholder="0.00" required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>Quantity</label>
                  <input type="number" name="quantity" value={newProduct.quantity} onChange={handleProductInputChange} placeholder="Number of units" required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, background: '#fff', color: '#374151', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" style={{ flex: 2, background: '#C24133', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Plus size={18} /> {isEditMode ? 'Save Changes' : 'Submit Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RFQ Quote Modal ── */}
      {rfqQuoteModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', width: '480px', maxWidth: '95%', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setRfqQuoteModal({ open: false, rfqId: null, rfqProduct: '' })} style={{ position: 'absolute', top: '15px', right: '15px', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            <h3 style={{ margin: '0 0 5px 0', color: '#111827', fontSize: '18px' }}>📤 Send Quotation</h3>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '13px' }}>Product: <strong>{rfqQuoteModal.rfqProduct}</strong></p>
            <form onSubmit={handleSendQuote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>Unit Price (EGP)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 150"
                  value={quoteUnitPrice}
                  onChange={e => setQuoteUnitPrice(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>Delivery Days</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 7"
                  value={quoteDeliveryDays}
                  onChange={e => setQuoteDeliveryDays(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <button type="button" onClick={() => setRfqQuoteModal({ open: false, rfqId: null, rfqProduct: '' })} style={{ flex: 1, padding: '11px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#374151' }}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: '11px', background: '#c24438', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#fff' }}>Send Quotation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}