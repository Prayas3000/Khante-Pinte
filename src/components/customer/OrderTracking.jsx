import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Clock, ShoppingBag, CheckCircle2, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { currency } from '@/utils/formatters';

const mapStatus = {
  pending: 'New',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const statusBadgeStyles = {
  New: { bg: '#eff8ff', text: '#175cd3', border: '#b2ddff' },
  Confirmed: { bg: '#fef6ee', text: '#b54708', border: '#fecdca' },
  Preparing: { bg: '#fff6ed', text: '#c4320a', border: '#fdc69a' },
  Ready: { bg: '#f4f3ff', text: '#5925dc', border: '#d9d6fe' },
  'Out for Delivery': { bg: '#ecfdf3', text: '#027a48', border: '#a6f4c5' },
  Delivered: { bg: '#ecfdf3', text: '#027a48', border: '#a6f4c5' },
  Cancelled: { bg: '#fef3f2', text: '#b42318', border: '#fecdca' }
};

export function OrderTracking({ orderId, phone, account, onClose, onLookup }) {
  const [id, setId] = useState(orderId || '');
  const [ph, setPh] = useState(phone || '');
  const [order, setOrder] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [guestRecentOrders, setGuestRecentOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(orderId ? 'detail' : (account?.userId ? 'history' : 'lookup'));

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kp_guest_recent_orders');
      if (raw) {
        const parsed = JSON.parse(raw);
        const active = (Array.isArray(parsed) ? parsed : []).filter(
          o => o.expiresAt && Date.now() < o.expiresAt
        );
        setGuestRecentOrders(active);
        // If guest has not specified an ID and has recent orders, default to most recent
        if (!account?.userId && !orderId && active.length > 0) {
          setId(active[0].orderCode);
          setPh(active[0].phone);
        }
      }
    } catch {}
  }, [account?.userId, orderId]);

  const steps = [
    { label: 'Order received', status: 'New', detail: 'We have received your order.' },
    { label: 'Order confirmed', status: 'Confirmed', detail: 'The kitchen has confirmed your order.' },
    { label: 'Preparing your food', status: 'Preparing', detail: 'Your food is being freshly prepared.' },
    { label: 'Ready', status: 'Ready', detail: order?.type === 'Pickup' ? 'Ready for pickup at counter.' : 'Your order is packed and ready.' },
    ...(order?.type === 'Delivery'
      ? [{ label: 'Out for delivery', status: 'Out for Delivery', detail: 'Your rider is on the way.' }]
      : []),
    {
      label: order?.type === 'Pickup' ? 'Picked up' : 'Delivered',
      status: 'Delivered',
      detail:
        order?.type === 'Pickup'
          ? 'Your order has been picked up. Enjoy!'
          : 'Your order has been delivered. Enjoy!'
    }
  ];

  // Load all orders for logged-in user
  const loadMyOrders = async () => {
    if (!account?.userId) return;
    setLoadingHistory(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_my_orders');
      if (rpcErr) throw rpcErr;
      const formatted = (data || []).map(o => ({
        ...o,
        id: o.orderCode || o.id,
        orderCode: o.orderCode || o.id,
        status: mapStatus[o.status] || o.status,
        subtotal: Number(o.subtotal || 0),
        discount: Number(o.discount || 0),
        delivery: Number(o.delivery || 0),
        total: Number(o.total || 0),
        items: (o.items || []).map(item => ({
          ...item,
          qty: Number(item.qty || 1),
          price: Number(item.price || 0)
        })),
        events: (o.events || []).map(ev => ({
          ...ev,
          status: mapStatus[ev.status] || ev.status
        }))
      }));
      setMyOrders(formatted);

      // If orderId is provided, pre-select it
      if (orderId) {
        const cleanOrderId = String(orderId).toUpperCase().replace(/[^A-Z0-9]/g, '');
        const found = formatted.find(
          item =>
            (item.orderCode && item.orderCode.replace(/[^A-Z0-9]/g, '') === cleanOrderId) ||
            item.id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanOrderId ||
            item.seq === Number(cleanOrderId)
        );
        if (found) {
          setOrder(found);
          setViewMode('detail');
        } else {
          lookupOrder(orderId, phone);
        }
      }
    } catch (err) {
      console.warn('Could not load user order history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const lookupOrder = async (lookupId = id, lookupPhone = ph) => {
    const rawId = String(lookupId || '').trim().toUpperCase();
    const cleanId = rawId.replace(/[^A-Z0-9]/g, '');

    if (!cleanId || (!account?.userId && !String(lookupPhone || '').trim())) {
      setError(
        account?.userId
          ? 'Enter your order ID (e.g. KP9PG9ZG).'
          : 'Enter your 8-character order ID and the phone number used at checkout.'
      );
      setOrder(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = account?.userId
        ? await supabase.rpc('get_customer_order_tracking', {
            p_order_id: cleanId
          })
        : await supabase.rpc('get_website_order_tracking', {
            p_order_id: cleanId,
            p_customer_phone: String(lookupPhone).trim()
          });

      if (rpcError) throw rpcError;
      if (!data) {
        setOrder(null);
        setError('We could not find an order matching those details. Please check your order ID and phone number.');
        return;
      }

      setOrder({
        id: data.order_code || `KP-${data.order_number}`,
        orderCode: data.order_code,
        orderNumber: data.order_number,
        customer: data.customer_name,
        phone: data.customer_phone,
        type: data.order_type === 'pickup' ? 'Pickup' : 'Delivery',
        status: mapStatus[data.status] || 'New',
        subtotal: Number(data.subtotal || 0),
        discount: Number(data.discount || 0),
        delivery: Number(data.delivery_fee || 0),
        cancellationReason: data.cancellation_reason || '',
        total: Number(data.total || 0),
        note: data.notes || '',
        riderName: data.rider_name || '',
        riderPhone: data.rider_phone || '',
        createdAt: data.created_at,
        items: (data.items || []).map((item, index) => ({
          id: `${data.order_number || data.order_code}-${index}`,
          name: item.item_name,
          qty: Number(item.quantity),
          price: Number(item.unit_price)
        })),
        events: (data.history || []).map(event => ({
          status: mapStatus[event.status] || event.status,
          time: event.changed_at
        }))
      });
      setViewMode('detail');
      onLookup?.(cleanId, String(lookupPhone).trim());
    } catch (lookupError) {
      console.error('Order tracking lookup failed:', lookupError);
      setOrder(null);
      setError(lookupError.message || 'Unable to load tracking details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account?.userId) {
      loadMyOrders();
    } else if (orderId && phone) {
      lookupOrder(orderId, phone);
    }
  }, [account?.userId]);

  const current = order ? steps.findIndex(step => step.status === order.status) : -1;
  const isCancelled = order?.status === 'Cancelled';
  const currentStep = current >= 0 ? steps[current] : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="checkout-modal tracking-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">ORDER TRACKING & HISTORY</span>
            <h2>
              {viewMode === 'detail' && order
                ? `Tracking ${order.id}`
                : account?.userId
                ? 'Your orders'
                : 'Track your order'}
            </h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close tracking">
            <X />
          </button>
        </div>

        {/* View Mode Navigation Tabs when Logged In */}
        {account?.userId && (
          <div className="tracking-tabs-bar" style={{ display: 'flex', gap: 8, padding: '12px 24px 0', borderBottom: '1px solid #eaecf0', background: '#fafaf6' }}>
            <button
              type="button"
              className={`tracking-tab-btn ${viewMode === 'history' ? 'active' : ''}`}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '10px 14px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                borderBottom: viewMode === 'history' ? '2px solid #2d4a22' : '2px solid transparent',
                color: viewMode === 'history' ? '#2d4a22' : '#667085'
              }}
              onClick={() => {
                setViewMode('history');
                loadMyOrders();
              }}
            >
              All my orders ({myOrders.length})
            </button>
            <button
              type="button"
              className={`tracking-tab-btn ${viewMode === 'lookup' ? 'active' : ''}`}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '10px 14px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                borderBottom: viewMode === 'lookup' ? '2px solid #2d4a22' : '2px solid transparent',
                color: viewMode === 'lookup' ? '#2d4a22' : '#667085'
              }}
              onClick={() => {
                setViewMode('lookup');
                setOrder(null);
              }}
            >
              Track by order ID
            </button>
            {order && (
              <button
                type="button"
                className={`tracking-tab-btn ${viewMode === 'detail' ? 'active' : ''}`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: '10px 14px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  borderBottom: viewMode === 'detail' ? '2px solid #2d4a22' : '2px solid transparent',
                  color: viewMode === 'detail' ? '#2d4a22' : '#667085'
                }}
                onClick={() => setViewMode('detail')}
              >
                Active tracking ({order.id})
              </button>
            )}
          </div>
        )}

        <div className="checkout-scroll">
          {/* VIEW 1: LOGGED-IN ORDER HISTORY LIST */}
          {account?.userId && viewMode === 'history' && (
            <div className="my-orders-list-view">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#667085' }}>
                  Showing all orders placed with <strong>{account.email || account.phone || account.name}</strong>
                </p>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', fontSize: 12 }}
                  onClick={loadMyOrders}
                  disabled={loadingHistory}
                >
                  <RefreshCw size={13} className={loadingHistory ? 'spin' : ''} /> Refresh
                </button>
              </div>

              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#667085' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
                  <p>Loading your orders...</p>
                </div>
              ) : myOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '45px 20px', background: '#fff', borderRadius: 16, border: '1px solid #eaecf0' }}>
                  <div style={{ fontSize: 42, marginBottom: 10 }}>🍲</div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>No orders yet</h3>
                  <p style={{ margin: '0 0 16px', color: '#667085', fontSize: 13 }}>
                    You haven't placed an order with this account yet. Explore our late-night menu and satisfy your cravings!
                  </p>
                  <button type="button" className="btn-primary" onClick={onClose}>
                    Explore delicious menu
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {myOrders.map(o => {
                    const badge = statusBadgeStyles[o.status] || { bg: '#eff8ff', text: '#175cd3', border: '#b2ddff' };
                    return (
                      <div
                        key={o.id}
                        className="customer-order-card"
                        style={{
                          background: '#fff',
                          border: '1px solid #e8ebd9',
                          borderRadius: 14,
                          padding: '16px',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setOrder(o);
                          setViewMode('detail');
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                          <div>
                            <strong style={{ fontSize: 16, color: '#17210e' }}>{o.id}</strong>
                            <div style={{ fontSize: 11, color: '#888b7f', marginTop: 3 }}>
                              {new Date(o.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {o.type}
                            </div>
                          </div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '5px 11px',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`
                            }}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
                            {o.status}
                          </span>
                        </div>

                        {/* Items Preview */}
                        <div style={{ fontSize: 12, color: '#4b5563', padding: '8px 10px', background: '#fafaf5', borderRadius: 8, marginBottom: 12 }}>
                          {o.items?.length
                            ? o.items.map(item => `${item.qty}× ${item.name}`).join(' · ')
                            : 'Order items'}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: 11, color: '#667085' }}>Total amount: </span>
                            <strong style={{ fontSize: 15, color: '#17210e' }}>{currency(o.total)}</strong>
                          </div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#2d4a22'
                            }}
                          >
                            Live tracking <ChevronRight size={15} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: MANUAL LOOKUP (FOR GUESTS OR SEARCHING OTHER IDS) */}
          {(!account?.userId || viewMode === 'lookup') && (
            <div>
              {account?.userId && (
                <button
                  type="button"
                  className="btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 12 }}
                  onClick={() => setViewMode('history')}
                >
                  <ArrowLeft size={14} /> Back to all my orders
                </button>
              )}

              {/* Guest Recent Orders saved in LocalStorage */}
              {!account?.userId && guestRecentOrders.length > 0 && (
                <div style={{ background: '#f5faee', border: '1px solid #dbe8ca', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#2d4a22', marginBottom: 10 }}>
                    <Clock size={16} /> Recent Orders on this Device
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {guestRecentOrders.map(rec => (
                      <div
                        key={rec.orderCode}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#fff',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          flexWrap: 'wrap',
                          gap: 8
                        }}
                      >
                        <div>
                          <strong style={{ color: '#182230', fontSize: 14 }}>{rec.orderCode}</strong>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {new Date(rec.placedAt).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })} · {currency(rec.total)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: 12 }}
                          onClick={() => {
                            setId(rec.orderCode);
                            setPh(rec.phone);
                            lookupOrder(rec.orderCode, rec.phone);
                          }}
                        >
                          Track Live
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label>
                8-character Order ID
                <input
                  value={id}
                  onChange={e => {
                    setId(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''));
                    setOrder(null);
                  }}
                  placeholder="e.g. KP9PG9ZG"
                />
              </label>
              {!account?.userId && (
                <label>
                  Phone number
                  <input
                    value={ph}
                    onChange={e => {
                      setPh(e.target.value);
                      setOrder(null);
                    }}
                    inputMode="tel"
                    placeholder="10-digit number used at checkout"
                  />
                </label>
              )}
              {account?.userId && (
                <p className="signed-tracking-note" style={{ fontSize: 12, color: '#586b46', background: '#edf4e5', padding: '9px 12px', borderRadius: 8, marginTop: 8 }}>
                  ✓ You're signed in! Orders associated with your account are verified securely.
                </p>
              )}
              <button
                className="btn-primary full"
                onClick={() => lookupOrder()}
                disabled={loading}
                style={{ marginTop: 12 }}
              >
                {loading ? 'Checking order…' : 'Track this order'}
              </button>
              {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
            </div>
          )}

          {/* VIEW 3: ACTIVE TRACKING DETAILS & PROGRESS TIMELINE */}
          {viewMode === 'detail' && order && (
            <div className="tracking-result">
              {account?.userId && myOrders.length > 0 && (
                <button
                  type="button"
                  className="btn-outline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 16,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#2d4a22',
                    background: '#f4f7ee'
                  }}
                  onClick={() => setViewMode('history')}
                >
                  <ArrowLeft size={14} /> View all my orders ({myOrders.length})
                </button>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <span className="eyebrow">ORDER NUMBER</span>
                  <h3 style={{ margin: '4px 0 0' }}>{order.id}</h3>
                  <small style={{ color: '#888', display: 'block', marginTop: 2 }}>
                    Placed on {new Date(order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </small>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    borderRadius: 999,
                    padding: '9px 15px',
                    fontWeight: 800,
                    fontSize: 13,
                    color: isCancelled
                      ? '#b42318'
                      : current === steps.length - 1
                      ? '#067647'
                      : '#175cd3',
                    background: isCancelled
                      ? '#fef3f2'
                      : current === steps.length - 1
                      ? '#ecfdf3'
                      : '#eff8ff',
                    border: `1px solid ${isCancelled ? '#fecdca' : current === steps.length - 1 ? '#a6f4c5' : '#b2ddff'}`
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'currentColor'
                    }}
                  />
                  {isCancelled
                    ? 'Cancelled'
                    : order.status === 'Ready' && order.type === 'Pickup'
                    ? 'Ready for pickup'
                    : order.status}
                </span>
              </div>

              <p style={{ margin: '12px 0 18px', color: '#55594e', lineHeight: 1.5, fontSize: 14 }}>
                {isCancelled
                  ? 'This order has been cancelled.'
                  : currentStep?.detail || `Your order status is currently ${order.status}.`}
              </p>

              {order.riderName && !isCancelled && (
                <div className="tracking-rider-card" style={{ background: '#f5faee', border: '1px solid #dbe8ca', borderRadius: 12, padding: '14px', marginBottom: 16 }}>
                  <div>
                    <strong style={{ display: 'block', color: '#2d4a22' }}>🚴 Your delivery rider</strong>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{order.riderName}</span>
                  </div>
                  {order.riderPhone && (
                    <a
                      href={`tel:${order.riderPhone}`}
                      style={{
                        display: 'inline-block',
                        marginTop: 6,
                        color: '#2d4a22',
                        fontWeight: 700,
                        textDecoration: 'underline'
                      }}
                    >
                      Call rider · {order.riderPhone}
                    </a>
                  )}
                </div>
              )}

              {isCancelled && order.cancellationReason && (
                <div
                  style={{
                    margin: '0 0 16px',
                    padding: 14,
                    borderRadius: 12,
                    background: '#fef3f2',
                    border: '1px solid #fecdca',
                    color: '#b42318'
                  }}
                >
                  <strong>Reason for cancellation:</strong>
                  <p style={{ margin: '5px 0 0', fontSize: 13 }}>{order.cancellationReason}</p>
                </div>
              )}

              {!isCancelled && (
                <div
                  style={{
                    border: '1px solid #e8ebd9',
                    borderRadius: 14,
                    padding: '18px 16px',
                    background: '#fff',
                    marginBottom: 16
                  }}
                >
                  <h4 style={{ margin: '0 0 18px', fontSize: 15, color: '#1e2918' }}>Live preparation progress</h4>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {steps.map((step, index) => {
                      const done = current >= index;
                      const active = current === index;
                      return (
                        <div
                          key={step.status}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '30px 1fr',
                            columnGap: 12,
                            minHeight: index === steps.length - 1 ? 30 : 58
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center'
                            }}
                          >
                            <span
                              style={{
                                width: 28,
                                height: 28,
                                flex: '0 0 28px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxSizing: 'border-box',
                                fontWeight: 800,
                                fontSize: 13,
                                color: done ? '#fff' : '#98a2b3',
                                background: done ? '#2d5a27' : '#fff',
                                border: done ? '2px solid #2d5a27' : '2px solid #d0d5dd',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              {done ? '✓' : index + 1}
                            </span>
                            {index !== steps.length - 1 && (
                              <span
                                style={{
                                  width: 2,
                                  flex: 1,
                                  minHeight: 26,
                                  background: current > index ? '#2d5a27' : '#e4e7ec'
                                }}
                              />
                            )}
                          </div>
                          <div style={{ padding: '3px 0 14px' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap'
                              }}
                            >
                              <strong
                                style={{
                                  fontSize: 14,
                                  color: done ? '#101828' : '#667085'
                                }}
                              >
                                {step.label}
                              </strong>
                              {active && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: '0.6px',
                                    color: '#067647',
                                    background: '#ecfdf3',
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    border: '1px solid #a6f4c5'
                                  }}
                                >
                                  CURRENT STATUS
                                </span>
                              )}
                            </div>
                            <small
                              style={{
                                display: 'block',
                                color: active ? '#2d5a27' : '#98a2b3',
                                marginTop: 3,
                                fontWeight: active ? 600 : 400
                              }}
                            >
                              {done ? (active ? 'In progress right now' : 'Completed') : 'Next up'}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Order Items Receipt breakdown */}
              <div style={{ border: '1px solid #e8ebd9', borderRadius: 14, padding: '16px', background: '#fff' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 15, color: '#1e2918' }}>Ordered items</h4>
                {order.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f1eb',
                      fontSize: 13
                    }}
                  >
                    <span>
                      <strong>{item.qty}×</strong> {item.name}
                    </span>
                    <strong>{currency(item.qty * item.price)}</strong>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid #e8ebd9',
                    display: 'grid',
                    gap: 8,
                    fontSize: 13
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#667085' }}>
                    <span>Subtotal</span>
                    <strong>{currency(order.subtotal)}</strong>
                  </div>
                  {order.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#067647' }}>
                      <span>Discount voucher</span>
                      <strong>−{currency(order.discount)}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#667085' }}>
                    <span>Delivery fee</span>
                    <strong>{currency(order.delivery)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 9,
                      borderTop: '1px solid #e8ebd9',
                      fontSize: 16,
                      color: '#17210e'
                    }}
                  >
                    <strong>Grand total</strong>
                    <strong style={{ color: '#2d4a22' }}>{currency(order.total)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
