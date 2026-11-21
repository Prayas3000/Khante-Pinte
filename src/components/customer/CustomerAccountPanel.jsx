import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { currency, sanitizePlainText } from '@/utils/formatters';

export function CustomerAccountPanel({ account, onClose, onUpdated, onTrackOrder }) {
  const [profile, setProfile] = useState({
    id: '',
    name: account.name || '',
    phone: account.phone || '',
    email: account.email || '',
    avatar_url: account.avatarUrl || ''
  });
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [addressText, setAddressText] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    let live = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        if (live) {
          setError('Please log in again to view your account.');
          setLoading(false);
        }
        return;
      }
      const meta = user.user_metadata || {};
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert(
          {
            auth_user_id: user.id,
            name: profile.name || meta.full_name || user.email,
            phone: profile.phone || meta.phone || ''
          },
          { onConflict: 'auth_user_id' }
        )
        .select('id,name,phone,avatar_url')
        .single();

      if (customerError) {
        if (live) {
          setError(customerError.message);
          setLoading(false);
        }
        return;
      }
      if (!live) return;
      setProfile({
        id: customer.id,
        name: customer.name || '',
        phone: customer.phone || '',
        email: user.email || '',
        avatar_url: customer.avatar_url || ''
      });
      onUpdated({
        name: customer.name || '',
        phone: customer.phone || '',
        email: user.email || '',
        userId: user.id,
        avatarUrl: customer.avatar_url || ''
      });

      const [addressResult, orderResult] = await Promise.all([
        supabase
          .from('customer_addresses')
          .select('id,label,address,is_default,created_at')
          .eq('customer_id', customer.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.rpc('get_my_orders')
      ]);

      if (!live) return;
      if (addressResult.error) setError(addressResult.error.message);
      else setAddresses(addressResult.data || []);
      if (orderResult.error) setError(orderResult.error.message);
      else setOrders(orderResult.data || []);
      setLoading(false);
    };
    load();
    return () => {
      live = false;
    };
  }, []);

  const saveProfile = async () => {
    setError('');
    setMessage('');
    const cleanName = sanitizePlainText(profile.name, 50);
    const digits = profile.phone.replace(/\D/g, '');
    if (!cleanName || cleanName.length < 3) {
      setError('Please enter your full name (at least 3 characters).');
      return;
    }
    if (cleanName.length > 50) {
      setError('Name cannot exceed 50 characters.');
      return;
    }
    if (digits.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase
      .from('customers')
      .update({ name: cleanName, phone: digits })
      .eq('id', profile.id);

    if (!updateError) {
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: cleanName, phone: digits }
      });
      if (metaError) {
        setError(`Profile saved, but account details could not sync: ${metaError.message}`);
      } else {
        setMessage('Your profile has been updated.');
      }
      setProfile(p => ({ ...p, name: cleanName, phone: digits }));
      onUpdated({ name: cleanName, phone: digits });
    } else {
      setError(updateError.message);
    }
    setSaving(false);
  };

  const uploadAvatar = async file => {
    if (!file) return;
    setError('');
    setMessage('');
    const mimeToExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const ext = mimeToExt[file.type];
    if (!ext) {
      setError('Please choose a JPG, PNG or WEBP image. If your phone uses HEIC, save or export it as JPG first.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Your profile picture must be smaller than 5 MB.');
      return;
    }
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) {
        throw new Error('Your login session has expired. Please log in again and retry.');
      }
      if (!profile.id) {
        throw new Error('Your customer profile is still loading. Please wait a moment and retry.');
      }
      const path = `${authData.user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('customer-avatars')
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('customer-avatars').getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: saveError } = await supabase
        .from('customers')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);
      if (saveError) throw saveError;

      setProfile(p => ({ ...p, avatar_url: avatarUrl }));
      onUpdated({ avatarUrl });
      setMessage('Profile picture updated successfully.');
    } catch (uploadProblem) {
      setError(uploadProblem?.message || 'Could not upload your photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addAddress = async () => {
    setError('');
    setMessage('');
    const cleanAddress = sanitizePlainText(addressText, 100);
    const cleanLabel = sanitizePlainText(addressLabel, 20) || 'Home';
    if (!cleanAddress) {
      setError('Please enter your address.');
      return;
    }
    if (cleanAddress.length > 100) {
      setError('Address cannot exceed 100 characters.');
      return;
    }
    setSaving(true);
    if (!addresses.length) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', profile.id);
    }
    const { data, error: addError } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: profile.id,
        label: cleanLabel,
        address: cleanAddress,
        is_default: addresses.length === 0
      })
      .select('id,label,address,is_default,created_at')
      .single();

    if (addError) setError(addError.message);
    else {
      setAddresses(current => [data, ...current]);
      setAddressText('');
      setMessage('Address saved successfully.');
    }
    setSaving(false);
  };

  const makeDefault = async id => {
    setSaving(true);
    setError('');
    const { error: clearError } = await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', profile.id);

    const { error: setErrorDb } = clearError
      ? { error: clearError }
      : await supabase
          .from('customer_addresses')
          .update({ is_default: true })
          .eq('id', id)
          .eq('customer_id', profile.id);

    if (setErrorDb) setError(setErrorDb.message);
    else setAddresses(current => current.map(a => ({ ...a, is_default: a.id === id })));
    setSaving(false);
  };

  const deleteAddress = async id => {
    const { error: deleteError } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', id)
      .eq('customer_id', profile.id);
    if (deleteError) setError(deleteError.message);
    else setAddresses(current => current.filter(a => a.id !== id));
  };

  const updatePassword = async () => {
    setError('');
    setMessage('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (passwordError) setError(passwordError.message);
    else {
      setNewPassword('');
      setMessage('Password changed successfully.');
    }
    setSaving(false);
  };

  return (
    <div className="account-backdrop" onClick={onClose}>
      <section
        className="customer-account-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Your Khante Pinte account"
        onClick={e => e.stopPropagation()}
      >
        <header className="account-panel-head">
          <div>
            <span className="eyebrow">KHANTE PINTE / MY ACCOUNT</span>
            <h2>Your little corner.</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close account panel">
            <X />
          </button>
        </header>
        <div className="account-profile-hero">
          <div className="account-avatar-large">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Your profile" />
            ) : (
              (profile.name || 'K').slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <span className="account-welcome-label">GOOD TO SEE YOU AGAIN</span>
            <h3>
              Welcome,{' '}
              {profile.name ||
                (account.name && !String(account.name).includes('@')
                  ? account.name
                  : 'Food lover')}
              !
            </h3>
            <p>Your cravings, your orders, all in one place.</p>
          </div>
          <label className="avatar-upload-btn">
            Change photo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={e => uploadAvatar(e.target.files?.[0])}
            />
          </label>
        </div>
        <nav className="account-tabs">
          {[
            ['overview', 'Overview'],
            ['orders', 'Order history'],
            ['addresses', 'Saved addresses'],
            ['settings', 'Settings']
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="account-panel-body">
          {loading ? (
            <div className="account-loading">Getting your account ready…</div>
          ) : (
            <>
              {tab === 'overview' && (
                <>
                  <div className="account-stats">
                    <div>
                      <strong>{orders.length}</strong>
                      <small>Recent orders</small>
                    </div>
                    <div>
                      <strong>{addresses.length}</strong>
                      <small>Saved addresses</small>
                    </div>
                    <div>
                      <strong>{orders.filter(o => o.status === 'delivered').length}</strong>
                      <small>Delivered</small>
                    </div>
                  </div>
                  <div className="account-section-card account-recent-orders">
                    <div className="account-card-heading">
                      <div>
                        <h3>Recent orders</h3>
                        <p>Your latest Khante Pinte orders at a glance.</p>
                      </div>
                      <button className="account-view-all" onClick={() => setTab('orders')}>
                        View all orders <span>→</span>
                      </button>
                    </div>
                    {orders.slice(0, 3).length ? (
                      orders.slice(0, 3).map(o => (
                        <div className="account-order-row" key={o.id || o.orderNumber}>
                          <div>
                            <strong>{o.orderCode || o.id}</strong>
                            <small>
                              {new Date(o.createdAt || o.created_at).toLocaleDateString('en-NP')} ·{' '}
                              {(o.items || o.order_items || []).reduce((n, i) => n + Number(i.qty || i.quantity || 1), 0)} items
                            </small>
                          </div>
                          <span
                            className={`account-status status-${String(o.status).replaceAll(
                              '_',
                              '-'
                            )}`}
                          >
                            {String(o.status).replaceAll('_', ' ')}
                          </span>
                          <b>{currency(o.total)}</b>
                        </div>
                      ))
                    ) : (
                      <p className="account-muted">
                        Your first delicious order is waiting to happen.
                      </p>
                    )}
                  </div>
                </>
              )}

              {tab === 'orders' && (
                <div className="account-section-card account-history-card">
                  <div className="account-card-heading">
                    <div>
                      <h3>Your order history</h3>
                      <p>{orders.length} recent orders associated with this account</p>
                    </div>
                    <span className="account-history-count">{orders.length}</span>
                  </div>
                  {orders.length ? (
                    orders.map(o => (
                      <div className="account-order-full" key={o.id || o.orderNumber}>
                        <div className="account-order-row">
                          <div>
                            <strong>{o.orderCode || o.id}</strong>
                            <small>
                              {new Date(o.createdAt || o.created_at).toLocaleString('en-NP')} · {o.type || o.order_type}
                            </small>
                          </div>
                          <span
                            className={`account-status status-${String(o.status).replaceAll(
                              '_',
                              '-'
                            )}`}
                          >
                            {String(o.status).replaceAll('_', ' ')}
                          </span>
                          <b>{currency(o.total)}</b>
                        </div>
                        <p>
                          {(o.items || o.order_items || [])
                            .map(i => `${i.qty || i.quantity} × ${i.name || i.item_name}`)
                            .join(' · ')}
                        </p>
                        {onTrackOrder && (
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ marginTop: 8, fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => onTrackOrder(o.orderCode || o.id)}
                          >
                            Track live updates →
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="account-muted">
                      No orders yet. Your next favourite meal is just around the corner.
                    </p>
                  )}
                </div>
              )}

              {tab === 'addresses' && (
                <>
                  <div className="account-section-card">
                    <h3>Saved delivery spots</h3>
                    {addresses.map(a => (
                      <div className="saved-address-row" key={a.id}>
                        <div>
                          <strong>
                            {a.label}{' '}
                            {a.is_default && (
                              <span className="default-address-tag">DEFAULT</span>
                            )}
                          </strong>
                          <p>{a.address}</p>
                        </div>
                        <div>
                          {!a.is_default && (
                            <button className="text-link" onClick={() => makeDefault(a.id)}>
                              Make default
                            </button>
                          )}
                          <button
                            className="text-link danger-link"
                            onClick={() => deleteAddress(a.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {!addresses.length && (
                      <p className="account-muted">
                        Save your home, work or favourite delivery address for quicker checkout.
                      </p>
                    )}
                  </div>
                  <div className="account-section-card">
                    <h3>Add a new address</h3>
                    <label>
                      Label
                      <input
                        value={addressLabel}
                        maxLength={20}
                        onChange={e => setAddressLabel(e.target.value.slice(0, 20))}
                        placeholder="Home, Work…"
                      />
                    </label>
                    <label>
                      Full address
                      <textarea
                        value={addressText}
                        maxLength={100}
                        onChange={e => setAddressText(e.target.value.slice(0, 100))}
                        rows={3}
                        placeholder="House, street, area and nearby landmark"
                      />
                      <small style={{ display: 'block', textAlign: 'right', color: '#667085', fontSize: 11, marginTop: 2 }}>
                        {addressText.length}/100 characters
                      </small>
                    </label>
                    <button className="btn-primary" disabled={saving} onClick={addAddress}>
                      Save address
                    </button>
                  </div>
                </>
              )}

              {tab === 'settings' && (
                <>
                  <div className="account-section-card">
                    <h3>Personal details</h3>
                    <label>
                      Full name
                      <input
                        value={profile.name}
                        minLength={3}
                        maxLength={50}
                        onChange={e =>
                          setProfile(p => ({ ...p, name: e.target.value.slice(0, 50) }))
                        }
                        placeholder="Your full name (3-50 characters)"
                      />
                    </label>
                    <label>
                      Phone number
                      <input
                        value={profile.phone}
                        onChange={e =>
                          setProfile(p => ({
                            ...p,
                            phone: e.target.value.replace(/\D/g, '').slice(0, 10)
                          }))
                        }
                        inputMode="numeric"
                        maxLength={10}
                      />
                    </label>
                    <label>
                      Email address
                      <input value={profile.email} disabled />
                    </label>
                    <button className="btn-primary" disabled={saving} onClick={saveProfile}>
                      Save changes
                    </button>
                  </div>
                  <div className="account-section-card">
                    <h3>Change password</h3>
                    <label>
                      New password
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                      />
                    </label>
                    <button
                      className="btn-outline"
                      disabled={saving}
                      onClick={updatePassword}
                    >
                      Update password
                    </button>
                  </div>
                  <button
                    className="account-signout"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      onClose();
                    }}
                  >
                    Log out of Khante Pinte
                  </button>
                </>
              )}
              {error && <p className="form-error account-message">{error}</p>}
              {message && <p className="form-success account-message">{message}</p>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
