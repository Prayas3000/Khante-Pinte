import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { currency } from '@/utils/formatters';

export function OrderTracking({ orderId, phone, account, onClose, onLookup }) {
  const [id, setId] = useState(orderId || '');
  const [ph, setPh] = useState(phone || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookupOrder = async (lookupId = id, lookupPhone = ph) => {
    const cleanId = String(lookupId || '').trim().toUpperCase();
    const match = cleanId.match(/^KP-(\d+)$/);
    if (!match || (!account?.userId && !String(lookupPhone || '').trim())) {
      setError(
        account?.userId
          ? 'Enter a valid order ID.'
          : 'Enter a valid order ID and the phone number used at checkout.'
      );
      setOrder(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = account?.userId
        ? await supabase.rpc('get_customer_order_tracking', {
            p_order_number: Number(match[1])
          })
        : await supabase.rpc('get_website_order_tracking', {
            p_order_number: Number(match[1]),
            p_customer_phone: String(lookupPhone).trim()
          });

      if (rpcError) throw rpcError;
      if (!data) {
        setOrder(null);
        setError(
          'We could not find an order matching those details. Check your order ID and phone number.'
        );
        return;
      }
      const mapStatus = {
        pending: 'New',
        confirmed: 'Confirmed',
        preparing: 'Preparing',
        ready: 'Ready',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered',
        cancelled: 'Cancelled'
      };
      setOrder({
        id: `KP-${data.order_number}`,
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
          id: `${data.order_number}-${index}`,
          name: item.item_name,
          qty: Number(item.quantity),
          price: Number(item.unit_price)
        })),
        events: (data.history || []).map(event => ({
          status: mapStatus[event.status] || event.status,
          time: event.changed_at
        }))
      });
      onLookup?.(cleanId, String(lookupPhone).trim());
    } catch (lookupError) {
      console.error('Order tracking lookup failed:', lookupError);
      setOrder(null);
      setError(lookupError.message || 'Unable to load tracking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId && (phone || account?.userId)) lookupOrder(orderId, phone);
  }, []);

  const steps = [
    { label: 'Order received', status: 'New', detail: 'We have received your order.' },
    { label: 'Order confirmed', status: 'Confirmed', detail: 'The restaurant has confirmed your order.' },
    { label: 'Preparing your food', status: 'Preparing', detail: 'Your food is being freshly prepared.' },
    { label: 'Ready', status: 'Ready', detail: 'Your order is ready.' },
    ...(order?.type === 'Delivery'
      ? [{ label: 'Out for delivery', status: 'Out for Delivery', detail: 'Your order is on its way.' }]
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
  const current = order ? steps.findIndex(step => step.status === order.status) : -1;
  const isCancelled = order?.status === 'Cancelled';
  const currentStep = current >= 0 ? steps[current] : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="checkout-modal tracking-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">ORDER TRACKING</span>
            <h2>Track your order</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close tracking">
            <X />
          </button>
        </div>
        <div className="checkout-scroll">
          <label>
            Order ID
            <input
              value={id}
              onChange={e => {
                setId(e.target.value.toUpperCase());
                setOrder(null);
              }}
              placeholder="KP-1001"
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
                placeholder="Number used for order"
              />
            </label>
          )}
          {account?.userId && (
            <p className="signed-tracking-note">
              You're signed in. Your orders are verified securely through your account — no phone number needed.
            </p>
          )}
          <button
            className="btn-primary full"
            onClick={() => lookupOrder()}
            disabled={loading}
            style={{ marginTop: 12 }}
          >
            {loading ? 'Checking order…' : order ? 'Refresh order status' : 'Track order'}
          </button>
          {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}

          {order && (
            <div className="tracking-result" style={{ marginTop: 18 }}>
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
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    borderRadius: 999,
                    padding: '9px 14px',
                    fontWeight: 700,
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
                      : '#eff8ff'
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
              <p style={{ margin: '12px 0 18px', color: '#667085', lineHeight: 1.5 }}>
                {isCancelled
                  ? 'This order has been cancelled.'
                  : currentStep?.detail || `Your order status is ${order.status}.`}
              </p>
              {order.riderName && !isCancelled && (
                <div className="tracking-rider-card">
                  <div>
                    <strong>🚴 Your delivery rider</strong>
                    <span>{order.riderName}</span>
                  </div>
                  {order.riderPhone && (
                    <a href={`tel:${order.riderPhone}`}>Call rider · {order.riderPhone}</a>
                  )}
                </div>
              )}
              {isCancelled && order.cancellationReason && (
                <div
                  style={{
                    margin: '0 0 16px',
                    padding: 12,
                    borderRadius: 10,
                    background: '#fef3f2',
                    color: '#b42318'
                  }}
                >
                  <strong>Reason for cancellation</strong>
                  <p style={{ margin: '5px 0 0' }}>{order.cancellationReason}</p>
                </div>
              )}
              {!isCancelled && (
                <div
                  style={{
                    border: '1px solid #eaecf0',
                    borderRadius: 14,
                    padding: '18px 16px',
                    background: '#fff'
                  }}
                >
                  <h4 style={{ margin: '0 0 18px', fontSize: 15 }}>Order progress</h4>
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
                            minHeight: index === steps.length - 1 ? 30 : 62
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
                                width: 27,
                                height: 27,
                                flex: '0 0 27px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxSizing: 'border-box',
                                fontWeight: 800,
                                fontSize: 13,
                                color: done ? '#fff' : '#98a2b3',
                                background: done ? '#16a34a' : '#fff',
                                border: done ? '2px solid #16a34a' : '2px solid #d0d5dd'
                              }}
                            >
                              {done ? '✓' : index + 1}
                            </span>
                            {index !== steps.length - 1 && (
                              <span
                                style={{
                                  width: 2,
                                  flex: 1,
                                  minHeight: 28,
                                  background: current > index ? '#16a34a' : '#e4e7ec'
                                }}
                              />
                            )}
                          </div>
                          <div style={{ padding: '3px 0 16px' }}>
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
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#175cd3',
                                    background: '#eff8ff',
                                    padding: '3px 8px',
                                    borderRadius: 999
                                  }}
                                >
                                  CURRENT STATUS
                                </span>
                              )}
                            </div>
                            <small
                              style={{
                                display: 'block',
                                color: '#98a2b3',
                                marginTop: 3
                              }}
                            >
                              {done ? (active ? 'In progress now' : 'Completed') : 'Waiting'}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 18 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Your items</h4>
                {order.items.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '7px 0',
                      borderBottom: '1px solid #eaecf0',
                      fontSize: 13
                    }}
                  >
                    <span>
                      {item.qty} × {item.name}
                    </span>
                    <strong>{currency(item.qty * item.price)}</strong>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid #eaecf0',
                    display: 'grid',
                    gap: 8,
                    fontSize: 13
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal</span>
                    <strong>{currency(order.subtotal)}</strong>
                  </div>
                  {order.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Discount</span>
                      <strong>−{currency(order.discount)}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Delivery charge</span>
                    <strong>{currency(order.delivery)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 9,
                      borderTop: '1px solid #eaecf0',
                      fontSize: 16
                    }}
                  >
                    <strong>Grand total</strong>
                    <strong>{currency(order.total)}</strong>
                  </div>
                </div>
              </div>
              {(order.events || []).length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Status updates</h4>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(order.events || [])
                      .slice()
                      .reverse()
                      .map((ev, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            padding: '9px 11px',
                            background: '#f9fafb',
                            borderRadius: 9
                          }}
                        >
                          <strong style={{ fontSize: 13 }}>{ev.status}</strong>
                          <small style={{ color: '#667085', textAlign: 'right' }}>
                            {new Date(ev.time).toLocaleString()}
                          </small>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
