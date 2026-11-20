import React, { useState } from 'react';
import { Search, RefreshCw, ClipboardList } from 'lucide-react';
import { currency } from '@/utils/formatters';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';

export function CancelledOrders({ orders, loading, error, onRefresh }) {
  const [query, setQuery] = useState('');
  const list = orders.filter(
    o =>
      o.status === 'Cancelled' &&
      `${o.id} ${o.customer} ${o.phone}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <div className="toolbar">
        <button className="btn-outline" onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh orders'}
        </button>
        <div className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search cancelled orders"
          />
        </div>
        <span>{list.length} cancelled orders</span>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="panel order-list-panel">
        {loading ? (
          <EmptyState icon={RefreshCw} text="Loading cancelled orders..." />
        ) : list.length ? (
          list.map(o => (
            <div className="order-detail" key={o.id}>
              <div className="order-detail-top">
                <div>
                  <strong>{o.id}</strong>
                  <small>{new Date(o.createdAt).toLocaleString()}</small>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="order-detail-body">
                <div>
                  <strong>{o.customer}</strong>
                  <small>{o.phone}</small>
                  <small>{o.type}</small>
                </div>
                <div className="items-mini">
                  {o.items.map(i => (
                    <div key={i.id}>
                      {i.qty} × {i.name}
                      <span>{currency(i.price * i.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="order-money">
                  <small>Subtotal {currency(o.subtotal)}</small>
                  <small>Delivery {currency(o.delivery)}</small>
                  <strong>Total {currency(o.total)}</strong>
                </div>
              </div>
              {o.cancellationReason && (
                <div
                  style={{
                    margin: '0 18px 16px',
                    padding: 12,
                    background: '#fef3f2',
                    color: '#b42318',
                    borderRadius: 8
                  }}
                >
                  <strong>Cancellation reason</strong>
                  <p style={{ margin: '4px 0 0' }}>{o.cancellationReason}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <EmptyState icon={ClipboardList} text="No cancelled orders." />
        )}
      </div>
    </>
  );
}
