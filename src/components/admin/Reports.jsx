import React, { useState, useMemo } from 'react';
import { Receipt, CircleDollarSign, ClipboardList, TrendingUp, Wallet } from 'lucide-react';
import { currency, businessDate } from '@/utils/formatters';
import { Stat } from '@/components/admin/Dashboard';
import { EmptyState } from '@/components/common/EmptyState';

export function Reports({ orders }) {
  const today = businessDate();
  const [range, setRange] = useState('today');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const dates = useMemo(() => {
    const end = new Date(`${today}T12:00:00`);
    const start = new Date(end);
    if (range === '7days') start.setDate(start.getDate() - 6);
    if (range === '30days') start.setDate(start.getDate() - 29);
    if (range === 'month') start.setDate(1);
    const iso = d =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    return range === 'custom'
      ? { from: fromDate, to: toDate }
      : { from: range === 'all' ? '0000-01-01' : iso(start), to: today };
  }, [range, today, fromDate, toDate]);

  const filtered = orders.filter(
    o => o.businessDate >= dates.from && o.businessDate <= dates.to
  );
  const valid = filtered.filter(o => o.status !== 'Cancelled');
  const sales = valid.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const subtotal = valid.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
  const discounts = valid.reduce((sum, o) => sum + Number(o.discount || 0), 0);
  const delivery = valid.reduce((sum, o) => sum + Number(o.delivery || 0), 0);
  const cancelled = filtered.filter(o => o.status === 'Cancelled');
  const avg = valid.length ? sales / valid.length : 0;
  const groupSum = (key, valueKey = 'total') =>
    filtered.reduce((acc, o) => {
      const k = o[key] || 'Unknown';
      acc[k] = (acc[k] || 0) + Number(o[valueKey] || 0);
      return acc;
    }, {});
  const sourceTotals = groupSum('source');
  const paymentTotals = groupSum('payment');
  const statusCounts = filtered.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const itemSales = {};
  valid.forEach(o =>
    (o.items || []).forEach(i => {
      itemSales[i.name] = (itemSales[i.name] || 0) + Number(i.qty || 0);
    })
  );
  const topItems = Object.entries(itemSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const downloadCsv = () => {
    const rows = [
      [
        'Order',
        'Business date',
        'Created',
        'Source',
        'Customer',
        'Phone',
        'Type',
        'Status',
        'Payment method',
        'Payment status',
        'Subtotal',
        'Discount',
        'Delivery fee',
        'Total',
        'Rider',
        'Cancellation reason',
        'Items'
      ],
      ...filtered.map(o => [
        o.id,
        o.businessDate,
        o.createdAt,
        o.source,
        o.customer,
        o.phone,
        o.type,
        o.status,
        o.payment,
        o.paymentStatus,
        o.subtotal,
        o.discount,
        o.delivery,
        o.total,
        o.rider,
        o.cancellationReason,
        (o.items || []).map(i => `${i.name} x${i.qty}`).join('; ')
      ])
    ];
    const csv = rows
      .map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `khante-pinte-report-${dates.from}-to-${dates.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const moneyLine = (label, value) => (
    <div className="report-line" key={label}>
      <span>{label}</span>
      <strong>{currency(value)}</strong>
    </div>
  );

  return (
    <div className="reports-grid">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Reports & analytics</h3>
            <small>Based on orders saved in Supabase · Business date</small>
          </div>
          <button className="btn-primary" onClick={downloadCsv}>
            <Receipt size={16} /> Export CSV
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={range}
            onChange={e => setRange(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="month">This month</option>
            <option value="all">All time</option>
            <option value="custom">Custom range</option>
          </select>
          {range === 'custom' && (
            <>
              <label>
                From{' '}
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                />
              </label>
              <label>
                To{' '}
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                />
              </label>
            </>
          )}
          <small style={{ color: '#667085' }}>
            Showing {dates.from} to {dates.to}
          </small>
        </div>
      </section>
      <div className="stat-grid">
        <Stat
          icon={CircleDollarSign}
          label="Net sales"
          value={currency(sales)}
          hint={`${valid.length} non-cancelled orders`}
        />
        <Stat
          icon={ClipboardList}
          label="Total orders"
          value={filtered.length}
          hint={`${cancelled.length} cancelled`}
        />
        <Stat
          icon={TrendingUp}
          label="Average order value"
          value={currency(avg)}
          hint="Net sales ÷ non-cancelled orders"
        />
        <Stat
          icon={Receipt}
          label="Cancellation rate"
          value={`${filtered.length ? Math.round((cancelled.length / filtered.length) * 100) : 0}%`}
          hint={`${cancelled.length} cancelled orders`}
        />
      </div>
      <section className="panel">
        <div className="panel-head">
          <h3>Sales breakdown</h3>
        </div>
        {moneyLine('Food subtotal', subtotal)}
        {moneyLine('Discounts', discounts)}
        {moneyLine('Delivery charges collected', delivery)}
        {moneyLine('Net sales', sales)}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h3>Sales by order source</h3>
        </div>
        {Object.entries(sourceTotals).length ? (
          Object.entries(sourceTotals).map(([k, v]) => moneyLine(k, v))
        ) : (
          <EmptyState icon={Wallet} text="No orders in this period." />
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h3>Payment method breakdown</h3>
        </div>
        {Object.entries(paymentTotals).length ? (
          Object.entries(paymentTotals).map(([k, v]) => moneyLine(k, v))
        ) : (
          <EmptyState icon={Wallet} text="No payment data." />
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h3>Order status breakdown</h3>
        </div>
        {Object.entries(statusCounts).map(([k, v]) => (
          <div className="report-line" key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h3>Top-selling items</h3>
        </div>
        {topItems.length ? (
          topItems.map(([name, qty]) => (
            <div className="report-line" key={name}>
              <span>{name}</span>
              <strong>{qty} sold</strong>
            </div>
          ))
        ) : (
          <EmptyState icon={ClipboardList} text="No item sales in this period." />
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h3>Cancelled orders</h3>
        </div>
        {cancelled.length ? (
          cancelled.map(o => (
            <div className="report-line" key={o.id}>
              <span>
                {o.id} · {o.cancellationReason || 'No reason provided'}
              </span>
              <strong>{currency(o.total)}</strong>
            </div>
          ))
        ) : (
          <EmptyState icon={ClipboardList} text="No cancelled orders in this period." />
        )}
      </section>
    </div>
  );
}
