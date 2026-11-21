import React, { useState } from 'react';
import { RefreshCw, ChevronRight, Loader2 } from 'lucide-react';
import { currency } from '@/utils/formatters';

export function KDS({ orders, changeStatus }) {
  const [updatingId, setUpdatingId] = useState(null);

  const columns = [
    ['New', 'New'],
    ['Confirmed', 'Confirmed'],
    ['Preparing', 'Preparing'],
    ['Ready', 'Ready']
  ];

  const handleStatusTransition = async (orderId, targetStatus) => {
    if (updatingId) return;
    setUpdatingId(orderId);
    try {
      await changeStatus(orderId, targetStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="kds">
      <div className="kds-heading">
        <div>
          <h2>Kitchen board</h2>
          <p>
            Live order workflow ·{' '}
            {orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length}{' '}
            active tickets
          </p>
        </div>
        <span className="shift-chip">
          <RefreshCw size={14} /> Live order board
        </span>
      </div>
      <div className="kds-columns">
        {columns.map(([status, label]) => (
          <section className="kds-column" key={status}>
            <div className="kds-column-head">
              <h3>{label}</h3>
              <span>{orders.filter(o => o.status === status).length}</span>
            </div>
            {orders
              .filter(o => o.status === status)
              .map(o => {
                const isUpdating = updatingId === o.id;
                const nextStatus =
                  status === 'New'
                    ? 'Confirmed'
                    : status === 'Confirmed'
                    ? 'Preparing'
                    : status === 'Preparing'
                    ? 'Ready'
                    : 'Out for Delivery';

                const buttonText =
                  status === 'New'
                    ? 'Confirm order'
                    : status === 'Confirmed'
                    ? 'Start preparing'
                    : status === 'Preparing'
                    ? 'Mark ready'
                    : 'Send for delivery';

                return (
                  <div className="kds-ticket" key={o.id}>
                    <div className="ticket-top">
                      <strong>#{o.seq} <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>({o.orderCode || o.id})</span></strong>
                      <small>
                        {new Date(o.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </small>
                    </div>
                    <div className="ticket-customer">
                      {o.customer} · {o.source}
                    </div>
                    {o.items.map(i => (
                      <div className="ticket-item" key={i.id}>
                        <b>{i.qty}×</b>
                        {i.name}
                      </div>
                    ))}
                    {o.note && <div className="ticket-note">Note: {o.note}</div>}
                    <div className="ticket-total">{currency(o.total)}</div>
                    <button
                      type="button"
                      disabled={isUpdating}
                      className="btn-primary full"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        cursor: isUpdating ? 'wait' : 'pointer',
                        opacity: isUpdating ? 0.75 : 1
                      }}
                      onClick={() => handleStatusTransition(o.id, nextStatus)}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 size={16} className="spin" /> Updating...
                        </>
                      ) : (
                        <>
                          {buttonText} <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            {!orders.some(o => o.status === status) && (
              <div className="empty-column">No tickets</div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
