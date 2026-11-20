import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatTime12, parseTime12 } from '@/utils/formatters';

export function BusinessSettings({
  paymentMethods,
  setPaymentMethods,
  deliveryFee,
  setDeliveryFee,
  storeHours,
  setStoreHours,
  storeManualStatus,
  setStoreManualStatus,
  storeOpen,
  setStoreOpen,
  brandLogo,
  setBrandLogo
}) {
  const [feeInput, setFeeInput] = useState(String(deliveryFee));
  const [savingFee, setSavingFee] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [savingMethod, setSavingMethod] = useState(false);
  const [uploadingCode, setUploadingCode] = useState('');
  const [message, setMessage] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const uploadBrandLogo = async file => {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage('Choose a JPG, PNG, WEBP or SVG logo smaller than 5 MB.');
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.type.split('/')[1].replace('svg+xml', 'svg').replace('jpeg', 'jpg');
      const path = `brand/logo-${Date.now()}.${ext}`;
      const { error: upError } = await supabase.storage
        .from('kp-brand-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upError) throw upError;

      const { data } = supabase.storage.from('kp-brand-assets').getPublicUrl(path);
      const { error: saveError } = await supabase.from('business_settings').upsert(
        {
          setting_key: 'brand_logo_url',
          setting_value: data.publicUrl,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'setting_key' }
      );
      if (saveError) throw saveError;
      setBrandLogo(`${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}v=${Date.now()}`);
      setMessage('Khante Pinte logo updated across the customer website.');
    } catch (e) {
      setMessage(`Logo upload failed: ${e.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const [hoursInput, setHoursInput] = useState({
    open_time: formatTime12(storeHours?.open_time || '21:00'),
    close_time: formatTime12(storeHours?.close_time || '04:00')
  });

  useEffect(() => {
    setHoursInput({
      open_time: formatTime12(storeHours?.open_time || '21:00'),
      close_time: formatTime12(storeHours?.close_time || '04:00')
    });
  }, [storeHours]);

  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => setFeeInput(String(deliveryFee)), [deliveryFee]);

  const saveFee = async () => {
    const amount = Number(feeInput);
    if (!Number.isFinite(amount) || amount < 0) {
      setMessage('Enter a valid delivery charge.');
      return;
    }
    setSavingFee(true);
    setMessage('');
    const { error } = await supabase.from('business_settings').upsert(
      {
        setting_key: 'delivery_fee',
        setting_value: amount,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'setting_key' }
    );
    setSavingFee(false);
    if (error) {
      setMessage(`Could not save delivery fee: ${error.message}`);
      return;
    }
    setDeliveryFee(amount);
    setMessage('Delivery charge saved successfully.');
  };

  const addMethod = async () => {
    const code = newCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!newName.trim() || !code) {
      setMessage('Enter a payment method name and code.');
      return;
    }
    setSavingMethod(true);
    setMessage('');
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        code,
        name: newName.trim(),
        instructions: newInstructions.trim(),
        enabled: true,
        requires_proof: true,
        display_order: (paymentMethods?.length || 0) + 1
      })
      .select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof')
      .single();
    setSavingMethod(false);
    if (error) {
      setMessage(`Could not add payment method: ${error.message}`);
      return;
    }
    setPaymentMethods(current => [...current, data]);
    setNewName('');
    setNewCode('');
    setNewInstructions('');
    setMessage('Payment method added. You can now upload its QR code.');
  };

  const uploadQr = async (method, file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setMessage('Use PNG, JPG or WebP images.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('QR image must be smaller than 5 MB.');
      return;
    }
    setUploadingCode(method.code);
    setMessage('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${method.code}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-qr-codes')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('payment-qr-codes')
        .getPublicUrl(path);
      const { data, error } = await supabase
        .from('payment_methods')
        .update({ qr_image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('code', method.code)
        .select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof')
        .single();
      if (error) throw error;
      setPaymentMethods(current =>
        current.map(item => (item.code === method.code ? data : item))
      );
      setMessage(`${method.name} QR uploaded successfully.`);
    } catch (error) {
      setMessage(`QR upload failed: ${error.message}`);
    } finally {
      setUploadingCode('');
    }
  };

  const toggleMethod = async method => {
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ enabled: !method.enabled, updated_at: new Date().toISOString() })
      .eq('code', method.code)
      .select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof')
      .single();
    if (error) {
      setMessage(`Could not update method: ${error.message}`);
      return;
    }
    setPaymentMethods(current =>
      current.map(item => (item.code === method.code ? data : item))
    );
  };

  const updateInstructions = async (method, instructions) => {
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ instructions, updated_at: new Date().toISOString() })
      .eq('code', method.code)
      .select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof')
      .single();
    if (error) {
      setMessage(`Could not save instructions: ${error.message}`);
      return;
    }
    setPaymentMethods(current =>
      current.map(item => (item.code === method.code ? data : item))
    );
  };

  const saveHours = async () => {
    const openTime = parseTime12(hoursInput.open_time);
    const closeTime = parseTime12(hoursInput.close_time);
    if (!openTime || !closeTime || openTime === closeTime) {
      setMessage('Enter times like 09:00 PM and 04:00 AM, and make sure they are different.');
      return;
    }
    const normalizedHours = { open_time: openTime, close_time: closeTime };
    setSavingHours(true);
    setMessage('');
    const { error } = await supabase.from('business_settings').upsert(
      {
        setting_key: 'store_hours',
        setting_value: normalizedHours,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'setting_key' }
    );
    setSavingHours(false);
    if (error) {
      setMessage(`Could not save business hours: ${error.message}`);
      return;
    }
    setStoreHours(normalizedHours);
    setHoursInput({ open_time: formatTime12(openTime), close_time: formatTime12(closeTime) });
    setMessage('Business hours saved successfully.');
    const { data, error: statusError } = await supabase.rpc('is_store_open');
    if (!statusError) setStoreOpen(!!data);
  };

  const setManualStatus = async status => {
    const { error } = await supabase.from('business_settings').upsert(
      {
        setting_key: 'store_manual_status',
        setting_value: status,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'setting_key' }
    );
    if (error) {
      setMessage(`Could not update store status: ${error.message}`);
      return;
    }
    setStoreManualStatus(status);
    const { data, error: statusError } = await supabase.rpc('is_store_open');
    if (!statusError) setStoreOpen(!!data);
    setMessage(
      status === 'auto'
        ? 'Automatic opening hours restored.'
        : `Store manually set to ${status}.`
    );
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section className="panel" style={{ padding: 20 }}>
        <div className="panel-head">
          <div>
            <h3>Khante Pinte branding</h3>
            <small>
              Upload or replace the logo. It appears in the customer header, footer and admin
              workspace.
            </small>
          </div>
        </div>
        {brandLogo && (
          <img
            src={brandLogo}
            alt="Current Khante Pinte logo"
            style={{ width: 180, maxHeight: 90, objectFit: 'contain', marginBottom: 12 }}
          />
        )}
        <label className="admin-file-label">
          {uploadingLogo ? 'Uploading logo…' : 'Upload / replace logo (JPG, PNG, WEBP or SVG)'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            disabled={uploadingLogo}
            onChange={e => uploadBrandLogo(e.target.files?.[0])}
          />
        </label>
        {message && (
          <p className={message.includes('updated') ? 'success-note' : 'form-error'}>
            {message}
          </p>
        )}
      </section>

      <section className="panel" style={{ padding: 20 }}>
        <div className="panel-head">
          <div>
            <h3>Store availability & business hours</h3>
            <small>Set your regular hours or manually open/close the customer website.</small>
          </div>
          <strong style={{ color: storeOpen ? '#15803d' : '#dc2626' }}>
            {storeOpen ? 'OPEN NOW' : 'CLOSED NOW'}
          </strong>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
            gap: 12,
            maxWidth: 560
          }}
        >
          <label>
            Opening time (12-hour format)
            <input
              type="text"
              inputMode="text"
              placeholder="09:00 PM"
              value={hoursInput.open_time}
              onChange={e =>
                setHoursInput(v => ({ ...v, open_time: e.target.value }))
              }
            />
          </label>
          <label>
            Closing time (12-hour format)
            <input
              type="text"
              inputMode="text"
              placeholder="04:00 AM"
              value={hoursInput.close_time}
              onChange={e =>
                setHoursInput(v => ({ ...v, close_time: e.target.value }))
              }
            />
          </label>
        </div>
        <button
          className="btn-primary"
          style={{ marginTop: 12 }}
          onClick={saveHours}
          disabled={savingHours}
        >
          {savingHours ? 'Saving…' : 'Save business hours'}
        </button>
        <div style={{ borderTop: '1px solid #eaecf0', marginTop: 18, paddingTop: 16 }}>
          <strong>Store control</strong>
          <p style={{ color: '#667085', margin: '6px 0 12px' }}>
            Automatic follows the schedule. Manual open/closed overrides the schedule until you
            switch back to Automatic.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={storeManualStatus === 'auto' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setManualStatus('auto')}
            >
              Automatic
            </button>
            <button
              className={storeManualStatus === 'open' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setManualStatus('open')}
            >
              Open store
            </button>
            <button
              className={storeManualStatus === 'closed' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setManualStatus('closed')}
            >
              Close store
            </button>
          </div>
        </div>
      </section>

      <section className="panel" style={{ padding: 20 }}>
        <div className="panel-head">
          <div>
            <h3>Delivery charge</h3>
            <small>
              Customers are charged this amount for delivery. Pickup orders are free of delivery
              charge.
            </small>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 420 }}>
          <span>Rs.</span>
          <input
            type="number"
            min="0"
            step="1"
            value={feeInput}
            onChange={e => setFeeInput(e.target.value)}
          />
          <button className="btn-primary" onClick={saveFee} disabled={savingFee}>
            {savingFee ? 'Saving…' : 'Save charge'}
          </button>
        </div>
      </section>

      <section className="panel" style={{ padding: 20 }}>
        <div className="panel-head">
          <div>
            <h3>Payment methods</h3>
            <small>
              Add your own payment options, upload QR codes and choose which ones customers can
              use.
            </small>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
            gap: 10,
            marginBottom: 12
          }}
        >
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Method name (e.g. IME Pay)"
          />
          <input
            value={newCode}
            onChange={e => setNewCode(e.target.value)}
            placeholder="Unique code (e.g. ime_pay)"
          />
          <input
            value={newInstructions}
            onChange={e => setNewInstructions(e.target.value)}
            placeholder="Payment instructions (optional)"
          />
          <button className="btn-primary" onClick={addMethod} disabled={savingMethod}>
            {savingMethod ? 'Adding…' : 'Add payment option'}
          </button>
        </div>
        {paymentMethods.map(method => (
          <div
            key={method.code}
            style={{
              borderTop: '1px solid #eaecf0',
              padding: '14px 0',
              display: 'grid',
              gridTemplateColumns: 'minmax(140px,1fr) minmax(180px,2fr) auto',
              gap: 12,
              alignItems: 'center'
            }}
          >
            <div>
              <strong>{method.name}</strong>
              <small style={{ display: 'block', color: '#667085' }}>{method.code}</small>
              {method.qr_image_url && (
                <img
                  src={method.qr_image_url}
                  alt={`${method.name} QR`}
                  style={{ width: 90, height: 90, objectFit: 'contain', marginTop: 8 }}
                />
              )}
            </div>
            <div>
              <input
                defaultValue={method.instructions || ''}
                placeholder="Customer instructions"
                onBlur={e => {
                  if (e.target.value !== (method.instructions || '')) {
                    updateInstructions(method, e.target.value);
                  }
                }}
              />
              <label style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={e => uploadQr(method, e.target.files?.[0])}
                />{' '}
                {uploadingCode === method.code
                  ? 'Uploading QR…'
                  : 'Upload / replace QR (max 5 MB)'}
              </label>
              {method.code === 'cash' ? (
                <small style={{ display: 'block', marginTop: 8, color: '#667085' }}>
                  🔒 Protected: Cash on Delivery cannot be deleted and never requires a
                  screenshot.
                </small>
              ) : (
                <label style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={!!method.requires_proof}
                    onChange={async e => {
                      const value = e.target.checked;
                      const { data, error } = await supabase
                        .from('payment_methods')
                        .update({ requires_proof: value })
                        .eq('code', method.code)
                        .select(
                          'code,name,instructions,qr_image_url,enabled,display_order,requires_proof'
                        )
                        .single();
                      if (error) {
                        setMessage(`Could not update proof requirement: ${error.message}`);
                        return;
                      }
                      setPaymentMethods(current =>
                        current.map(item => (item.code === method.code ? data : item))
                      );
                    }}
                  />{' '}
                  Require payment screenshot from customer
                </label>
              )}
            </div>
            <button
              className={method.enabled ? 'btn-outline' : 'danger-soft'}
              onClick={() => toggleMethod(method)}
            >
              {method.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
        {message && (
          <p
            className={
              message.includes('successfully') || message.startsWith('Payment method added')
                ? 'success-note'
                : 'form-error'
            }
          >
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
