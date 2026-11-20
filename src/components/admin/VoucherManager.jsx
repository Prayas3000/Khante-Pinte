import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { currency } from '@/utils/formatters';

export function VoucherManager({ vouchers, setVouchers }) {
  const [code, setCode] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const mapVoucher = v => ({
    id: v.id,
    code: v.code,
    type: v.discount_type === 'percentage' ? 'percent' : 'fixed',
    value: Number(v.discount_value),
    min: Number(v.minimum_order || 0),
    max: Number(v.maximum_discount || 0),
    active: v.active,
    expiresAt: v.expires_at
  });

  const addVoucher = async () => {
    const clean = code.trim().toUpperCase();
    const amount = Number(value);
    if (!clean || !Number.isFinite(amount) || amount <= 0) {
      setMessage('Enter a voucher code and a discount greater than zero.');
      return;
    }
    if (type === 'percentage' && amount > 100) {
      setMessage('Percentage discount cannot exceed 100%.');
      return;
    }
    setSaving(true);
    setMessage('');
    const { data, error } = await supabase
      .from('vouchers')
      .insert({
        code: clean,
        discount_type: type,
        discount_value: amount,
        minimum_order: Number(min || 0),
        maximum_discount: max ? Number(max) : null,
        active: true
      })
      .select('id,code,discount_type,discount_value,minimum_order,maximum_discount,active,expires_at')
      .single();

    setSaving(false);
    if (error) {
      setMessage(`Could not create voucher: ${error.message}`);
      return;
    }
    setVouchers(current => [mapVoucher(data), ...current]);
    setCode('');
    setValue('');
    setMin('');
    setMax('');
    setMessage('Voucher saved to Supabase.');
  };

  const toggle = async v => {
    const { data, error } = await supabase
      .from('vouchers')
      .update({ active: !v.active })
      .eq('id', v.id)
      .select('id,active')
      .single();

    if (error) {
      setMessage(`Could not update voucher: ${error.message}`);
      return;
    }
    setVouchers(current =>
      current.map(x => (x.id === v.id ? { ...x, active: data.active } : x))
    );
  };

  const remove = async v => {
    if (!confirm(`Delete voucher ${v.code}?`)) return;
    const { error } = await supabase.from('vouchers').delete().eq('id', v.id);
    if (error) {
      setMessage(`Could not delete voucher: ${error.message}`);
      return;
    }
    setVouchers(current => current.filter(x => x.id !== v.id));
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>Discount vouchers</h3>
          <small>Vouchers are saved in Supabase and validated again during checkout.</small>
        </div>
      </div>
      <div className="voucher-create">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Voucher code"
        />
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed Rs.</option>
        </select>
        <input
          type="number"
          min="0"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Discount value"
        />
        <input
          type="number"
          min="0"
          value={min}
          onChange={e => setMin(e.target.value)}
          placeholder="Minimum order"
        />
        <input
          type="number"
          min="0"
          value={max}
          onChange={e => setMax(e.target.value)}
          placeholder="Maximum discount (optional)"
        />
        <button className="btn-primary" onClick={addVoucher} disabled={saving}>
          {saving ? 'Saving…' : <><Plus size={16} /> Create voucher</>}
        </button>
      </div>
      {message && (
        <p className={message.includes('saved') ? 'success-note' : 'form-error'}>
          {message}
        </p>
      )}
      {vouchers.map(v => (
        <div className="voucher-item" key={v.id || v.code}>
          <div>
            <strong>{v.code}</strong>
            <small>
              {v.type === 'percent' ? `${v.value}% off` : `${currency(v.value)} off`} ·
              Minimum {currency(v.min || 0)} · Max {v.max ? currency(v.max) : 'none'}
            </small>
          </div>
          <button
            className={v.active ? 'stock-on' : 'stock-off'}
            onClick={() => toggle(v)}
          >
            {v.active ? 'Active' : 'Inactive'}
          </button>
          <button className="danger-soft" onClick={() => remove(v)}>
            Delete
          </button>
        </div>
      ))}
      {!vouchers.length && <p className="muted">No vouchers created yet.</p>}
    </section>
  );
}
