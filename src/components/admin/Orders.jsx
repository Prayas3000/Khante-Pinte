import React, { useState } from 'react';
import { Search, RefreshCw, ClipboardList } from 'lucide-react';
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
  const activeOrders = orders.filter(o => o.status !== 'Cancelled');
  const list = activeOrders.filter(
    o =>
      (filter === 'All' || o.status === filter) &&
      `${o.id} ${o.customer} ${o.phone}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <div className="toolbar">
        {error && <p className="form-error">{error}</p>}
        <button className="btn-outline" onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh orders'}
        </button>
        <div className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search order, customer or phone"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option>All</option>
          {['New', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'].map(
            status => (
              <option key={status}>{status}</option>
            )
          )}
        </select>
      </div>
      <div className="panel order-list-panel">
        {loading ? (
          <EmptyState icon={RefreshCw} text="Loading orders from Supabase..." />
        ) : list.length ? (
          list.map(order => (
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
    </>
  );
}
