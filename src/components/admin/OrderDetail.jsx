import React, { useState } from 'react';
import { MapPin, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { currency } from '@/utils/formatters';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ReceiptModal } from '@/components/admin/ReceiptModal';

export function OrderDetail({
  order: o,
  changeStatus,
  assignRider,
  riders,
  riderActiveCounts = {},
  cancelOrder,
  changePaymentStatus
}) {
  const [proofUrl, setProofUrl] = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const openProof = async () => {
    if (!o.paymentProofPath) return;
    setProofLoading(true);
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(o.paymentProofPath, 300);
    setProofLoading(false);
    if (error) {
      alert(`Could not open payment proof: ${error.message}`);
      return;
    }
    setProofUrl(data.signedUrl);
  };

  return (
    <div className="order-detail">
      <div className="order-detail-top">
        <div>
          <strong>{o.orderCode || o.id} {o.seq ? <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>#{o.seq}</span> : null}</strong>
          <small>
            {new Date(o.createdAt).toLocaleString()} · {o.source}
          </small>
        </div>
        <StatusBadge status={o.status} />
      </div>
      <div className="order-detail-body">
        <div>
          {/GIFT ORDER/i.test(o.note || '') && (
            <span className="gift-order-flag">🎁 GIFT ORDER</span>
          )}
          <strong>{o.customer}</strong>
          <small>{o.phone}</small>
          {o.address && (
            <small>
              <MapPin size={13} /> {o.address}
            </small>
          )}
          {o.deliveryLat && o.deliveryLng && (
            <div style={{ marginTop: 3 }}>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${o.deliveryLat},${o.deliveryLng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0284c7',
                  textDecoration: 'underline'
                }}
              >
                📍 Open Customer GPS in Google Maps
              </a>
            </div>
          )}
          <small>{o.type}</small>
          {/CUSTOMER CALLBACK NUMBER:/i.test(o.note || '') && (
            <small>
              <b>Callback:</b>{' '}
              {
                (o.note.match(/CUSTOMER CALLBACK NUMBER:\s*([0-9]+)/i) || [])[1] || ''
              }
            </small>
          )}
          {/GIFT ORDER/i.test(o.note || '') && (
            <small className="gift-recipient-admin">
              {(o.note.match(/GIFT ORDER — Recipient: ([^;]+)/i) || [])[1] ||
                'Gift recipient details'}{' '}
              · {(o.note.match(/recipient phone: ([^;]+)/i) || [])[1] || ''}
            </small>
          )}
          {o.type === 'Delivery' && (
            <div style={{ marginTop: 6 }}>
              {o.rider ? (
                <small className="assigned-rider-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>🚴 Rider: <strong>{o.rider}</strong>{o.riderPhone ? ` (${o.riderPhone})` : ''}</span>
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background: (riderActiveCounts[o.rider] || 0) > 2 ? '#fef3f2' : '#f0fdf4',
                    color: (riderActiveCounts[o.rider] || 0) > 2 ? '#b42318' : '#166534',
                    border: '1px solid currentColor'
                  }}>
                    {(riderActiveCounts[o.rider] || 0) === 1 ? '1 active delivery' : `${riderActiveCounts[o.rider] || 0} active deliveries`}
                  </span>
                </small>
              ) : (
                <small style={{ color: '#d97706', fontWeight: 600, display: 'inline-block' }}>
                  ⚠️ No rider assigned
                </small>
              )}
            </div>
          )}
        </div>
        <div className="items-mini">
          {o.items.map(item => (
            <div key={item.id}>
              {item.qty} × {item.name}{' '}
              <span>{currency(item.price * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="order-money">
          <small>Subtotal {currency(o.subtotal)}</small>
          <small>Discount −{currency(o.discount)}</small>
          <small>Delivery {currency(o.delivery)}</small>
          <small>Payment: {(o.payment || 'cash').replaceAll('_', ' ')}</small>
          <strong>Total {currency(o.total)}</strong>
        </div>
      </div>
      <div className="order-controls">
        <select
          value={o.status}
          onChange={e => changeStatus(o.id, e.target.value)}
        >
          {['New', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'].map(
            status => (
              <option key={status}>{status}</option>
            )
          )}
        </select>
        <select
          value={o.paymentStatus || 'unpaid'}
          onChange={e => changePaymentStatus(o.id, e.target.value)}
        >
          <option value="unpaid">Payment: Unpaid</option>
          <option value="paid">Payment: Paid</option>
        </select>
        <button
          type="button"
          className="btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => setReceiptOpen(true)}
          title="Print Customer Receipt or Kitchen Order Ticket (KOT)"
        >
          <Printer size={14} /> Print Receipt / KOT
        </button>
        {o.paymentProofPath && (
          <>
            <button
              className="btn-outline"
              onClick={openProof}
              disabled={proofLoading}
            >
              {proofLoading ? 'Opening…' : 'View payment proof'}
            </button>
            {proofUrl && (
              <a href={proofUrl} target="_blank" rel="noreferrer">
                Open screenshot
              </a>
            )}
          </>
        )}
        {o.type === 'Delivery' && (
          <select
            value={o.rider || ''}
            onChange={e => assignRider(o.id, e.target.value)}
            style={{ fontWeight: o.rider ? '600' : 'normal', minWidth: 210 }}
          >
            <option value="">-- Assign Rider --</option>
            {riders.map(rider => {
              const rName = typeof rider === 'string' ? rider : rider.name;
              const activeCount = riderActiveCounts[rName] || 0;
              const isCurrent = o.rider === rName;
              const statusText = activeCount === 0 ? '🟢 Available (0 active)' : `🟡 ${activeCount} active ${activeCount === 1 ? 'order' : 'orders'}`;
              return (
                <option key={rName} value={rName}>
                  {isCurrent ? `✓ ${rName} • ${statusText} (Assigned)` : `${rName} • ${statusText}`}
                </option>
              );
            })}
          </select>
        )}
        {o.status !== 'Cancelled' &&
          o.status !== 'Delivered' &&
          o.status !== 'Served' && (
            <button className="danger-btn" onClick={() => cancelOrder(o.id)}>
              Cancel
            </button>
          )}
      </div>

      {receiptOpen && (
        <ReceiptModal
          order={o}
          onClose={() => setReceiptOpen(false)}
        />
      )}
    </div>
  );
}
