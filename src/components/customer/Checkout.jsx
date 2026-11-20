import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Bike, Store, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { currency } from '@/utils/formatters';

export function Checkout({
  account,
  cart,
  subtotal,
  delivery,
  paymentMethods,
  discount,
  total,
  voucher,
  setVoucher,
  applyVoucher,
  applied,
  onChangeQty,
  onRemoveItem,
  onClose,
  onSubmit
}) {
  const [name, setName] = useState(account?.name || '');
  const [phone, setPhone] = useState(account?.phone || '');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('Delivery');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentProof, setPaymentProof] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [customerProfileId, setCustomerProfileId] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [loadingAccountDetails, setLoadingAccountDetails] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [useAlternateContact, setUseAlternateContact] = useState(false);
  const [alternateContact, setAlternateContact] = useState('');

  useEffect(() => {
    let active = true;
    const loadCustomerCheckoutDetails = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      setLoadingAccountDetails(true);
      const { data: profile, error: profileError } = await supabase
        .from('customers')
        .select('id,name,phone')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!active) return;
      if (profileError) {
        setError(`Could not load your saved details: ${profileError.message}`);
        setLoadingAccountDetails(false);
        return;
      }
      if (profile) {
        setCustomerProfileId(profile.id);
        setName(profile.name || account?.name || '');
        setPhone(profile.phone || account?.phone || '');
        const { data: addressRows, error: addressError } = await supabase
          .from('customer_addresses')
          .select('id,label,address,is_default')
          .eq('customer_id', profile.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!active) return;
        if (addressError) setError(`Could not load saved addresses: ${addressError.message}`);
        else {
          setSavedAddresses(addressRows || []);
          const preferred =
            (addressRows || []).find(item => item.is_default) || (addressRows || [])[0];
          if (preferred) {
            setSelectedAddressId(preferred.id);
            setAddress(preferred.address);
          }
        }
      }
      setLoadingAccountDetails(false);
    };
    loadCustomerCheckoutDetails();
    return () => {
      active = false;
    };
  }, [account?.userId]);

  useEffect(() => {
    if (!isGift) {
      setName(account?.name || name);
      setPhone(account?.phone || phone);
    }
  }, [isGift]);

  const placeOrder = async () => {
    const orderName = isGift ? recipientName : name;
    const orderPhone = isGift ? recipientPhone : phone;
    const orderAddress = isGift ? recipientAddress : address;
    const callbackDigits = useAlternateContact ? alternateContact.replace(/\D/g, '') : '';
    const phoneDigits = String(orderPhone).replace(/\D/g, '');
    const validationErrors = [];

    if (!orderName.trim()) {
      validationErrors.push(isGift ? 'Please enter the recipient’s name.' : 'Please enter your name.');
    }
    if (!phoneDigits) {
      validationErrors.push(isGift ? 'Please enter the recipient’s phone number.' : 'Please enter your phone number.');
    } else if (phoneDigits.length !== 10) {
      validationErrors.push('Phone number must be exactly 10 digits.');
    }
    if (useAlternateContact && callbackDigits.length !== 10) {
      validationErrors.push('The alternate contact number must be exactly 10 digits.');
    }
    if (type === 'Delivery' && !orderAddress.trim()) {
      validationErrors.push('Please enter your delivery address.');
    }
    if (validationErrors.length) {
      setError(validationErrors.join(' '));
      return;
    }

    const selectedMethod = paymentMethods?.find(method => method.code === paymentMethod);
    if (selectedMethod?.requires_proof && !paymentProof) {
      setError('Please upload your payment screenshot to continue.');
      return;
    }
    if (paymentProof && paymentProof.size > 5 * 1024 * 1024) {
      setError('Payment screenshot must be smaller than 5 MB.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const callbackPhone = useAlternateContact
        ? callbackDigits
        : account?.userId
        ? String(account.phone || phone).replace(/\D/g, '')
        : phoneDigits;

      await onSubmit({
        name: isGift && account?.userId ? name : orderName,
        phone: isGift && account?.userId ? phone : orderPhone,
        address: orderAddress,
        contactPhone: callbackPhone,
        gift: isGift,
        recipientName: isGift ? recipientName : '',
        recipientPhone: isGift ? recipientPhone : '',
        type,
        paymentMethod,
        paymentProof,
        note
      });

      if (
        !isGift &&
        type === 'Delivery' &&
        saveNewAddress &&
        selectedAddressId === 'new' &&
        customerProfileId &&
        orderAddress.trim()
      ) {
        const { data: savedAddress, error: saveAddressError } = await supabase
          .from('customer_addresses')
          .insert({
            customer_id: customerProfileId,
            label: 'Saved from checkout',
            address: orderAddress.trim(),
            is_default: savedAddresses.length === 0
          })
          .select('id,label,address,is_default')
          .single();

        if (!saveAddressError && savedAddress) {
          setSavedAddresses(current => [savedAddress, ...current]);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="checkout-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">CHECKOUT</span>
            <h2>Your order</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close checkout">
            <X />
          </button>
        </div>

        <div className="checkout-scroll">
          <div className="checkout-items">
            {cart.map(x => (
              <div
                className="checkout-item"
                key={x.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px minmax(0,1fr) auto',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <span>{x.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <strong>{x.name}</strong>
                  <small>{currency(x.price)} each</small>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                    <button
                      type="button"
                      aria-label={`Decrease ${x.name} quantity`}
                      onClick={() => onChangeQty(x.id, -1)}
                      style={{
                        width: 30,
                        height: 30,
                        border: '1px solid #e4e7ec',
                        borderRadius: 8,
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: 18,
                        lineHeight: 1
                      }}
                    >
                      −
                    </button>
                    <strong style={{ minWidth: 18, textAlign: 'center', fontSize: 13 }}>{x.qty}</strong>
                    <button
                      type="button"
                      aria-label={`Increase ${x.name} quantity`}
                      onClick={() => onChangeQty(x.id, 1)}
                      disabled={x.outOfStock}
                      style={{
                        width: 30,
                        height: 30,
                        border: '1px solid #e4e7ec',
                        borderRadius: 8,
                        background: '#fff',
                        cursor: x.outOfStock ? 'not-allowed' : 'pointer',
                        fontSize: 18,
                        lineHeight: 1,
                        opacity: x.outOfStock ? 0.45 : 1
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(x.id)}
                      style={{
                        marginLeft: 5,
                        border: 0,
                        background: 'transparent',
                        color: '#b42318',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <b style={{ whiteSpace: 'nowrap' }}>{currency(x.qty * x.price)}</b>
              </div>
            ))}
            {!cart.length && (
              <div style={{ padding: 20, textAlign: 'center', color: '#667085' }}>
                Your cart is empty. Close this window and add some food from the menu.
              </div>
            )}
          </div>

          <div className="voucher-row">
            <input
              value={voucher}
              onChange={e => setVoucher(e.target.value)}
              placeholder="Voucher code"
            />
            <button onClick={applyVoucher}>Apply</button>
            {applied && (
              <span className="voucher-ok">
                <Check size={14} /> Applied
              </span>
            )}
          </div>

          {account?.userId && (
            <div className="checkout-account-banner">
              <span>✓</span>
              <div>
                <strong>
                  Welcome back,{' '}
                  {account.name && !String(account.name).includes('@')
                    ? account.name
                    : 'there'}
                  !
                </strong>
                <small>
                  {loadingAccountDetails
                    ? 'Loading your saved details…'
                    : 'Your account details are filled in automatically.'}
                </small>
              </div>
            </div>
          )}

          <div className="checkout-gift-toggle">
            <label>
              <input
                type="checkbox"
                checked={isGift}
                onChange={e => setIsGift(e.target.checked)}
              />
              <span>
                <strong>Is this order a gift for someone?</strong>
                <small>We’ll deliver it to the person you choose.</small>
              </span>
            </label>
          </div>

          {!isGift ? (
            <div className="form-grid">
              <label>
                Customer name
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label>
                Account phone number
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98XXXXXXXX"
                  inputMode="numeric"
                  type="tel"
                  maxLength={10}
                />
              </label>
            </div>
          ) : (
            <div className="gift-recipient-panel">
              <div className="gift-heading">
                🎁{' '}
                <div>
                  <strong>Who should receive this gift?</strong>
                  <small>These details will be used for delivery.</small>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Recipient’s name
                  <input
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    placeholder="Full name"
                  />
                </label>
                <label>
                  Recipient’s phone number
                  <input
                    value={recipientPhone}
                    onChange={e =>
                      setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    placeholder="98XXXXXXXX"
                    inputMode="numeric"
                    type="tel"
                    maxLength={10}
                  />
                </label>
              </div>
            </div>
          )}

          {account?.userId && (
            <div className="checkout-alternate-contact">
              <label>
                <input
                  type="checkbox"
                  checked={useAlternateContact}
                  onChange={e => setUseAlternateContact(e.target.checked)}
                />
                <span>
                  <strong>Call me on a different number</strong>
                  <small>Optional — otherwise we’ll use your account phone number.</small>
                </span>
              </label>
              {useAlternateContact && (
                <input
                  value={alternateContact}
                  onChange={e =>
                    setAlternateContact(e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  placeholder="Alternative 10-digit phone number"
                  inputMode="numeric"
                  type="tel"
                  maxLength={10}
                />
              )}
            </div>
          )}

          <div className="order-type">
            <button
              className={type === 'Delivery' ? 'selected' : ''}
              onClick={() => setType('Delivery')}
            >
              <Bike size={17} /> Delivery
            </button>
            <button
              className={type === 'Pickup' ? 'selected' : ''}
              onClick={() => setType('Pickup')}
            >
              <Store size={17} /> Pickup
            </button>
          </div>

          {type === 'Delivery' && (
            <div className="checkout-address-panel">
              <label className="full-label">
                {isGift ? 'Recipient’s delivery address' : 'Delivery address'}
                {isGift ? (
                  <textarea
                    rows="3"
                    value={recipientAddress}
                    onChange={e => setRecipientAddress(e.target.value)}
                    placeholder="Recipient’s area, street, house and nearby landmark…"
                  />
                ) : (
                  <>
                    {account?.userId && savedAddresses.length > 0 && (
                      <select
                        value={selectedAddressId}
                        onChange={e => {
                          setSelectedAddressId(e.target.value);
                          const selected = savedAddresses.find(item => item.id === e.target.value);
                          if (selected) setAddress(selected.address);
                          else setAddress('');
                        }}
                      >
                        <option value="new">＋ Add a new delivery location</option>
                        {savedAddresses.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                            {item.is_default ? ' · Default' : ''} — {item.address.slice(0, 55)}
                          </option>
                        ))}
                      </select>
                    )}
                    {(selectedAddressId === 'new' ||
                      !account?.userId ||
                      !savedAddresses.length) && (
                      <>
                        <textarea
                          rows="3"
                          value={address}
                          onChange={e => {
                            setAddress(e.target.value);
                            setSelectedAddressId('new');
                          }}
                          placeholder="Area, street, landmark, house..."
                        />
                        {account?.userId && (
                          <label className="checkout-save-address">
                            <input
                              type="checkbox"
                              checked={saveNewAddress}
                              onChange={e => setSaveNewAddress(e.target.checked)}
                            />{' '}
                            Save this location to my account for next time
                          </label>
                        )}
                      </>
                    )}
                  </>
                )}
              </label>
            </div>
          )}

          <label className="full-label">
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

          {paymentMethods?.find(
            method => method.code === paymentMethod && method.enabled
          )?.qr_image_url && (
            <div
              className="panel"
              style={{ padding: 14, marginTop: 10, textAlign: 'center' }}
            >
              <strong>
                {paymentMethods.find(method => method.code === paymentMethod && method.enabled).name} QR
              </strong>
              <img
                src={paymentMethods.find(method => method.code === paymentMethod).qr_image_url}
                alt={`${paymentMethod} payment QR`}
                style={{
                  display: 'block',
                  width: 190,
                  maxWidth: '100%',
                  margin: '12px auto',
                  borderRadius: 10
                }}
              />
              <p style={{ fontSize: 13, color: '#667085' }}>
                {paymentMethods.find(method => method.code === paymentMethod && method.enabled)
                  .instructions || 'Scan the QR code to pay.'}
              </p>
            </div>
          )}

          {paymentMethods?.find(method => method.code === paymentMethod)?.requires_proof && (
            <label className="full-label">
              Payment screenshot <span style={{ color: '#b42318' }}>* Required</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                onChange={e => setPaymentProof(e.target.files?.[0] || null)}
              />
              <small style={{ color: '#667085' }}>
                Upload your payment confirmation screenshot (PNG, JPG or WebP, max 5 MB). Your
                order remains Unpaid until the owner verifies it.
              </small>
            </label>
          )}

          {!paymentMethods?.find(method => method.code === paymentMethod)?.requires_proof && (
            <p style={{ fontSize: 13, color: '#667085' }}>
              No payment screenshot is needed for this payment method.
            </p>
          )}

          <label className="full-label">
            Order note (optional)
            <textarea
              rows="2"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Less spicy, no onion, etc."
            />
          </label>

          <div className="checkout-summary">
            <div>
              <span>Subtotal</span>
              <b>{currency(subtotal)}</b>
            </div>
            <div>
              <span>Discount</span>
              <b className="discount">−{currency(discount)}</b>
            </div>
            <div>
              <span>Delivery</span>
              <b>{currency(type === 'Delivery' ? delivery : 0)}</b>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>
                {currency(subtotal - discount + (type === 'Delivery' ? delivery : 0))}
              </strong>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            className="btn-primary submit-order"
            onClick={placeOrder}
            disabled={submitting}
          >
            {submitting ? 'Placing order...' : 'Place order'}
            {!submitting && <ChevronRight />}
          </button>

          <p className="guest-note">
            No account or login required. We'll contact you to confirm your order.
          </p>
        </div>
      </div>
    </div>
  );
}
