import React, { useState } from 'react';
import { Plus, Bike } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function RiderManager({ riders, setRiders, orders }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const addRider = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('riders')
      .insert({ name: name.trim(), phone: phone.trim() || null, active: true })
      .select('id,name,phone')
      .single();
    setSaving(false);
    if (error) {
      alert(`Could not add rider: ${error.message}`);
      return;
    }
    setRiders(current => [...current, data.name]);
    setName('');
    setPhone('');
  };

  const removeRider = async riderName => {
    if (!confirm(`Deactivate ${riderName}? Existing order history will be preserved.`)) return;
    const { error } = await supabase
      .from('riders')
      .update({ active: false })
      .eq('name', riderName);
    if (error) {
      alert(`Could not deactivate rider: ${error.message}`);
      return;
    }
    setRiders(current => current.filter(r => r !== riderName));
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>Delivery riders</h3>
          <small>Assign who is taking each order. No location tracking.</small>
        </div>
      </div>
      <div className="add-product-row">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Rider name"
        />
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Phone number (optional)"
        />
        <button
          className="btn-primary"
          onClick={addRider}
          disabled={saving || !name.trim()}
        >
          <Plus size={16} /> {saving ? 'Adding…' : 'Add rider'}
        </button>
      </div>
      {riders.map(r => (
        <div className="rider-row" key={r}>
          <div className="rider-avatar">
            <Bike />
          </div>
          <div>
            <strong>{r}</strong>
            <small>{orders.filter(o => o.rider === r).length} orders assigned</small>
          </div>
          <button className="danger-soft" onClick={() => removeRider(r)}>
            Deactivate
          </button>
        </div>
      ))}
    </section>
  );
}
