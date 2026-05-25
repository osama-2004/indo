import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Box, Bell, Users, 
  CheckCircle2, Clock, XCircle, Search,
  ArrowRight, Plus, Image as ImageIcon,
  Pencil, Trash2, Check, X
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { productsAPI } from '../api/products';
import { client } from '../api/client';
import './AdminDashboard.css';
import logo from '../assets/logo.svg';
import Footer from '../components/Footer'; 

const DEFAULT_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='300' height='300' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%2364748b'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const itemsPerPage = 6;

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    approvedProducts: 0,
    pendingProducts: 0,
    rejectedProducts: 0,
    totalOrders: 0,
    totalSales: 0
  });

  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [chartData, setChartData] = useState([]);
  
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [newProdData, setNewProdData] = useState({
    name: '', price: '', moq: '', category: 'Furniture', status: 'Approved', description: '', image: '', imageFile: null
  });

  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Fetch Dashboard Stats & Charts
  const fetchStatsAndChart = async () => {
    try {
      const statsRes = await client.get('/api/admin/stats');
      setStats(statsRes);
      
      const chartRes = await client.get('/api/admin/chart-data');
      setChartData(chartRes);
    } catch (error) {
      console.error('Failed loading stats:', error);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const usersRes = await client.get(`/api/admin/users?search=${userSearch}`);
      setUsers(usersRes);
    } catch (error) {
      console.error('Failed loading users:', error);
    }
  };

  // Fetch Products
  const fetchProducts = async () => {
    try {
      const productsRes = await productsAPI.getAdminProducts();
      setProducts(productsRes);
    } catch (error) {
      console.error('Failed loading products:', error);
    }
  };

  const handleUpdateProductStatus = async (e, id, newStatus) => {
    e.stopPropagation();
    try {
      await productsAPI.updateProductStatus(id, newStatus);
      alert(`Product status updated to ${newStatus}!`);
      fetchProducts();
      fetchStatsAndChart();
    } catch (err) {
      alert('Failed updating product status: ' + err.message);
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await client.put(`/api/admin/users/${userId}/role`, { role: newRole });
      alert(`User role updated to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)} successfully!`);
      fetchUsers();
      fetchStatsAndChart();
    } catch (err) {
      alert('Failed updating user role: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to permanently delete this user? All their orders, cart items, and RFQs will also be deleted!")) {
      try {
        await client.delete(`/api/admin/users/${userId}`);
        alert('User deleted successfully!');
        fetchUsers();
        fetchStatsAndChart();
      } catch (err) {
        alert('Failed deleting user: ' + err.message);
      }
    }
  };

  // Tab change triggers
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStatsAndChart();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'products') {
      fetchProducts();
    }
  }, [activeTab, userSearch]);

  const filteredProducts = products.filter(p => {
    const pName = p?.name || '';
    const pCat = p?.category || '';
    return pName.toLowerCase().includes((productSearch || '').toLowerCase()) ||
           pCat.toLowerCase().includes((productSearch || '').toLowerCase());
  });

  const currentProductsList = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalProductPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const totalUserPages = Math.ceil(users.length / itemsPerPage);
  const currentUsersList = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAllProducts = (e) => {
    if (e.target.checked) setSelectedProductIds(currentProductsList.map(p => p.id));
    else setSelectedProductIds([]);
  };

  const handleSelectProduct = (e, id) => {
    e.stopPropagation(); 
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewProdData(prev => ({
        ...prev,
        imageFile: file,
        image: URL.createObjectURL(file) // preview url
      }));
    }
  };

  const handleDeleteProduct = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this product permanently from system?")) {
      try {
        await productsAPI.deleteProduct(id);
        alert('Product deleted successfully!');
        fetchProducts();
      } catch (err) {
        alert('Failed deleting product: ' + err.message);
      }
    }
  };

  const handleOpenEditModal = (e, prod) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingProductId(prod.id);
    
    const imageSrc = prod.image && (prod.image.startsWith('data:') || prod.image.startsWith('http') || prod.image.startsWith('/uploads/'))
      ? prod.image
      : `${import.meta.env.BASE_URL || '/'}${prod.image}`;

    setNewProdData({
      name: prod?.name || '',
      price: prod?.price || '',
      moq: prod?.moq ? String(prod.moq).replace(/\D/g,'') : '', 
      category: prod?.category || 'Furniture',
      status: prod?.status || 'Approved',
      description: prod?.description || '',
      image: imageSrc,
      imageFile: null
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!newProdData.name || !newProdData.price) return;

    try {
      const payload = {
        name: newProdData.name,
        price: newProdData.price,
        category: newProdData.category,
        description: newProdData.description,
        moq: newProdData.moq ? `${newProdData.moq} Unit` : '10 Unit',
        unitPrice: `${newProdData.price}EGP`,
        status: newProdData.status
      };

      if (newProdData.imageFile) {
        payload.imageFile = newProdData.imageFile;
      }

      if (isEditMode) {
        await productsAPI.updateProduct(editingProductId, payload);
        alert('Product updated successfully!');
      } else {
        await productsAPI.createProduct(payload);
        alert('Product created successfully!');
      }

      setIsModalOpen(false);
      setIsEditMode(false);
      setNewProdData({ name: '', price: '', moq: '', category: 'Furniture', status: 'Approved', description: '', image: '', imageFile: null });
      fetchProducts();
    } catch (err) {
      alert('Failed saving product: ' + err.message);
    }
  };

  return (
    <div className="admin-wrapper">
      
      <div className="admin-dashboard-container">
        <div className="admin-logo-section">
          <img src={logo} alt="IndusConnect" className="admin-logo-img" style={{ height: '35px', objectFit: 'contain' }} />
        </div>
        
        {/* Sidebar Component */}
        <aside className="admin-sidebar">
          <nav className="admin-nav-menu">
            <div 
              className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setCurrentPage(1); }}
            >
              <LayoutDashboard size={20}/> Dashboard
            </div>
            <div 
              className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => { setActiveTab('users'); setCurrentPage(1); }}
            >
              <Users size={20}/> Manage Users
            </div>
            <div 
              className={`admin-nav-item ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => { setActiveTab('products'); setCurrentPage(1); }}
            >
              <Box size={20}/> Manage Products
            </div>
          </nav>
        </aside>

        {/* Main Content Dashboard */}
        <main className="admin-main-content">
          
          {/* Top Header */}
          <header className="admin-top-header">
            <button className="admin-icon-btn">
              <Bell size={20}/>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4B5563' }}>Admin Panel</span>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#c24438', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>AD</div>
            </div>
          </header>

          <div className="admin-page-title-section">
            <h1 className="admin-page-title">
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'users' ? 'Manage Users' : 'Manage Products'}
            </h1>
          </div>

          {/* ==========================================
              DASHBOARD VIEW
              ========================================== */}
          {activeTab === 'dashboard' && (
            <>
              <div className="admin-stats-grid">
                <StatCard label="Total Users" val={stats.totalUsers} icon={<Users size={20} color="#C24133"/>} />
                <StatCard label="Products Approved" val={stats.approvedProducts} icon={<CheckCircle2 size={20} color="#10B981"/>} />
                <StatCard label="Products Pending" val={stats.pendingProducts} icon={<Clock size={20} color="#F59E0B"/>} />
                <StatCard label="Total Sales (EGP)" val={stats.totalSales.toLocaleString()} icon={<XCircle size={20} color="#EF4444"/>} />
              </div>

              <div className="admin-chart-panel">
                <div className="admin-chart-header">
                  <h3>User Growth Dynamics</h3>
                  <div className="admin-chart-legend">
                    <span><div className="legend-dot green"></div> Supplier</span>
                    <span><div className="legend-dot red"></div> Buyer</span>
                  </div>
                </div>
                <div className="admin-chart-container" style={{ width: '100%', height: 300, minHeight: 300 }}>
                  {chartData.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="supplier" stroke="#10B981" fillOpacity={0.05} fill="#10B981" strokeWidth={2} />
                        <Area type="monotone" dataKey="buyer" stroke="#C24133" fillOpacity={0.05} fill="#C24133" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ==========================================
              MANAGE USERS VIEW
              ========================================== */}
          {activeTab === 'users' && (
            <div className="admin-card-panel">
              <div className="admin-search-wrapper">
                <Search size={18} className="admin-search-icon" />
                <input 
                  type="text" 
                  className="admin-search-input"
                  placeholder="Search registered users..." 
                  value={userSearch} 
                  onChange={(e) => { setUserSearch(e.target.value); setCurrentPage(1); }} 
                />
              </div>
              
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Id</th>
                    <th>Registration date</th>
                    <th>Role / Status</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsersList.length > 0 ? currentUsersList.map((user) => (
                    <tr key={user.id}>
                      <td className="user-info-cell">
                        <img src={user.img} alt="" className="user-avatar" onError={(e)=>{e.target.src='https://i.pravatar.cc/150?u='+user.id}} />
                        <div className="user-details">
                          <span className="user-name">{user.name}</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                      </td>
                      <td className="user-id-cell">{user.id}</td>
                      <td className="user-date-cell">{user.date}</td>
                      <td>
                        <select 
                          className="admin-role-select"
                          value={user.status.toLowerCase()} 
                          onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                        >
                          <option value="buyer">Buyer</option>
                          <option value="supplier">Supplier</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="actions-col">
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleDeleteUser(user.id)} 
                            className="delete-btn" 
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
              {totalUserPages > 1 && <Pagination totalPages={totalUserPages} current={currentPage} setPage={setCurrentPage} />}
            </div>
          )}

          {/* ==========================================
              MANAGE PRODUCTS VIEW
              ========================================== */}
          {activeTab === 'products' && (
            <div className="admin-card-panel no-padding">
              
              <div className="admin-panel-header-actions">
                <div className="admin-actions-left">
                  <label className="admin-select-all">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAllProducts}
                      checked={selectedProductIds.length === currentProductsList.length && currentProductsList.length > 0} 
                    />
                    Select All
                  </label>
                  
                  <div className="admin-search-wrapper small">
                    <Search size={16} className="admin-search-icon" />
                    <input 
                      type="text" 
                      className="admin-search-input"
                      placeholder="Search Products..." 
                      value={productSearch} 
                      onChange={(e) => { setProductSearch(e.target.value); setCurrentPage(1); }} 
                    />
                  </div>
                </div>

                <button 
                  className="admin-btn-primary"
                  onClick={() => { setIsEditMode(false); setNewProdData({ name: '', price: '', moq: '', category: 'Furniture', status: 'Approved', description: '', image: '', imageFile: null }); setIsModalOpen(true); }} 
                >
                  <Plus size={16}/> Add Product
                </button>
              </div>

              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th className="checkbox-col"></th>
                    <th>Product Name</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProductsList.length > 0 ? currentProductsList.map((prod) => {
                    const imageSrc = prod?.image && (prod.image.startsWith('data:') || prod.image.startsWith('http') || prod.image.startsWith('/uploads/'))
                      ? prod.image
                      : `${import.meta.env.BASE_URL || '/'}${(prod?.image || '').replace(/^\//, '')}`;

                    return (
                      <tr key={prod.id}>
                        <td className="checkbox-col">
                          <input type="checkbox" checked={selectedProductIds.includes(prod.id)} onChange={(e) => handleSelectProduct(e, prod.id)} />
                        </td>
                        <td className="product-info-cell">
                          <img src={imageSrc} alt="" className="product-img" onError={(e)=>{e.target.src=DEFAULT_IMG}}/>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 'bold' }}>{prod?.name || 'Unnamed Product'}</span>
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>Supplier: {prod.supplier_name || 'Official'}</span>
                          </div>
                        </td>
                        <td className="product-price-cell">
                          <span className="price-val">{Number(prod?.price || 0).toLocaleString()}</span> <span className="currency">EGP</span>
                        </td>
                        <td className="product-qty-cell">
                          <span className="qty-val">{prod?.moq ? String(prod.moq).replace(/\D/g,'') : '10'}</span> <span className="unit">Unit</span>
                        </td>
                         <td>
                          <span className={`admin-prod-status ${prod?.status?.toLowerCase() || 'approved'}`}>
                            {prod?.status || 'Approved'} {prod?.status === 'Approved' && '✓'}
                          </span>
                        </td>
                        <td className="actions-col">
                          <div className="action-buttons">
                            {prod?.status !== 'Approved' && (
                              <button onClick={(e) => handleUpdateProductStatus(e, prod.id, 'Approved')} className="approve-btn" title="Approve Product"><Check size={18} /></button>
                            )}
                            {prod?.status !== 'Rejected' && (
                              <button onClick={(e) => handleUpdateProductStatus(e, prod.id, 'Rejected')} className="reject-btn" title="Reject Product"><X size={18} /></button>
                            )}
                            <button onClick={(e) => handleOpenEditModal(e, prod)} title="Edit"><Pencil size={18} /></button>
                            <button onClick={(e) => handleDeleteProduct(e, prod.id)} className="delete-btn" title="Delete"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" className="no-data" style={{ textAlign: 'center', padding: '30px' }}>No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalProductPages > 1 && <Pagination totalPages={totalProductPages} current={currentPage} setPage={setCurrentPage} />}
            </div>
          )}

        </main>
      </div>

      {/* Footer Area */}
      <div className="admin-footer-wrapper">
        <Footer />
      </div>

      {/* ==========================================
          MODAL (ADD / EDIT PRODUCT)
          ========================================== */}
      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <h3 className="admin-modal-title">{isEditMode ? 'Edit Product Card' : 'Create New Product Card'}</h3>
            <form onSubmit={handleSaveProduct}>
              <div className="admin-form-group">
                <label>Product Image</label>
                <div className="admin-image-upload-area" onClick={() => document.getElementById('admin-file-picker').click()} style={{ cursor: 'pointer' }}>
                  {newProdData.image ? 
                    <img src={newProdData.image} alt="" className="uploaded-img" /> : 
                    <div className="upload-placeholder"><ImageIcon size={32} /><span>Click to upload image</span></div>
                  }
                  <input type="file" id="admin-file-picker" accept="image/*" onChange={handleImageChange} className="file-input" style={{ display: 'none' }} />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Product Name</label>
                <input type="text" className="admin-input" value={newProdData.name} onChange={e => setNewProdData({...newProdData, name: e.target.value})} required />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Price (EGP)</label>
                  <input type="number" className="admin-input" value={newProdData.price} onChange={e => setNewProdData({...newProdData, price: e.target.value})} required />
                </div>
                <div className="admin-form-group">
                  <label>Quantity / MOQ</label>
                  <input type="text" className="admin-input" value={newProdData.moq} onChange={e => setNewProdData({...newProdData, moq: e.target.value})} placeholder="e.g. 50" />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Category</label>
                  <select className="admin-input" value={newProdData.category} onChange={e => setNewProdData({...newProdData, category: e.target.value})}>
                    <option value="Furniture">Furniture</option>
                    <option value="Textile">Textile</option>
                    <option value="Raw Material">Raw Material</option>
                    <option value="Package">Package</option>
                    <option value="Electronic & Spare Parts">Electronic & Spare Parts</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Status</label>
                  <select className="admin-input" value={newProdData.status} onChange={e => setNewProdData({...newProdData, status: e.target.value})}>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div className="admin-form-group">
                <label>Description</label>
                <textarea className="admin-textarea" value={newProdData.description} onChange={e => setNewProdData({...newProdData, description: e.target.value})}></textarea>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="admin-btn-save">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// REUSABLE COMPONENTS
// ==========================================
const StatCard = ({ label, val, icon }) => (
  <div className="admin-stat-card">
    <div>
      <p>{label}</p>
      <h2>{val}</h2>
    </div>
    <div className="stat-icon-wrapper">
      {icon}
    </div>
  </div>
);

const Pagination = ({ totalPages, current, setPage }) => (
  <div className="admin-pagination">
    <div className="admin-pagination-controls">
      {[...Array(totalPages)].map((_, i) => (
        <span 
          key={i} 
          onClick={() => setPage(i + 1)} 
          className={`page-num ${current === i + 1 ? 'active' : ''}`}
        >
          {i + 1}
        </span>
      ))}
      <button 
        disabled={current === totalPages || totalPages === 0} 
        onClick={() => setPage(p => p + 1)} 
        className="page-next"
      >
        <ArrowRight size={18} />
      </button>
    </div>
  </div>
);