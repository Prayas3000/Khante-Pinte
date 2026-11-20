import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { currency } from '@/utils/formatters';

export function ReceiptModal({ order: o, onClose }) {
  const [mode, setMode] = useState('full'); // 'full' (Customer receipt) or 'kot' (Kitchen ticket)

  const handlePrint = () => {
    window.print();
  };

  if (!o) return null;

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 13000,
      background: 'rgba(12, 18, 28, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'grid',
      placeItems: 'center',
      padding: 16
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        width: 'min(420px, 100%)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 70px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Modal Controls (Hidden in Print) */}
        <div className="no-print" style={{
          padding: '14px 18px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={mode === 'full' ? 'btn-primary' : 'btn-outline'}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setMode('full')}
            >
              Customer Receipt
            </button>
            <button
              className={mode === 'kot' ? 'btn-primary' : 'btn-outline'}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setMode('kot')}
            >
              Kitchen (KOT)
            </button>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px',
          background: '#f1f5f9',
          display: 'grid',
          placeItems: 'center'
        }}>
          <div className="kp-thermal-receipt" style={{
            width: '100%',
            maxWidth: '300px',
            background: '#fff',
            padding: '20px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontFamily: 'Courier, "Courier New", monospace',
            color: '#000',
            fontSize: '12px',
            lineHeight: 1.4
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>
                KHANTE PINTE
              </div>
              <div style={{ fontSize: '11px', marginTop: 2 }}>Late Night Food Delivery</div>
              <div style={{ fontSize: '11px' }}>Buspark, Biratnagar, Nepal</div>
              <div style={{ fontSize: '11px' }}>Tel: 9849073408 · 9822551213</div>
              <div style={{ fontSize: '10px', marginTop: 2 }}>Hours: 9:00 PM – 4:00 AM NPT</div>
              {mode === 'kot' && (
                <div style={{
                  marginTop: 6,
                  padding: '3px 0',
                  background: '#000',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '13px'
                }}>
                  *** KITCHEN ORDER TICKET (KOT) ***
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Order Meta */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>ORDER: {o.id}</span>
                <span>[{o.type.toUpperCase()}]</span>
              </div>
              <div>Date: {new Date(o.createdAt).toLocaleString('en-US', { hour12: true })}</div>
              <div>Source: {o.source}</div>
              <div>Customer: <strong>{o.customer}</strong></div>
              <div>Phone: <strong>{o.phone}</strong></div>
              {o.address && (
                <div>Address: {o.address}</div>
              )}
              {o.rider && (
                <div>Rider: {o.rider} ({o.riderPhone})</div>
              )}
            </div>

            {o.note && (
              <>
                <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                  NOTE: {o.note}
                </div>
              </>
            )}

            <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

            {/* Items Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: 4 }}>
              <span style={{ width: '28px' }}>QTY</span>
              <span style={{ flex: 1, paddingLeft: 4 }}>ITEM</span>
              {mode === 'full' && <span style={{ width: '60px', textAlign: 'right' }}>AMT</span>}
            </div>
            <div style={{ borderTop: '1px solid #000', marginBottom: 6 }} />

            {/* Items List */}
            <div style={{ display: 'grid', gap: 4 }}>
              {o.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ width: '28px', fontWeight: 'bold' }}>{item.qty}x</span>
                  <span style={{ flex: 1, paddingLeft: 4, fontWeight: mode === 'kot' ? 'bold' : 'normal' }}>
                    {item.name}
                  </span>
                  {mode === 'full' && (
                    <span style={{ width: '60px', textAlign: 'right' }}>
                      {item.price * item.qty}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Financials (Customer Mode Only) */}
            {mode === 'full' && (
              <>
                <div style={{ borderTop: '1px dashed #000', margin: '10px 0 6px' }} />
                <div style={{ display: 'grid', gap: 2, fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>{currency(o.subtotal)}</span>
                  </div>
                  {o.delivery > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Delivery Fee:</span>
                      <span>{currency(o.delivery)}</span>
                    </div>
                  )}
                  {o.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Discount:</span>
                      <span>−{currency(o.discount)}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    borderTop: '1px solid #000',
                    paddingTop: 4,
                    marginTop: 2
                  }}>
                    <span>TOTAL:</span>
                    <span>{currency(o.total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span>Payment:</span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                      {(o.payment || 'cash').replaceAll('_', ' ')} ({o.paymentStatus || 'unpaid'})
                    </span>
                  </div>
                </div>
              </>
            )}

            <div style={{ borderTop: '1px dashed #000', margin: '12px 0 8px' }} />

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '10px' }}>
              <div>*** THANK YOU FOR CRAVING WITH US ***</div>
              <div style={{ marginTop: 2 }}>Order Online: khantepinte.com.np</div>
            </div>
          </div>
        </div>

        {/* Action Bottom Bar (Hidden in Print) */}
        <div className="no-print" style={{
          padding: '14px 18px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: 10,
          background: '#fff'
        }}>
          <button
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={handlePrint}
          >
            <Printer size={16} /> Print {mode === 'kot' ? 'KOT' : 'Receipt'}
          </button>
          <button className="btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
