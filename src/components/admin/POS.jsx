import React, { useState } from 'react';
import { Search, Plus, Minus, ChevronRight } from 'lucide-react';
import { currency, sanitizePlainText } from '@/utils/formatters';
import { ReceiptModal } from '@/components/admin/ReceiptModal';

export function POS({ products, newOrder, riders, paymentMethods, deliveryFee }) {
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('Delivery');
  const [manualDiscount, setManualDiscount] = useState(0);
  const [rider, setRider] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const available = products.filter(
    p => !p.outOfStock && p.name.toLowerCase().includes(search.toLowerCase())
  );
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = Math.max(
    0,
    subtotal - Number(manualDiscount) + (type === 'Delivery' ? deliveryFee : 0)
  );

  const add = p =>
    setCart(c => {
      const old = c.find(x => x.id === p.id);
      return old
        ? c.map(x => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x))
        : [...c, { ...p, qty: 1 }];
    });

  return (
    <div className="pos-layout">
      <section className="pos-products panel">
        <div className="panel-head">
          <h3>Products</h3>
        </div>
        <div className="search-box">
          <Search size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search menu"
          />
        </div>
        <div className="pos-grid">
          {available.map(p => (
            <button key={p.id} className="pos-product" onClick={() => add(p)}>
              <span>{p.emoji}</span>
              <strong>{p.name}</strong>
              <small>{currency(p.price)}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="pos-cart panel">
        <div className="panel-head">
          <h3>New phone order</h3>
        </div>
        <label>
          Customer
          <input
            value={customer}
            maxLength={50}
            onChange={e => setCustomer(e.target.value.slice(0, 50))}
            placeholder="Name / Walk-in"
          />
        </label>
        <label>
          Phone
          <input
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit phone number"
            inputMode="numeric"
            maxLength={10}
          />
        </label>
        <label>
          Order type
          <select value={type} onChange={e => setType(e.target.value)}>
            <option>Delivery</option>
            <option>Pickup</option>
          </select>
        </label>
        {type === 'Delivery' && (
          <label>
            Address
            <textarea
              value={address}
              maxLength={100}
              onChange={e => setAddress(e.target.value.slice(0, 100))}
              placeholder="Delivery address"
            />
          </label>
        )}
        <div className="pos-cart-items">
          {cart.map(i => (
            <div className="pos-line" key={i.id}>
              <div>
                <strong>{i.name}</strong>
                <small>{currency(i.price)}</small>
              </div>
              <div className="qty-control">
                <button
                  onClick={() =>
                    setCart(c =>
                      c
                        .map(x => (x.id === i.id ? { ...x, qty: x.qty - 1 } : x))
                        .filter(x => x.qty > 0)
                    )
                  }
                >
                  <Minus size={14} />
                </button>
                <b>{i.qty}</b>
                <button onClick={() => add(i)}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <label>
          Manual discount (Rs.)
          <input
            type="number"
            min="0"
            value={manualDiscount}
            onChange={e => setManualDiscount(e.target.value)}
          />
        </label>
        <label>
          Rider
          <select value={rider} onChange={e => setRider(e.target.value)}>
            <option value="">Unassigned</option>
            {riders.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Payment method
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
          >
            {(paymentMethods || [])
              .filter(method => method.enabled)
              .map(method => (
                <option key={method.code} value={method.code}>
                  {method.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Payment status
          <select
            value={paymentStatus}
            onChange={e => setPaymentStatus(e.target.value)}
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </label>
        <div className="checkout-summary">
          <div>
            <span>Subtotal</span>
            <b>{currency(subtotal)}</b>
          </div>
          <div>
            <span>Discount</span>
            <b>−{currency(manualDiscount)}</b>
          </div>
          <div>
            <span>Delivery</span>
            <b>{currency(type === 'Delivery' ? deliveryFee : 0)}</b>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <strong>{currency(total)}</strong>
          </div>
        </div>
        <button
          className="btn-primary full"
          disabled={!cart.length || submitting}
          onClick={async () => {
            setSubmitting(true);
            try {
              const orderPayload = {
                customer: sanitizePlainText(customer, 50) || 'Phone customer',
                phone: phone.replace(/\D/g, '').slice(0, 10),
                address: sanitizePlainText(address, 100),
                type,
                items: cart,
                subtotal,
                discount: Number(manualDiscount),
                delivery: type === 'Delivery' ? deliveryFee : 0,
                total,
                paymentMethod,
                paymentStatus,
                rider
              };
              const saved = await newOrder(orderPayload, 'Phone');
              
              if (saved) {
                setCreatedOrder({
                  id: saved.order_code || `KP-${saved.order_number}`,
                  createdAt: new Date().toISOString(),
                  source: 'Phone/POS',
                  customer: orderPayload.customer,
                  phone: orderPayload.phone,
                  address: orderPayload.address,
                  type: orderPayload.type,
                  items: orderPayload.items,
                  subtotal: orderPayload.subtotal,
                  discount: orderPayload.discount,
                  delivery: orderPayload.delivery,
                  total: orderPayload.total,
                  payment: orderPayload.paymentMethod,
                  paymentStatus: orderPayload.paymentStatus,
                  rider: orderPayload.rider
                });
              }

              setCart([]);
              setCustomer('');
              setPhone('');
              setAddress('');
              setManualDiscount(0);
              setRider('');
              setPaymentMethod('cash');
              setPaymentStatus('unpaid');
            } catch (err) {
              console.error('POS order submission error:', err);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? 'Creating order...' : 'Create order'} <ChevronRight />
        </button>
      </section>

      {createdOrder && (
        <ReceiptModal
          order={createdOrder}
          onClose={() => setCreatedOrder(null)}
        />
      )}
    </div>
  );
}
