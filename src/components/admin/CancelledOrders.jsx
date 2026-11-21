import React, { useState } from 'react';
import { Search, RefreshCw, ClipboardList, Trash2, AlertTriangle } from 'lucide-react';
import { currency } from '@/utils/formatters';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { supabase } from '@/lib/supabase';

export function CancelledOrders({ orders, loading, error, onRefresh }) {
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const list = orders.filter(
    o =>
      o.status === 'Cancelled' &&
      `${o.id} ${o.customer} ${o.phone}`.toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = async (o) => {
    const confirmed = window.confirm(
      `Permanently delete cancelled order ${o.id}?\n\nThis will completely delete this order, its items, and history from the database. This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(o.dbId);
    setActionError('');
    setSuccessNotice('');

    try {
      // 1. Try secure stored procedure
      const { error: rpcErr } = await supabase.rpc('delete_cancelled_order', {
        p_order_id: o.dbId
      });

      if (rpcErr) {
        // 2. Direct fallback delete where status is cancelled
        const { error: delErr } = await supabase
          .from('orders')
          .delete()
          .eq('id', o.dbId)
          .eq('status', 'cancelled');

        if (delErr) throw delErr;
      }

      setSuccessNotice(`Order ${o.id} has been permanently deleted from the database.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Delete order error:', err);
      setActionError(err.message || 'Could not delete order from database.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="toolbar">
        <button className="btn-outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
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

      {actionError && (
        <div style={{ margin: '0 0 16px', padding: 12, background: '#fef3f2', color: '#b42318', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <AlertTriangle size={16} /> {actionError}
        </div>
      )}

      {successNotice && (
        <div style={{ margin: '0 0 16px', padding: 12, background: '#edf8eb', color: '#27641d', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          ✓ {successNotice}
        </div>
      )}

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
                  {o.address && <small style={{ color: '#555' }}>📍 {o.address}</small>}
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

              {/* Permanent Delete Action Bar for Cancelled Orders */}
              <div
                className="order-controls"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 18px',
                  background: '#fafaf6',
                  borderTop: '1px solid #edf0e6'
                }}
              >
                <span style={{ fontSize: 12, color: '#667085' }}>
                  Cancelled on {new Date(o.createdAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  className="danger-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 9,
                    background: '#fef3f2',
                    color: '#b42318',
                    border: '1px solid #fecdca',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => handleDelete(o)}
                  disabled={deletingId === o.dbId}
                >
                  <Trash2 size={14} />
                  {deletingId === o.dbId ? 'Deleting from DB...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState icon={ClipboardList} text="No cancelled orders." />
        )}
      </div>
    </>
  );
}
