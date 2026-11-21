import React, { useState, useMemo, useEffect } from 'react';
import { Search, RefreshCw, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { OrderDetail } from '@/components/admin/OrderDetail';
import { EmptyState } from '@/components/common/EmptyState';

export function Orders({
  orders,
  loading,
  error,
  onRefresh,
  changeStatus,
  assignRider,
  riders,
  cancelOrder,
  changePaymentStatus
}) {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'Cancelled'), [orders]);

  const statusCounts = useMemo(() => {
    const counts = { All: activeOrders.length };
    activeOrders.forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [activeOrders]);

  const list = useMemo(() => {
    return activeOrders.filter(
      o =>
        (filter === 'All' || o.status === filter) &&
        `${o.id} ${o.customer} ${o.phone}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [activeOrders, filter, query]);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page, pageSize]);

  return (
    <>
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        {error && <p className="form-error">{error}</p>}
        <button className="btn-outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <div className="search-box" style={{ flex: '1 1 200px' }}>
          <Search size={16} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search order number, customer or phone…"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="All">All Statuses ({statusCounts.All || 0})</option>
          {['New', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'].map(
            status => (
              <option key={status} value={status}>
                {status} ({statusCounts[status] || 0})
              </option>
            )
          )}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 12, color: '#667085' }}>
        <span>Showing <strong>{list.length}</strong> active orders</span>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="btn-outline"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              <ChevronLeft size={13} />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              className="btn-outline"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="panel order-list-panel">
        {loading ? (
          <EmptyState icon={RefreshCw} text="Loading orders from Supabase..." />
        ) : paginatedList.length ? (
          paginatedList.map(order => (
            <OrderDetail
              key={order.id}
              order={order}
              changeStatus={changeStatus}
              assignRider={assignRider}
              riders={riders}
              cancelOrder={cancelOrder}
              changePaymentStatus={changePaymentStatus}
            />
          ))
        ) : (
          <EmptyState icon={ClipboardList} text="No active matching orders." />
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <button
            className="btn-outline"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12 }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ fontSize: 12, color: '#667085' }}>
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
    </>
  );
}
