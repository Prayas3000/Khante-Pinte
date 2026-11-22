import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Bike, 
  Eye, 
  EyeOff, 
  Lock, 
  DollarSign, 
  ShieldCheck, 
  Key, 
  FileText, 
  ExternalLink,
  Check,
  AlertTriangle,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { currency } from '@/utils/formatters';

export function RiderManager({ riders = [], setRiders, orders = [] }) {
  const [riderList, setRiderList] = useState([]);
  const [loading, setLoading] = useState(true);

  // New rider form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('kp1234');
  const [payType, setPayType] = useState('commission');
  const [commissionRate, setCommissionRate] = useState(50);
  const [saving, setSaving] = useState(false);

  // Password visibility map { riderId: boolean }
  const [showPwMap, setShowPwMap] = useState({});

  // Change password modal state
  const [changePwTarget, setChangePwTarget] = useState(null);
  const [newRiderPw, setNewRiderPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // Allocate money modal state (with Admin Password verification)
  const [allocTarget, setAllocTarget] = useState(null);
  const [allocAmount, setAllocAmount] = useState('');
  const [allocType, setAllocType] = useState('salary'); // 'salary' | 'bonus' | 'commission' | 'deduction'
  const [allocNotes, setAllocNotes] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [allocError, setAllocError] = useState('');
  const [allocSuccess, setAllocSuccess] = useState('');

  // Ledger history modal
  const [ledgerTarget, setLedgerTarget] = useState(null);
  const [ledgerList, setLedgerList] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Fetch full riders from Supabase
  const loadRiders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .order('name');

      if (!error && data) {
        setRiderList(data);
        if (setRiders) {
          setRiders(data.filter(r => r.active).map(r => r.name));
        }
      }
    } catch (err) {
      console.error('Error loading riders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiders();
  }, []);

  // Calculate active deliveries count for a rider (not yet delivered or cancelled)
  const getActiveDeliveryCount = (riderObj) => {
    return orders.filter(o => 
      (o.rider === riderObj.name || o.rider_id === riderObj.id) &&
      !['delivered', 'cancelled'].includes(String(o.status || '').toLowerCase())
    ).length;
  };

  // Add new rider
  const addRider = async () => {
    if (!name.trim()) return;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 5) {
      alert('Please enter a valid phone number for the rider.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('riders')
        .insert({
          name: name.trim(),
          phone: cleanPhone,
          password: password.trim() || 'kp1234',
          pay_type: payType,
          commission_per_order: Number(commissionRate) || 50,
          balance: 0,
          active: true
        })
        .select('*')
        .single();

      if (error) throw error;

      setName('');
      setPhone('');
      setPassword('kp1234');
      await loadRiders();
    } catch (err) {
      alert(`Could not add rider: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const toggleRiderStatus = async (riderItem) => {
    const nextState = !riderItem.active;
    if (!confirm(`${nextState ? 'Reactivate' : 'Deactivate'} rider ${riderItem.name}?`)) return;

    const { error } = await supabase
      .from('riders')
      .update({ active: nextState })
      .eq('id', riderItem.id);

    if (error) {
      alert(`Could not update rider: ${error.message}`);
      return;
    }
    await loadRiders();
  };

  // Change rider password
  const handleSaveRiderPassword = async () => {
    if (!changePwTarget || !newRiderPw.trim()) return;
    setSavingPw(true);
    try {
      const { error } = await supabase
        .from('riders')
        .update({ password: newRiderPw.trim() })
        .eq('id', changePwTarget.id);

      if (error) throw error;
      alert(`Password for ${changePwTarget.name} updated successfully!`);
      setChangePwTarget(null);
      setNewRiderPw('');
      await loadRiders();
    } catch (err) {
      alert(`Could not change password: ${err.message}`);
    } finally {
      setSavingPw(false);
    }
  };

  // Verify Admin Password & Allocate Money
  const handleAllocateMoney = async (e) => {
    if (e) e.preventDefault();
    setAllocError('');
    setAllocSuccess('');

    const amt = parseFloat(allocAmount);
    if (!amt || isNaN(amt) || amt === 0) {
      setAllocError('Please enter a valid non-zero amount.');
      return;
    }
    if (!adminPasswordInput) {
      setAllocError('Admin website password is required to authorize this transaction.');
      return;
    }

    setAllocating(true);
    try {
      // 1. Verify Admin Password securely via Supabase Auth
      const { data: authData } = await supabase.auth.getUser();
      const currentAdminEmail = authData?.user?.email;

      if (!currentAdminEmail) {
        setAllocError('No active admin session found. Please re-login to admin.');
        setAllocating(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentAdminEmail,
        password: adminPasswordInput
      });

      if (authError) {
        setAllocError('❌ Admin password incorrect. Transaction authorization failed.');
        setAllocating(false);
        return;
      }

      // 2. Call secure RPC to allocate money & record transaction
      const finalAmount = allocType === 'deduction' ? -Math.abs(amt) : Math.abs(amt);
      const noteStr = `${allocType.toUpperCase()} - ${allocNotes.trim() || 'Admin allocation'}`;

      const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_allocate_rider_money', {
        p_rider_id: allocTarget.id,
        p_amount: finalAmount,
        p_type: allocType,
        p_notes: noteStr,
        p_admin_email: currentAdminEmail
      });

      if (rpcErr) throw rpcErr;
      if (!rpcRes || !rpcRes.success) {
        throw new Error(rpcRes?.message || 'Could not allocate money');
      }

      setAllocSuccess(`✓ Successfully allocated ${currency(Math.abs(amt))} to ${allocTarget.name}!`);
      setAllocAmount('');
      setAllocNotes('');
      setAdminPasswordInput('');
      await loadRiders();

      setTimeout(() => {
        setAllocTarget(null);
        setAllocSuccess('');
      }, 1800);
    } catch (err) {
      console.error('Allocate error:', err);
      setAllocError(`Transaction failed: ${err.message}`);
    } finally {
      setAllocating(false);
    }
  };

  // Load Rider Ledger
  const openLedger = async (riderItem) => {
    setLedgerTarget(riderItem);
    setLoadingLedger(true);
    try {
      const { data, error } = await supabase
        .from('rider_payouts')
        .select('*')
        .eq('rider_id', riderItem.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLedgerList(data);
      }
    } catch (err) {
      console.error('Ledger error:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  return (
    <section className="panel rider-manager-panel">
      <div className="panel-head">
        <div>
          <h3>Rider Management & Compensation Studio</h3>
          <small>Manage riders, assign shifts, track commissions/salaries, and allocate payouts securely.</small>
        </div>
        <div>
          <button
            type="button"
            className="btn-outline"
            style={{ fontSize: 13, gap: 6 }}
            onClick={() => window.open('/rider', '_blank')}
            title="Open Rider Delivery Portal in a new tab"
          >
            <Bike size={16} /> <span>Open Rider Portal ↗</span>
          </button>
        </div>
      </div>

      {/* Add New Rider Strip */}
      <div className="rider-add-card">
        <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Add New Delivery Rider</h4>
        <div className="rider-add-grid">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Rider Full Name (e.g. Ramesh Kumar)"
          />
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Phone Number (10 digits)"
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Rider Password (default: kp1234)"
          />
          <select value={payType} onChange={e => setPayType(e.target.value)}>
            <option value="commission">Commission-Based</option>
            <option value="salary">Fixed Salary-Based</option>
          </select>
          {payType === 'commission' && (
            <input
              type="number"
              value={commissionRate}
              onChange={e => setCommissionRate(e.target.value)}
              placeholder="Commission Rs./order"
              title="Commission earned per completed delivery"
            />
          )}
          <button
            className="btn-primary"
            onClick={addRider}
            disabled={saving || !name.trim() || !phone.trim()}
          >
            <Plus size={16} /> {saving ? 'Adding…' : 'Create Rider'}
          </button>
        </div>
      </div>

      {/* Rider List Table / Cards */}
      <div className="rider-list-section">
        {loading ? (
          <p style={{ color: '#667085', padding: 20 }}>Loading riders fleet...</p>
        ) : riderList.length === 0 ? (
          <p style={{ color: '#667085', padding: 20 }}>No riders added yet. Add your first delivery rider above.</p>
        ) : (
          <div className="rider-cards-grid">
            {riderList.map(r => {
              const activeCount = getActiveDeliveryCount(r);
              const isFree = activeCount === 0;
              const isPwVisible = !!showPwMap[r.id];

              return (
                <article className={`rider-admin-card ${!r.active ? 'inactive' : ''}`} key={r.id}>
                  {/* Top Bar */}
                  <div className="rider-admin-card-header">
                    <div className="rider-admin-title">
                      <div className="rider-avatar-circle">
                        <Bike size={20} />
                      </div>
                      <div>
                        <strong>{r.name}</strong>
                        <small>{r.phone || 'No phone'}</small>
                      </div>
                    </div>

                    <div className="rider-admin-badge-col">
                      {/* Active Deliveries Indicator */}
                      <span className={`rider-work-badge ${isFree ? 'free' : 'busy'}`}>
                        {isFree ? '🟢 Available (0 active)' : `🟡 ${activeCount} active ${activeCount === 1 ? 'order' : 'orders'}`}
                      </span>

                      <span className={`rider-status-pill ${r.active ? 'active' : 'inactive'}`}>
                        {r.active ? 'Active Fleet' : 'Deactivated'}
                      </span>
                    </div>
                  </div>

                  {/* Rider Details Grid */}
                  <div className="rider-info-grid">
                    <div className="rider-info-col">
                      <span className="info-label">Compensation Type</span>
                      <strong className="info-val">
                        {r.pay_type === 'salary' ? '💼 Fixed Salary' : `⚡ Commission (Rs. ${r.commission_per_order || 50}/order)`}
                      </strong>
                    </div>

                    <div className="rider-info-col">
                      <span className="info-label">Account Balance</span>
                      <strong className="info-val green-text">
                        {currency(r.balance || 0)}
                      </strong>
                    </div>

                    {/* Rider Password Display */}
                    <div className="rider-info-col password-col">
                      <span className="info-label">Rider Password</span>
                      <div className="rider-pw-box">
                        <span className="pw-display">
                          {isPwVisible ? r.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          className="icon-btn-mini"
                          onClick={() => setShowPwMap(p => ({ ...p, [r.id]: !p[r.id] }))}
                          title={isPwVisible ? 'Hide password' : 'Show password'}
                        >
                          {isPwVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          type="button"
                          className="btn-link-mini"
                          onClick={() => {
                            setChangePwTarget(r);
                            setNewRiderPw(r.password || '');
                          }}
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="rider-card-actions">
                    <button
                      type="button"
                      className="btn-primary-soft"
                      onClick={() => {
                        setAllocTarget(r);
                        setAllocAmount('');
                        setAllocNotes('');
                        setAdminPasswordInput('');
                        setAllocError('');
                        setAllocSuccess('');
                      }}
                    >
                      <DollarSign size={15} /> <span>Allocate Money / Pay</span>
                    </button>

                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => openLedger(r)}
                    >
                      <FileText size={15} /> <span>Ledger</span>
                    </button>

                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => toggleRiderStatus(r)}
                      style={{ color: r.active ? '#b42318' : '#2e90fa' }}
                    >
                      {r.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: ALLOCATE MONEY / PAY SALARY (Requires Admin Password) */}
      {allocTarget && (
        <div className="modal-backdrop" onClick={() => setAllocTarget(null)}>
          <div className="modal-content alloc-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#b9ed75' }}>RIDER COMPENSATION & PAYOUT</span>
                <h3>Allocate Money: {allocTarget.name}</h3>
                <small>Current Account Balance: <strong>{currency(allocTarget.balance || 0)}</strong></small>
              </div>
              <button className="icon-btn" onClick={() => setAllocTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAllocateMoney} className="alloc-form">
              {allocError && (
                <div className="alloc-alert error">
                  <AlertTriangle size={16} /> <span>{allocError}</span>
                </div>
              )}
              {allocSuccess && (
                <div className="alloc-alert success">
                  <Check size={16} /> <span>{allocSuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label>Transaction Type</label>
                <select value={allocType} onChange={e => setAllocType(e.target.value)}>
                  <option value="salary">Salary Credit (Add to Balance)</option>
                  <option value="bonus">Bonus / Performance Incentive</option>
                  <option value="commission">Commission Manual Adjustment</option>
                  <option value="deduction">Cash Payout Handed Over (Deduct from Balance)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount (NPR)</label>
                <input
                  type="number"
                  step="any"
                  value={allocAmount}
                  onChange={e => setAllocAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Notes / Description</label>
                <input
                  value={allocNotes}
                  onChange={e => setAllocNotes(e.target.value)}
                  placeholder="e.g. Weekly salary payment for Dashain week"
                />
              </div>

              {/* SECURITY GATE: ADMIN WEBSITE PASSWORD */}
              <div className="admin-password-gate">
                <div className="gate-title">
                  <Lock size={16} />
                  <strong>Security Verification: Enter Admin Password</strong>
                </div>
                <p>To protect restaurant funds, please enter your Admin Website Password to authorize this change.</p>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={e => setAdminPasswordInput(e.target.value)}
                  placeholder="Your Admin Website Password"
                  required
                />
              </div>

              <div className="alloc-modal-actions">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setAllocTarget(null)}
                  disabled={allocating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={allocating || !allocAmount}
                >
                  <ShieldCheck size={17} />
                  <span>{allocating ? 'Verifying & Authorizing…' : 'Authorize & Allocate Money'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE RIDER PASSWORD */}
      {changePwTarget && (
        <div className="modal-backdrop" onClick={() => setChangePwTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password: {changePwTarget.name}</h3>
              <button className="icon-btn" onClick={() => setChangePwTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: '#667085', margin: '0 0 12px' }}>
                Set a new password for {changePwTarget.name}. They will use this password to log in on their phone.
              </p>
              <input
                type="text"
                value={newRiderPw}
                onChange={e => setNewRiderPw(e.target.value)}
                placeholder="New password (e.g. rider2026)"
                style={{ width: '100%', marginBottom: 16 }}
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn-outline" onClick={() => setChangePwTarget(null)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveRiderPassword}
                  disabled={savingPw || !newRiderPw.trim()}
                >
                  {savingPw ? 'Saving…' : 'Save Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RIDER LEDGER HISTORY */}
      {ledgerTarget && (
        <div className="modal-backdrop" onClick={() => setLedgerTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Payout & Compensation History</h3>
                <small>{ledgerTarget.name} · Current Balance: {currency(ledgerTarget.balance || 0)}</small>
              </div>
              <button className="icon-btn" onClick={() => setLedgerTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingLedger ? (
                <p>Loading ledger records...</p>
              ) : ledgerList.length === 0 ? (
                <p style={{ color: '#667085' }}>No payout or allocation records found for this rider.</p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {ledgerList.map(record => (
                    <div
                      key={record.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: 13 }}>{record.notes}</strong>
                        <small style={{ color: '#64748b' }}>
                          {new Date(record.created_at).toLocaleString()} {record.admin_email ? `· by ${record.admin_email}` : ''}
                        </small>
                      </div>
                      <strong style={{ fontSize: 15, color: Number(record.amount) >= 0 ? '#16a34a' : '#dc2626' }}>
                        {Number(record.amount) >= 0 ? '+' : ''}{currency(record.amount)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
