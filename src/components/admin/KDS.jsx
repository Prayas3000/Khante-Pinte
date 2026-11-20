import React from 'react';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { currency } from '@/utils/formatters';

export function KDS({ orders, changeStatus }) {
  const columns = [
    ['New', 'New'],
    ['Confirmed', 'Confirmed'],
    ['Preparing', 'Preparing'],
    ['Ready', 'Ready']
  ];

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
              .map(o => (
                <div className="kds-ticket" key={o.id}>
                  <div className="ticket-top">
                    <strong>{o.id}</strong>
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
                    className="btn-primary full"
                    onClick={() =>
                      changeStatus(
                        o.id,
                        status === 'New'
                          ? 'Confirmed'
                          : status === 'Confirmed'
                          ? 'Preparing'
                          : status === 'Preparing'
                          ? 'Ready'
                          : 'Out for Delivery'
                      )
                    }
                  >
                    {status === 'New'
                      ? 'Confirm order'
                      : status === 'Confirmed'
                      ? 'Start preparing'
                      : status === 'Preparing'
                      ? 'Mark ready'
                      : 'Send for delivery'}{' '}
                    <ChevronRight size={16} />
                  </button>
                </div>
              ))}
            {!orders.some(o => o.status === status) && (
              <div className="empty-column">No tickets</div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
