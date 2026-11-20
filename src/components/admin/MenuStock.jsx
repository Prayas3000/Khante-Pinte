import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { currency } from '@/utils/formatters';

export function MenuStock({ products, setProducts }) {
  const [categoriesList, setCategoriesList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [busyIds, setBusyIds] = useState([]);
  const [addForm, setAddForm] = useState({
    name: '',
    price: '',
    description: '',
    categoryId: '',
    image_url: ''
  });
  const [uploadingImage, setUploadingImage] = useState('');

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
    } catch (e) {
      alert(`Image upload failed: ${e.message}`);
    } finally {
      setUploadingImage('');
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('id, name, active, display_order')
        .eq('active', true)
        .order('display_order', { ascending: true });
      if (error) {
        console.error('Categories loading failed:', error);
        alert('Could not load categories.');
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
      if (!result.data) throw new Error('No item was returned. Check database permissions.');
      const formatted = formatProduct(result.data);
      setProducts(current =>
        isNew ? [...current, formatted] : current.map(p => (p.id === product.id ? formatted : p))
      );
      if (isNew) {
        setAddForm({ name: '', price: '', description: '', categoryId: '', image_url: '' });
      } else {
        setEditingId(null);
      }
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
      if (!data) throw new Error('No row was deleted. Check the DELETE policy.');
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
      if (!data) throw new Error('No item was updated. Check the UPDATE policy.');
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

  const fieldStyle = { minWidth: 0, width: '100%' };
  const renderFields = (form, setter, compact = false) => (
    <>
      <input
        style={fieldStyle}
        value={form.name || ''}
        onChange={e => setter(v => ({ ...v, name: e.target.value }))}
        placeholder="Food item name"
      />
      <input
        style={fieldStyle}
        type="number"
        min="0"
        value={form.price ?? ''}
        onChange={e => setter(v => ({ ...v, price: e.target.value }))}
        placeholder="Price (Rs.)"
      />
      <select
        style={fieldStyle}
        value={form.categoryId || ''}
        onChange={e => setter(v => ({ ...v, categoryId: e.target.value }))}
      >
        <option value="">Select category</option>
        {categoriesList.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {!compact && (
        <>
          <input
            style={fieldStyle}
            value={form.description || ''}
            onChange={e => setter(v => ({ ...v, description: e.target.value }))}
            placeholder="Description"
          />
          <input
            style={fieldStyle}
            value={form.image_url || ''}
            onChange={e => setter(v => ({ ...v, image_url: e.target.value }))}
            placeholder="Image URL (optional)"
          />
          <label className="admin-file-label">
            {uploadingImage === 'add' ? 'Uploading image…' : 'Upload food photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={e => uploadMenuImage(e.target.files?.[0], setter, 'add')}
            />
          </label>
        </>
      )}
    </>
  );

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>Menu Management</h3>
          <small>Add, edit, delete food items and manage availability.</small>
        </div>
      </div>
      <div className="panel" style={{ padding: 16, marginBottom: 20 }}>
        <h3>Add New Menu Item</h3>
        <div className="add-product-row">{renderFields(addForm, setAddForm)}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button
            className="btn-primary"
            onClick={() => saveItem(null, addForm, true)}
            disabled={savingId === 'new'}
          >
            {savingId === 'new' ? 'Adding…' : 'Add Menu Item'}
          </button>
        </div>
      </div>
      <div className="inventory-list">
        {products.map(p => (
          <div
            className="inventory-row"
            key={p.id}
            style={editingId === p.id ? { alignItems: 'center', flexWrap: 'wrap' } : undefined}
          >
            <span className="inventory-emoji">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 12 }}
                />
              ) : (
                p.emoji || '🍽️'
              )}
            </span>
            {editingId === p.id ? (
              <div style={{ flex: '1 1 100%', minWidth: 0 }}>
                <div className="menu-edit-primary-fields">
                  {renderFields(editForm, setEditForm, true)}
                </div>
                <div className="menu-edit-fields">
                  <label className="menu-edit-field menu-edit-description">
                    Description
                    <textarea
                      rows={3}
                      value={editForm.description || ''}
                      onChange={e =>
                        setEditForm(v => ({ ...v, description: e.target.value }))
                      }
                      placeholder="Describe the food item…"
                    />
                  </label>
                  <label className="menu-edit-field">
                    Photo URL (optional)
                    <input
                      style={fieldStyle}
                      value={editForm.image_url || ''}
                      onChange={e =>
                        setEditForm(v => ({ ...v, image_url: e.target.value }))
                      }
                      placeholder="Paste an image URL if you are not uploading a photo"
                    />
                  </label>
                  <div className="menu-edit-actions">
                    <label className="admin-file-label">
                      {uploadingImage === p.id
                        ? 'Uploading image…'
                        : 'Choose / replace food photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={e => uploadMenuImage(e.target.files?.[0], setEditForm, p.id)}
                      />
                    </label>
                    <div className="menu-edit-buttons">
                      <button
                        className="btn-primary"
                        onClick={() => saveItem(p, editForm)}
                        disabled={savingId === p.id}
                      >
                        {savingId === p.id ? 'Saving…' : 'Save changes'}
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
                </div>
              </div>
            ) : (
              <>
                <div className="inventory-name">
                  <strong>{p.name}</strong>
                  <small>{p.category}</small>
                </div>
                <b>{currency(p.price)}</b>
                <span className={p.outOfStock ? 'stock-off' : 'stock-on'}>
                  {p.outOfStock ? 'Out of stock' : 'Available'}
                </span>
                <button className="btn-outline" onClick={() => startEdit(p)}>
                  Edit
                </button>
                <button
                  className={p.outOfStock ? 'btn-outline' : 'danger-soft'}
                  onClick={() => toggle(p)}
                  disabled={busyIds.includes(p.id)}
                >
                  {busyIds.includes(p.id)
                    ? 'Please wait…'
                    : p.outOfStock
                    ? 'Mark available'
                    : 'Out of stock'}
                </button>
                <button
                  className="danger-soft"
                  onClick={() => handleDelete(p)}
                  disabled={busyIds.includes(p.id)}
                >
                  {busyIds.includes(p.id) ? 'Please wait…' : 'Delete'}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
