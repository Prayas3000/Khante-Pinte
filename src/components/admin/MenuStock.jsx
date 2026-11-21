import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Edit3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { currency } from '@/utils/formatters';

export function MenuStock({ products, setProducts }) {
  const [categoriesList, setCategoriesList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [busyIds, setBusyIds] = useState([]);
  const [uploadingImage, setUploadingImage] = useState('');
  const [quickUploadItem, setQuickUploadItem] = useState(null);
  const [feedback, setFeedback] = useState('');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [photoFilter, setPhotoFilter] = useState('all'); // 'all' | 'missing' | 'has_photo'
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in_stock' | 'out_of_stock'

  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Add Item State
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    price: '',
    description: '',
    categoryId: '',
    image_url: ''
  });

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('id, name, active, display_order')
        .eq('active', true)
        .order('display_order', { ascending: true });
      if (error) {
        console.error('Categories loading failed:', error);
        return;
      }
      setCategoriesList(data || []);
    };
    loadCategories();
  }, []);

  const formatProduct = item => ({
    id: item.id,
    name: item.name,
    category: item.menu_categories?.name || 'Other',
    categoryId: item.category_id,
    price: Number(item.price),
    description: item.description || '',
    tag: '',
    emoji: '🍽️',
    image_url: item.image_url,
    outOfStock: !item.available || Number(item.stock_quantity) === 0
  });

  // Calculate statistics
  const totalCount = products.length;
  const withPhotoCount = products.filter(p => !!p.image_url).length;
  const missingPhotoCount = totalCount - withPhotoCount;
  const outOfStockCount = products.filter(p => p.outOfStock).length;
  const photoPercent = totalCount ? Math.round((withPhotoCount / totalCount) * 100) : 0;

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search
      const matchesSearch =
        !search.trim() ||
        `${p.name} ${p.category} ${p.description || ''}`
          .toLowerCase()
          .includes(search.toLowerCase());

      // Category
      const matchesCategory =
        categoryFilter === 'All' || p.category === categoryFilter;

      // Photo
      const matchesPhoto =
        photoFilter === 'all' ||
        (photoFilter === 'missing' && !p.image_url) ||
        (photoFilter === 'has_photo' && !!p.image_url);

      // Stock
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in_stock' && !p.outOfStock) ||
        (stockFilter === 'out_of_stock' && p.outOfStock);

      return matchesSearch && matchesCategory && matchesPhoto && matchesStock;
    });
  }, [products, search, categoryFilter, photoFilter, stockFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, photoFilter, stockFilter]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  // Image Upload Handler
  const uploadMenuImage = async (file, setter, key) => {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      alert('Choose a JPG, PNG or WEBP image smaller than 5 MB.');
      return;
    }
    setUploadingImage(key);
    try {
      const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
      const path = `menu/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('kp-menu-images')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('kp-menu-images').getPublicUrl(path);
      setter(v => ({ ...v, image_url: data.publicUrl }));
      setFeedback('Photo uploaded successfully!');
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) {
      alert(`Image upload failed: ${e.message}`);
    } finally {
      setUploadingImage('');
    }
  };

  // Direct 1-Click Photo Upload for any item
  const handleDirectPhotoUpload = async (product, file) => {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      alert('Choose a JPG, PNG or WEBP image smaller than 5 MB.');
      return;
    }
    setQuickUploadItem(product.id);
    try {
      const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
      const path = `menu/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('kp-menu-images')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pubData } = supabase.storage.from('kp-menu-images').getPublicUrl(path);
      const newUrl = pubData.publicUrl;

      const { error: dbErr } = await supabase
        .from('menu_items')
        .update({ image_url: newUrl })
        .eq('id', product.id);
      if (dbErr) throw dbErr;

      setProducts(current =>
        current.map(p => (p.id === product.id ? { ...p, image_url: newUrl } : p))
      );
      setFeedback(`Photo saved for "${product.name}"!`);
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) {
      alert(`Photo upload failed: ${e.message}`);
    } finally {
      setQuickUploadItem(null);
    }
  };

  // Remove Photo
  const handleRemovePhoto = async product => {
    if (!confirm(`Remove photo from "${product.name}"?`)) return;
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ image_url: null })
        .eq('id', product.id);
      if (error) throw error;
      setProducts(current =>
        current.map(p => (p.id === product.id ? { ...p, image_url: null } : p))
      );
      setFeedback(`Photo removed from "${product.name}".`);
      setTimeout(() => setFeedback(''), 4000);
    } catch (e) {
      alert(`Could not remove photo: ${e.message}`);
    }
  };

  const startEdit = product => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      price: String(product.price),
      description: product.description || '',
      categoryId: product.categoryId || '',
      image_url: product.image_url || ''
    });
  };

  const saveItem = async (product, form, isNew = false) => {
    if (
      !form.name?.trim() ||
      form.price === '' ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0 ||
      !form.categoryId
    ) {
      alert('Please enter a valid name, price and category.');
      return;
    }
    const key = isNew ? 'new' : product.id;
    setSavingId(key);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        description: (form.description || '').trim(),
        category_id: form.categoryId,
        image_url: (form.image_url || '').trim() || null
      };
      const result = isNew
        ? await supabase
            .from('menu_items')
            .insert({ ...payload, available: true, stock_quantity: 1 })
            .select(
              'id, category_id, name, description, price, image_url, available, stock_quantity, menu_categories(name)'
            )
            .single()
        : await supabase
            .from('menu_items')
            .update(payload)
            .eq('id', product.id)
            .select(
              'id, category_id, name, description, price, image_url, available, stock_quantity, menu_categories(name)'
            )
            .maybeSingle();

      if (result.error) throw result.error;
      if (!result.data) throw new Error('No item was returned.');
      const formatted = formatProduct(result.data);
      setProducts(current =>
        isNew ? [...current, formatted] : current.map(p => (p.id === product.id ? formatted : p))
      );
      if (isNew) {
        setAddForm({ name: '', price: '', description: '', categoryId: '', image_url: '' });
        setShowAddForm(false);
      } else {
        setEditingId(null);
      }
      setFeedback(isNew ? 'New item added successfully!' : 'Item saved successfully!');
      setTimeout(() => setFeedback(''), 4000);
    } catch (error) {
      console.error('Menu item save failed:', error);
      alert(`Could not save menu item: ${error.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async product => {
    if (!confirm(`Delete "${product.name}" permanently?`)) return;
    setBusyIds(current => [...current, product.id]);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', product.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('No row was deleted.');
      setProducts(current => current.filter(p => p.id !== product.id));
      if (editingId === product.id) setEditingId(null);
    } catch (error) {
      alert(`Delete failed: ${error.message}`);
    } finally {
      setBusyIds(current => current.filter(id => id !== product.id));
    }
  };

  const toggle = async product => {
    if (busyIds.includes(product.id)) return;
    const unavailable = !product.outOfStock;
    setBusyIds(current => [...current, product.id]);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ available: !unavailable, stock_quantity: unavailable ? 0 : 1 })
        .eq('id', product.id)
        .select('id, available, stock_quantity')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('No item was updated.');
      setProducts(current =>
        current.map(p =>
          p.id === product.id
            ? { ...p, outOfStock: !data.available || Number(data.stock_quantity) === 0 }
            : p
        )
      );
    } catch (error) {
      alert(`Availability update failed: ${error.message}`);
    } finally {
      setBusyIds(current => current.filter(id => id !== product.id));
    }
  };

  return (
    <section className="panel" style={{ padding: '22px' }}>
      {/* Header & Stats Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Menu & Stock Studio</h2>
          <p style={{ margin: '4px 0 0', color: '#667085', fontSize: 13 }}>
            Manage {totalCount} items, upload food photography, update prices, and control stock.
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? 'Close Add Form' : 'Add New Item'}
        </button>
      </div>

      {feedback && (
        <div style={{
          padding: '10px 14px',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 10,
          color: '#065f46',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16
        }}>
          ✓ {feedback}
        </div>
      )}

      {/* Photography Progress Card */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={18} color="#0284c7" />
            <strong style={{ fontSize: 14, color: '#0f172a' }}>
              Food Photography Progress: {withPhotoCount} / {totalCount} items ({photoPercent}%)
            </strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPhotoFilter('missing')}
              style={{
                border: '1px solid #fed7aa',
                background: photoFilter === 'missing' ? '#ea580c' : '#fff7ed',
                color: photoFilter === 'missing' ? '#fff' : '#c2410c',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⚠️ {missingPhotoCount} Missing Photos
            </button>
            <button
              onClick={() => setPhotoFilter('has_photo')}
              style={{
                border: '1px solid #bbf7d0',
                background: photoFilter === 'has_photo' ? '#16a34a' : '#f0fdf4',
                color: photoFilter === 'has_photo' ? '#fff' : '#15803d',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✅ {withPhotoCount} Has Photo
            </button>
            {photoFilter !== 'all' && (
              <button
                onClick={() => setPhotoFilter('all')}
                style={{
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#475569',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
        <div style={{
          width: '100%',
          height: 8,
          background: '#e2e8f0',
          borderRadius: 99,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${photoPercent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #10b981, #059669)',
            borderRadius: 99,
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Add New Item Expandable Panel */}
      {showAddForm && (
        <div className="panel" style={{ padding: 18, marginBottom: 20, border: '1px solid #cbd5e1', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Create New Menu Item</h3>
            <button className="icon-btn" onClick={() => setShowAddForm(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
            <input
              value={addForm.name}
              onChange={e => setAddForm(v => ({ ...v, name: e.target.value }))}
              placeholder="Item name (e.g. Chicken Biryani)"
            />
            <input
              type="number"
              min="0"
              value={addForm.price}
              onChange={e => setAddForm(v => ({ ...v, price: e.target.value }))}
              placeholder="Price (Rs.)"
            />
            <select
              value={addForm.categoryId}
              onChange={e => setAddForm(v => ({ ...v, categoryId: e.target.value }))}
            >
              <option value="">Select Category</option>
              {categoriesList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              value={addForm.description}
              onChange={e => setAddForm(v => ({ ...v, description: e.target.value }))}
              placeholder="Brief description..."
            />
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <label className="admin-file-label" style={{ margin: 0 }}>
              {uploadingImage === 'add' ? 'Uploading food photo…' : '📷 Upload Food Photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={e => uploadMenuImage(e.target.files?.[0], setAddForm, 'add')}
              />
            </label>
            <span style={{ fontSize: 12, color: '#667085' }}>or URL:</span>
            <input
              style={{ flex: 1, minWidth: 200 }}
              value={addForm.image_url}
              onChange={e => setAddForm(v => ({ ...v, image_url: e.target.value }))}
              placeholder="https://..."
            />
            {addForm.image_url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={addForm.image_url}
                  alt="Preview"
                  style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }}
                />
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  onClick={() => setAddForm(v => ({ ...v, image_url: '' }))}
                >
                  Clear Photo
                </button>
              </div>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={() => saveItem(null, addForm, true)}
            disabled={savingId === 'new'}
          >
            {savingId === 'new' ? 'Adding…' : 'Save & Publish Menu Item'}
          </button>
        </div>
      )}

      {/* Toolbar: Search & Multi-Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
        <div className="search-box" style={{ minWidth: 0 }}>
          <Search size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items by name..."
          />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="All">All Categories ({categoriesList.length})</option>
          {categoriesList.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select value={photoFilter} onChange={e => setPhotoFilter(e.target.value)}>
          <option value="all">All Photo Statuses</option>
          <option value="missing">Missing Photo Only ({missingPhotoCount})</option>
          <option value="has_photo">Has Photo ({withPhotoCount})</option>
        </select>
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}>
          <option value="all">All Availability</option>
          <option value="in_stock">In Stock Only</option>
          <option value="out_of_stock">Out of Stock Only ({outOfStockCount})</option>
        </select>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12, color: '#64748b' }}>
        <span>Showing <strong>{filteredProducts.length}</strong> items (Page {page} of {totalPages})</span>
        {filteredProducts.length !== totalCount && (
          <button
            className="btn-outline"
            style={{ padding: '3px 8px', fontSize: 11 }}
            onClick={() => {
              setSearch('');
              setCategoryFilter('All');
              setPhotoFilter('all');
              setStockFilter('all');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Item Rows List */}
      <div className="inventory-list">
        {paginatedProducts.length ? (
          paginatedProducts.map(p => (
            <div
              className="inventory-row"
              key={p.id}
              style={{
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #f1f5f9',
                display: 'grid',
                gridTemplateColumns: '60px 1.4fr 0.8fr 1fr auto',
                gap: 12
              }}
            >
              {/* Photo Thumbnail / Emoji */}
              <div style={{ position: 'relative', width: 52, height: 52 }}>
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    style={{
                      width: 52,
                      height: 52,
                      objectFit: 'cover',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 10,
                      background: '#f1f5f9',
                      border: '1px dashed #cbd5e1',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 22
                    }}
                    title="No photo uploaded yet"
                  >
                    🍽️
                  </div>
                )}
              </div>

              {/* Item Details or Inline Edit Form */}
              {editingId === p.id ? (
                <div style={{ gridColumn: '2 / -1', background: '#f8fafc', padding: 14, borderRadius: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm(v => ({ ...v, name: e.target.value }))}
                      placeholder="Name"
                    />
                    <input
                      type="number"
                      min="0"
                      value={editForm.price}
                      onChange={e => setEditForm(v => ({ ...v, price: e.target.value }))}
                      placeholder="Price"
                    />
                    <select
                      value={editForm.categoryId}
                      onChange={e => setEditForm(v => ({ ...v, categoryId: e.target.value }))}
                    >
                      {categoriesList.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    style={{ width: '100%', marginBottom: 10 }}
                    value={editForm.description}
                    onChange={e => setEditForm(v => ({ ...v, description: e.target.value }))}
                    placeholder="Description..."
                  />
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                    <label className="admin-file-label" style={{ margin: 0, padding: '7px 11px', fontSize: 12 }}>
                      {uploadingImage === p.id ? 'Uploading…' : '📷 Change Photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={e => uploadMenuImage(e.target.files?.[0], setEditForm, p.id)}
                      />
                    </label>
                    <input
                      style={{ flex: 1, minWidth: 160 }}
                      value={editForm.image_url}
                      onChange={e => setEditForm(v => ({ ...v, image_url: e.target.value }))}
                      placeholder="Photo URL"
                    />
                    {editForm.image_url && (
                      <button
                        type="button"
                        className="danger-soft"
                        onClick={() => setEditForm(v => ({ ...v, image_url: '' }))}
                      >
                        Clear Photo
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-primary"
                      onClick={() => saveItem(p, editForm)}
                      disabled={savingId === p.id}
                    >
                      {savingId === p.id ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      className="btn-outline"
                      onClick={() => setEditingId(null)}
                      disabled={savingId === p.id}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="inventory-name">
                    <strong>{p.name}</strong>
                    <small style={{ color: '#64748b' }}>{p.category}</small>
                    {p.description && (
                      <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
                        {p.description}
                      </div>
                    )}
                  </div>

                  <b>{currency(p.price)}</b>

                  {/* Photo Quick Upload / Status */}
                  <div>
                    {p.image_url ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Has photo</span>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '3px 6px', fontSize: 10 }}
                          title="Remove photo"
                          onClick={() => handleRemovePhoto(p)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label
                        className="btn-outline"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 8px',
                          fontSize: 11,
                          color: '#c2410c',
                          borderColor: '#fed7aa',
                          background: '#fffaf5',
                          cursor: 'pointer'
                        }}
                      >
                        <Camera size={13} />
                        {quickUploadItem === p.id ? 'Uploading…' : 'Add Photo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: 'none' }}
                          onChange={e => handleDirectPhotoUpload(p, e.target.files?.[0])}
                          disabled={quickUploadItem === p.id}
                        />
                      </label>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      className={p.outOfStock ? 'btn-outline' : 'danger-soft'}
                      style={{ padding: '5px 9px', fontSize: 11 }}
                      onClick={() => toggle(p)}
                      disabled={busyIds.includes(p.id)}
                    >
                      {busyIds.includes(p.id)
                        ? '...'
                        : p.outOfStock
                        ? 'Mark Available'
                        : 'Out of Stock'}
                    </button>
                    <button
                      className="btn-outline"
                      style={{ padding: '5px 8px', fontSize: 11 }}
                      onClick={() => startEdit(p)}
                    >
                      Edit
                    </button>
                    <button
                      className="danger-soft"
                      style={{ padding: '5px 8px', fontSize: 11 }}
                      onClick={() => handleDelete(p)}
                      disabled={busyIds.includes(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
            No menu items found matching the current search or filters.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
          <button
            className="btn-outline"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12 }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            className="btn-outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12 }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
