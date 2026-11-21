import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatTime12, parseTime12 } from '@/utils/formatters';
import { Sparkles, Calendar, Clock, AlertTriangle, Image as ImageIcon, Trash2, Eye, CheckCircle2, X, Tag } from 'lucide-react';
import { OfferModal } from '@/components/customer/OfferModal';

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
  setBrandLogo,
  activeOffer,
  setActiveOffer,
  storeClosure,
  setStoreClosure,
  vouchers = []
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

  // --- Offers Section State ---
  const [offerForm, setOfferForm] = useState({
    active: activeOffer?.active ?? false,
    image_url: activeOffer?.image_url || '',
    title: activeOffer?.title || '',
    description: activeOffer?.description || '',
    voucher_code: activeOffer?.voucher_code || '',
    button_text: activeOffer?.button_text || 'View Menu & Order',
    show_as_popup: activeOffer?.show_as_popup ?? true,
    show_as_banner: activeOffer?.show_as_banner ?? true
  });
  const [uploadingOfferImage, setUploadingOfferImage] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
  const [previewingOffer, setPreviewingOffer] = useState(false);

  useEffect(() => {
    if (activeOffer) {
      setOfferForm({
        active: activeOffer.active ?? false,
        image_url: activeOffer.image_url || '',
        title: activeOffer.title || '',
        description: activeOffer.description || '',
        voucher_code: activeOffer.voucher_code || '',
        button_text: activeOffer.button_text || 'View Menu & Order',
        show_as_popup: activeOffer.show_as_popup ?? true,
        show_as_banner: activeOffer.show_as_banner ?? true
      });
    }
  }, [activeOffer]);

  // --- Scheduled Store Closure State ---
  const [closureDays, setClosureDays] = useState(2);
  const [closureReason, setClosureReason] = useState('Dashain Festival Holidays');
  const [customReopenDate, setCustomReopenDate] = useState('');
  const [savingClosure, setSavingClosure] = useState(false);

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
    setMessage('Delivery fee updated successfully.');
  };

  const uploadMethodQR = async (method, file) => {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage('Choose a JPG, PNG or WEBP image smaller than 5 MB.');
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

  // --- Scheduled Holiday Closure Actions ---
  const scheduleClosure = async (days, reasonText, customDateStr = '') => {
    setMessage('');
    setSavingClosure(true);
    try {
      let reopenDate;
      const now = new Date();
      if (customDateStr) {
        reopenDate = new Date(customDateStr);
        if (isNaN(reopenDate.getTime()) || reopenDate <= now) {
          throw new Error('Please choose a valid future reopening date & time.');
        }
      } else {
        const target = new Date(now.getTime() + days * 24 * 3600 * 1000);
        const [openH, openM] = (storeHours?.open_time || '21:00').split(':').map(Number);
        target.setHours(openH || 21, openM || 0, 0, 0);
        reopenDate = target;
      }

      const closurePayload = {
        active: true,
        reason: reasonText.trim() || 'Holiday closure',
        days: days || 0,
        reopen_at: reopenDate.toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('business_settings').upsert(
        {
          setting_key: 'store_closure',
          setting_value: closurePayload,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'setting_key' }
      );
      if (error) throw error;

      if (setStoreClosure) setStoreClosure(closurePayload);
      const { data: statusData } = await supabase.rpc('is_store_open');
      setStoreOpen(!!statusData);
      setMessage(`Holiday closure scheduled. Store closed until ${reopenDate.toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short' })} for ${reasonText}.`);
    } catch (err) {
      setMessage(`Could not set closure: ${err.message}`);
    } finally {
      setSavingClosure(false);
    }
  };

  const cancelClosure = async () => {
    setMessage('');
    setSavingClosure(true);
    try {
      const clearPayload = {
        active: false,
        reason: '',
        days: 0,
        reopen_at: null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('business_settings').upsert(
        {
          setting_key: 'store_closure',
          setting_value: clearPayload,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'setting_key' }
      );
      if (error) throw error;

      if (setStoreClosure) setStoreClosure(clearPayload);
      const { data: statusData } = await supabase.rpc('is_store_open');
      setStoreOpen(!!statusData);
      setMessage('Holiday closure cancelled. Normal store availability restored.');
    } catch (err) {
      setMessage(`Could not cancel closure: ${err.message}`);
    } finally {
      setSavingClosure(false);
    }
  };

  // --- Offers Section Actions ---
  const uploadOfferImage = async file => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage('Choose a JPG, PNG or WEBP image smaller than 5 MB.');
      return;
    }
    setUploadingOfferImage(true);
    setMessage('');
    try {
      const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
      const path = `offers/offer-${Date.now()}.${ext}`;
      const { error: upError } = await supabase.storage
        .from('kp-brand-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upError) throw upError;

      const { data } = supabase.storage.from('kp-brand-assets').getPublicUrl(path);
      const newUrl = `${data.publicUrl}?v=${Date.now()}`;
      setOfferForm(f => ({ ...f, image_url: newUrl }));
      setMessage('Offer photo uploaded. Click "Save Offer Changes" to activate.');
    } catch (err) {
      setMessage(`Offer photo upload failed: ${err.message}`);
    } finally {
      setUploadingOfferImage(false);
    }
  };

  const saveOfferSettings = async (overrideActive = null) => {
    setSavingOffer(true);
    setMessage('');
    try {
      const nextActive = overrideActive !== null ? overrideActive : offerForm.active;
      const payload = {
        active: !!nextActive,
        image_url: offerForm.image_url || '',
        title: offerForm.title?.trim() || '',
        description: offerForm.description?.trim() || '',
        voucher_code: offerForm.voucher_code?.trim() || '',
        button_text: offerForm.button_text?.trim() || 'View Menu & Order',
        show_as_popup: offerForm.show_as_popup ?? true,
        show_as_banner: offerForm.show_as_banner ?? true,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('business_settings').upsert(
        {
          setting_key: 'active_offer',
          setting_value: payload,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'setting_key' }
      );
      if (error) throw error;

      setOfferForm(f => ({ ...f, active: payload.active }));
      if (setActiveOffer) setActiveOffer(payload);
      setMessage(payload.active ? 'Offer is now LIVE on customer website!' : 'Offer settings saved (Offer is currently OFF).');
    } catch (err) {
      setMessage(`Could not save offer: ${err.message}`);
    } finally {
      setSavingOffer(false);
    }
  };

  const isClosureActive = storeClosure?.active && (!storeClosure.reopen_at || new Date(storeClosure.reopen_at) > new Date());

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* 1. KHANTE PINTE BRANDING */}
      <section className="panel" style={{ padding: 20 }}>
        <div className="panel-head">
          <div>
            <h3>Khante Pinte branding</h3>
            <small>
              Upload or replace the logo. It appears in the customer header, footer and admin workspace.
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
          <p className={message.includes('updated') || message.includes('saved') || message.includes('scheduled') ? 'success-note' : 'form-error'}>
            {message}
          </p>
        )}
      </section>

      {/* 2. OFFERS & FESTIVE ANNOUNCEMENTS (NEW SECTION) */}
      <section className="panel" style={{ padding: 20 }}>
        <div className="panel-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="#e97942" />
              <h3 style={{ margin: 0 }}>Offers & Festive Announcements</h3>
            </div>
            <small>
              Upload promotional banners or festive greetings (Dashain, Tihar, New Year). Pop up on customer website or display as a top announcement bar.
            </small>
          </div>
          <span className={`admin-offer-status-badge ${offerForm.active && offerForm.image_url ? 'live' : 'off'}`}>
            {offerForm.active && offerForm.image_url ? '● OFFER IS LIVE' : '○ OFFER IS OFF'}
          </span>
        </div>

        {/* Live Toggle Bar */}
        <div className="admin-offer-toggle-bar">
          <div>
            <strong>Customer Visibility</strong>
            <small style={{ display: 'block', color: '#667085', marginTop: 2 }}>
              {offerForm.active
                ? 'Offer is ON: Customers will see the popup and announcement banner on the website.'
                : 'Offer is OFF: Nothing is shown to customers.'}
            </small>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={offerForm.active ? 'btn-primary' : 'btn-outline'}
              onClick={() => {
                const next = !offerForm.active;
                setOfferForm(f => ({ ...f, active: next }));
                saveOfferSettings(next);
              }}
              disabled={savingOffer || !offerForm.image_url}
              title={!offerForm.image_url ? 'Please upload an offer photo first' : ''}
            >
              {offerForm.active ? 'Turn Offer OFF' : 'Turn Offer ON'}
            </button>
          </div>
        </div>

        {/* Offer Photo Container */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
            Offer / Greeting Photo <span style={{ color: '#b42318' }}>*</span>
          </label>
          {offerForm.image_url ? (
            <div>
              <div className="admin-image-container-preview">
                <img src={offerForm.image_url} alt="Offer banner preview" />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label className="btn-outline" style={{ cursor: 'pointer', margin: 0 }}>
                  Replace photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingOfferImage}
                    onChange={e => uploadOfferImage(e.target.files?.[0])}
                    style={{ display: 'none' }}
                  />
                </label>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => {
                    setOfferForm(f => ({ ...f, image_url: '', active: false }));
                  }}
                >
                  <Trash2 size={14} /> Remove photo
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setPreviewingOffer(true)}
                >
                  <Eye size={14} /> Preview popup
                </button>
              </div>
            </div>
          ) : (
            <label className="admin-file-label" style={{ borderStyle: 'dashed', padding: 28, textAlign: 'center' }}>
              <ImageIcon size={32} style={{ margin: '0 auto 8px', color: '#98a2b3' }} />
              <strong>{uploadingOfferImage ? 'Uploading offer photo…' : 'Click to upload Offer Flyer / Banner photo'}</strong>
              <small style={{ color: '#667085', marginTop: 4 }}>
                Supports JPG, PNG, WEBP (landscape, portrait or square, up to 5 MB). Displayed crisp and uncropped.
              </small>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingOfferImage}
                onChange={e => uploadOfferImage(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        {/* Offer Title & Description */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 14 }}>
          <label>
            Headline / Occasion Title (optional)
            <input
              value={offerForm.title}
              maxLength={80}
              onChange={e => setOfferForm(f => ({ ...f, title: e.target.value.slice(0, 80) }))}
              placeholder="e.g. Dashain Special Dhamaka Offer! 🏮"
            />
          </label>
          <label>
            Linked Voucher Code (optional)
            <input
              value={offerForm.voucher_code}
              maxLength={20}
              onChange={e => setOfferForm(f => ({ ...f, voucher_code: e.target.value.toUpperCase().slice(0, 20) }))}
              placeholder="e.g. DASHAIN15"
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 14 }}>
          Announcement Message / Offer Details (optional)
          <textarea
            rows="2"
            maxLength={300}
            value={offerForm.description}
            onChange={e => setOfferForm(f => ({ ...f, description: e.target.value.slice(0, 300) }))}
            placeholder="e.g. Wishing all our food lovers a joyful Vijaya Dashami! Use code DASHAIN15 for 15% off on orders above Rs. 1,000."
          />
        </label>

        {/* Display modes */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', margin: '12px 0 16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={offerForm.show_as_popup}
              onChange={e => setOfferForm(f => ({ ...f, show_as_popup: e.target.checked }))}
            />
            <span>Pop up automatically when customer opens website</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={offerForm.show_as_banner}
              onChange={e => setOfferForm(f => ({ ...f, show_as_banner: e.target.checked }))}
            />
            <span>Show clickable announcement bar above menu</span>
          </label>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => saveOfferSettings()}
          disabled={savingOffer || uploadingOfferImage}
        >
          {savingOffer ? 'Saving offer…' : 'Save Offer Settings'}
        </button>
      </section>

      {/* 3. STORE AVAILABILITY, BUSINESS HOURS & HOLIDAY CLOSURES */}
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

        {/* Regular Hours Input */}
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

        {/* Manual Status Buttons */}
        <div style={{ borderTop: '1px solid #eaecf0', marginTop: 18, paddingTop: 16 }}>
          <strong>Store control</strong>
          <p style={{ color: '#667085', margin: '6px 0 12px' }}>
            Automatic follows the schedule. Manual open/closed overrides the schedule until you switch back to Automatic.
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

        {/* NEW: SCHEDULED HOLIDAY / MULTI-DAY CLOSURE SUB-PANEL */}
        <div style={{ borderTop: '1px solid #eaecf0', marginTop: 22, paddingTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Calendar size={18} color="#991b1b" />
            <strong style={{ fontSize: 15 }}>Scheduled Multi-Day / Holiday Closure</strong>
          </div>
          <p style={{ color: '#667085', margin: '4px 0 14px', fontSize: 13 }}>
            Notify customers when closing for Dashain, Tihar, or holidays for 1, 2, or 3 days. Customers will see your polite reason and exact reopening date.
          </p>

          {isClosureActive ? (
            <div className="admin-closure-active-card">
              <div>
                <div className="admin-closure-title">
                  <AlertTriangle size={18} />
                  <span>STORE CURRENTLY CLOSED FOR HOLIDAYS</span>
                </div>
                <div className="admin-closure-subtitle">
                  <strong>Reason:</strong> {storeClosure.reason || 'Holiday closure'}
                </div>
                <div className="admin-closure-subtitle">
                  <strong>Reopening on:</strong>{' '}
                  {storeClosure.reopen_at
                    ? new Date(storeClosure.reopen_at).toLocaleString('en-NP', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Scheduled date'}
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={cancelClosure}
                disabled={savingClosure}
              >
                {savingClosure ? 'Restoring…' : 'End Closure & Reopen Now'}
              </button>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                1. Select Closure Duration
              </span>
              <div className="admin-quick-chips">
                {[1, 2, 3].map(days => (
                  <button
                    key={days}
                    type="button"
                    className={`admin-chip-btn ${closureDays === days && !customReopenDate ? 'active' : ''}`}
                    onClick={() => {
                      setClosureDays(days);
                      setCustomReopenDate('');
                    }}
                  >
                    Closed for {days} {days === 1 ? 'Day' : 'Days'}
                  </button>
                ))}
                <button
                  type="button"
                  className={`admin-chip-btn ${customReopenDate ? 'active' : ''}`}
                  onClick={() => {
                    const d = new Date(Date.now() + 4 * 24 * 3600 * 1000);
                    setCustomReopenDate(d.toISOString().slice(0, 16));
                  }}
                >
                  Custom Reopen Date
                </button>
              </div>

              {customReopenDate && (
                <div style={{ margin: '8px 0 14px' }}>
                  <label style={{ fontSize: 12 }}>
                    Pick exact reopening date & time:
                    <input
                      type="datetime-local"
                      value={customReopenDate}
                      onChange={e => setCustomReopenDate(e.target.value)}
                      style={{ marginTop: 4 }}
                    />
                  </label>
                </div>
              )}

              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginTop: 10 }}>
                2. Closure Reason (Dashain, Tihar, Maintenance)
              </span>
              <div className="admin-quick-chips">
                {[
                  'Dashain Festival Holidays 🏮',
                  'Tihar Holidays 🪔',
                  'Maintenance & Deep Cleaning 🛠️',
                  'Staff Gathering & Holiday 👥'
                ].map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`admin-chip-btn ${closureReason === r ? 'active' : ''}`}
                    onClick={() => setClosureReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                value={closureReason}
                maxLength={80}
                onChange={e => setClosureReason(e.target.value.slice(0, 80))}
                placeholder="Or type custom reason (e.g. Closed for Dashain)"
                style={{ marginBottom: 12 }}
              />

              <button
                type="button"
                className="btn-primary"
                onClick={() => scheduleClosure(closureDays, closureReason, customReopenDate)}
                disabled={savingClosure}
              >
                {savingClosure
                  ? 'Scheduling closure…'
                  : `Schedule Closure (${customReopenDate ? 'Custom Date' : `${closureDays} Days`})`}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 4. DELIVERY CHARGE */}
      <section className="panel" style={{ padding: 20 }}>
        <div className="panel-head">
          <div>
            <h3>Delivery charge</h3>
            <small>
              Customers are charged this amount for delivery. Pickup orders are free of delivery charge.
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

      {/* 5. PAYMENT METHODS */}
      <section className="panel" style={{ padding: 20 }}>
        <div className="panel-head">
          <div>
            <h3>Payment methods</h3>
            <small>
              Add your own payment options, upload QR codes and choose which ones customers can use.
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
            placeholder="Instructions / note"
          />
          <button
            className="btn-primary"
            disabled={savingMethod}
            onClick={async () => {
              if (!newName.trim() || !newCode.trim()) {
                setMessage('Enter both name and code for the new payment method.');
                return;
              }
              const code = newCode.trim().toLowerCase().replaceAll(' ', '_');
              setSavingMethod(true);
              setMessage('');
              const { data, error } = await supabase
                .from('payment_methods')
                .insert({
                  code,
                  name: newName.trim(),
                  instructions: newInstructions.trim(),
                  enabled: true,
                  display_order: paymentMethods.length + 1
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
              setMessage(`Payment method ${data.name} added.`);
            }}
          >
            {savingMethod ? 'Adding…' : 'Add method'}
          </button>
        </div>

        {paymentMethods.map(method => (
          <div
            key={method.code}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #eaecf0',
              padding: '12px 0',
              gap: 12
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong>{method.name}</strong>
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: '#f2f4f7',
                    color: '#475467'
                  }}
                >
                  {method.code}
                </span>
                {method.qr_image_url && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: '#ecfdf3',
                      color: '#027a48'
                    }}
                  >
                    QR uploaded
                  </span>
                )}
              </div>
              <input
                style={{ marginTop: 6, fontSize: 13, width: '100%', maxWidth: 420 }}
                defaultValue={method.instructions || ''}
                placeholder="Instructions shown to customer"
                onBlur={e => {
                  if (e.target.value !== method.instructions) {
                    updateInstructions(method, e.target.value);
                  }
                }}
              />
              <label className="admin-file-label" style={{ marginTop: 6, display: 'inline-block' }}>
                {uploadingCode === method.code ? 'Uploading QR…' : 'Upload QR code image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingCode === method.code}
                  onChange={e => uploadMethodQR(method, e.target.files?.[0])}
                />
              </label>

              {method.qr_image_url && (
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
                        .select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof')
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
      </section>

      {/* Admin Offer Modal Preview */}
      {previewingOffer && (
        <OfferModal
          offer={offerForm}
          onClose={() => setPreviewingOffer(false)}
        />
      )}
    </div>
  );
}
