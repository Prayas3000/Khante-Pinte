import React, { useState } from 'react';
import { Printer, X, ChefHat, Receipt } from 'lucide-react';
import { currency } from '@/utils/formatters';

export function ReceiptModal({ order: o, onClose }) {
  const [mode, setMode] = useState('full'); // 'full' (Customer receipt) or 'kot' (Kitchen ticket)

  const handlePrint = () => {
    window.print();
  };

  if (!o) return null;

  const displayOrderCode = o.orderCode || o.id;

  return (
    <div className="receipt-modal-backdrop" onClick={onClose}>
      <div className="receipt-modal-card" onClick={e => e.stopPropagation()}>
        {/* Modal Controls (Hidden in Print) */}
        <div className="receipt-modal-header no-print">
          <div className="receipt-mode-toggles">
            <button
              type="button"
              className={`receipt-mode-btn ${mode === 'full' ? 'active' : ''}`}
              onClick={() => setMode('full')}
            >
              <Receipt size={14} />
              <span>Customer Receipt</span>
            </button>
            <button
              type="button"
              className={`receipt-mode-btn ${mode === 'kot' ? 'active' : ''}`}
              onClick={() => setMode('kot')}
            >
              <ChefHat size={14} />
              <span>Kitchen Ticket (KOT)</span>
            </button>
          </div>
          <button className="icon-btn receipt-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="receipt-paper-wrapper">
          <div className="kp-thermal-receipt">
            {/* Header */}
            <div className="thermal-header">
              <div className="thermal-brand">KHANTE PINTE</div>
              <div className="thermal-sub">Late Night Food Delivery</div>
              <div className="thermal-sub">Buspark, Biratnagar, Nepal</div>
              <div className="thermal-sub">Tel: 9849073408 · 9822551213</div>
              <div className="thermal-hours">Hours: 9:00 PM – 4:00 AM NPT</div>

              {mode === 'kot' && (
                <div className="thermal-kot-banner">
                  *** KITCHEN ORDER TICKET (KOT) ***
                </div>
              )}
            </div>

            <div className="thermal-dashed-divider" />

            {/* Order Details */}
            <div className="thermal-order-meta">
              <div className="thermal-row">
                <strong>ORDER: {displayOrderCode} {o.seq ? `(#${o.seq})` : ''}</strong>
                <strong>[{String(o.type || 'delivery').toUpperCase()}]</strong>
              </div>
              <div className="thermal-row">
                <span>Date: {new Date(o.createdAt).toLocaleDateString()}</span>
                <span>{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="thermal-row">
                <span>Source: {o.source || 'Website'}</span>
              </div>

              <div className="thermal-customer-block">
                <div><strong>Customer:</strong> {o.customer}</div>
                <div><strong>Phone:</strong> {o.phone}</div>
                {o.type === 'Delivery' && o.address && (
                  <div><strong>Address:</strong> {o.address}</div>
                )}
                {o.rider && (
                  <div><strong>Rider:</strong> {o.rider} {o.riderPhone ? `(${o.riderPhone})` : ''}</div>
                )}
              </div>

              {o.note && (
                <div className="thermal-note-box">
                  <strong>NOTE:</strong> {o.note}
                </div>
              )}
            </div>

            <div className="thermal-dashed-divider" />

            {/* Items Table */}
            <div className="thermal-items-header">
              <span>QTY</span>
              <span>ITEM</span>
              {mode === 'full' && <span style={{ textAlign: 'right' }}>AMT</span>}
            </div>
            <div className="thermal-dashed-divider" />

            <div className="thermal-items-list">
              {(o.items || []).map((item, idx) => (
                <div key={idx} className="thermal-item-row">
                  <span className="thermal-item-qty">{item.qty}x</span>
                  <span className="thermal-item-name">{item.name}</span>
                  {mode === 'full' && (
                    <span className="thermal-item-amt">{Number(item.price * item.qty).toLocaleString('en-IN')}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="thermal-dashed-divider" />

            {/* Totals & Payment (Customer Receipt Only) */}
            {mode === 'full' && (
              <div className="thermal-totals-block">
                <div className="thermal-row">
                  <span>Subtotal:</span>
                  <span>{currency(o.subtotal)}</span>
                </div>
                {Number(o.delivery || 0) > 0 && (
                  <div className="thermal-row">
                    <span>Delivery Fee:</span>
                    <span>+{currency(o.delivery)}</span>
                  </div>
                )}
                {Number(o.discount || 0) > 0 && (
                  <div className="thermal-row">
                    <span>Discount:</span>
                    <span>−{currency(o.discount)}</span>
                  </div>
                )}
                <div className="thermal-dashed-divider" />
                <div className="thermal-row thermal-grand-total">
                  <span>TOTAL:</span>
                  <span>{currency(o.total)}</span>
                </div>
                <div className="thermal-row thermal-pay-row">
                  <span>Payment:</span>
                  <span className="thermal-pay-status">
                    {(o.payment || 'cash').toUpperCase()} ({String(o.paymentStatus || 'unpaid').toUpperCase()})
                  </span>
                </div>
              </div>
            )}

            <div className="thermal-dashed-divider" />

            {/* Footer */}
            <div className="thermal-footer">
              <div>*** THANK YOU FOR CRAVING WITH US ***</div>
              <div style={{ marginTop: 2 }}>Order Online: khantepinte.com.np</div>
            </div>
          </div>
        </div>

        {/* Action Bottom Bar (Hidden in Print) */}
        <div className="receipt-modal-footer no-print">
          <button
            type="button"
            className="btn-primary receipt-print-btn"
            onClick={handlePrint}
          >
            <Printer size={16} />
            <span>Print {mode === 'kot' ? 'KOT' : 'Receipt'}</span>
          </button>
          <button type="button" className="btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
