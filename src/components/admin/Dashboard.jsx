import React from 'react';
import {
  CircleDollarSign,
  ClipboardList,
  TrendingUp,
  Bell,
  AlertCircle,
  Plus,
  ChevronRight
} from 'lucide-react';
import { currency } from '@/utils/formatters';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';

export function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        {Icon && <Icon size={18} />}
      </div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

export function OrderRow({ order: o }) {
  return (
    <div className="order-row">
      <div className="order-number">
        <strong>{o.id}</strong>
        <small>
          {o.customer} · {o.source}
        </small>
      </div>
      <div className="order-row-items">
        {o.items.map(x => `${x.qty}× ${x.name}`).join(', ')}
      </div>
      <strong>{currency(o.total)}</strong>
      <StatusBadge status={o.status} />
    </div>
  );
}

export function Dashboard({ orders, stats, products, setSection }) {
  const pending = orders.filter(o =>
    ['New', 'Confirmed', 'Preparing', 'Ready'].includes(o.status)
  );
  const recent = orders.slice(0, 6);

  return (
    <>
      <div className="welcome-row">
        <div>
          <h2>Good evening, Owner 👋</h2>
          <p>Here is your business snapshot for the current business day.</p>
        </div>
        <button className="btn-primary" onClick={() => setSection('POS')}>
          <Plus size={16} /> New phone order
        </button>
      </div>
      <div className="stat-grid">
        <Stat
          icon={CircleDollarSign}
          label="Today's sales"
          value={currency(stats.sales)}
          hint="Current business day"
        />
        <Stat
          icon={ClipboardList}
          label="Orders today"
          value={stats.dayOrders.length}
          hint="Non-cancelled orders"
        />
        <Stat
          icon={TrendingUp}
          label="Average order"
          value={currency(stats.avg)}
          hint="Sales ÷ orders"
        />
        <Stat
          icon={Bell}
          label="Active orders"
          value={pending.length}
          hint="Needs attention"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <h3>Recent orders</h3>
            <button className="text-link" onClick={() => setSection('Orders')}>
              View all <ChevronRight size={14} />
            </button>
          </div>
          {recent.length ? (
            recent.map(o => <OrderRow key={o.id} order={o} />)
          ) : (
            <EmptyState
              icon={ClipboardList}
              text="Orders will appear here when customers order."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>Quick overview</h3>
          </div>
          <div className="quick-list">
            <div>
              <span>Menu items</span>
              <b>{products.length}</b>
            </div>
            <div>
              <span>Out of stock</span>
              <b>{products.filter(p => p.outOfStock).length}</b>
            </div>
            <div>
              <span>Total orders stored</span>
              <b>{orders.length}</b>
            </div>
            <div>
              <span>Orders from website</span>
              <b>{orders.filter(o => o.source === 'Website').length}</b>
            </div>
            <div>
              <span>Phone/POS orders</span>
              <b>{orders.filter(o => o.source === 'Phone').length}</b>
            </div>
          </div>
          <div className="tip-card">
            <AlertCircle size={17} />
            <p>Orders and order status are stored in Supabase and sync to the admin workspace.</p>
          </div>
        </section>
      </div>
    </>
  );
}
