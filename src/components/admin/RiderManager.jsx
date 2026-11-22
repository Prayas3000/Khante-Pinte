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
  X,
  Trash2,
  Edit2
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

  // Delete rider modal state (with Admin Password verification)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Edit Pay Type modal state
  const [editPayTypeTarget, setEditPayTypeTarget] = useState(null);
  const [editPayType, setEditPayType] = useState('commission');
  const [editCommissionRate, setEditCommissionRate] = useState(50);
  const [savingPayType, setSavingPayType] = useState(false);

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
          active: true,
          is_on_duty: true
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

    try {
      const { error } = await supabase
        .from('riders')
        .update({ active: nextState })
        .eq('id', riderItem.id);

      if (error) throw error;
      await loadRiders();
    } catch (err) {
      alert(`Could not update status: ${err.message}`);
    }
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
      setChangePwTarget(null);
      setNewRiderPw('');
      await loadRiders();
      alert(`Password for ${changePwTarget.name} updated successfully!`);
    } catch (err) {
      alert(`Could not update password: ${err.message}`);
    } finally {
      setSavingPw(false);
    }
  };

  // Update Compensation Type (Commission vs Salary)
  const handleSavePayType = async (e) => {
    if (e) e.preventDefault();
    if (!editPayTypeTarget) return;
    setSavingPayType(true);
    try {
      const { data, error } = await supabase.rpc('admin_update_rider_pay_type', {
        p_rider_id: editPayTypeTarget.id,
        p_pay_type: editPayType,
        p_commission_rate: Number(editCommissionRate) || 50
      });

      if (error) throw error;
      setEditPayTypeTarget(null);
      await loadRiders();
      alert(`Compensation for ${editPayTypeTarget.name} updated to ${editPayType === 'salary' ? 'Fixed Salary' : `Commission (Rs. ${editCommissionRate}/order)`}.`);
    } catch (err) {
      alert(`Could not update pay type: ${err.message}`);
    } finally {
      setSavingPayType(false);
    }
  };

  // Permanently Delete Rider (Requires Admin Password)
  const handleDeleteRider = async (e) => {
    if (e) e.preventDefault();
    setDeleteError('');
    if (!deleteAdminPassword.trim()) {
      setDeleteError('Please enter your Admin Website Password to confirm deletion.');
      return;
    }

    setDeleting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminEmail = authData?.user?.email;
      if (!adminEmail) throw new Error('You must be signed in as admin.');

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: deleteAdminPassword.trim()
      });

      if (authErr) {
        throw new Error('Incorrect Admin Website Password. Deletion denied.');
      }

      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_delete_rider', {
        p_rider_id: deleteTarget.id
      });

      if (rpcErr) throw rpcErr;
      if (!rpcData?.success) throw new Error(rpcData?.message || 'Could not delete rider.');

      const deletedName = deleteTarget.name;
      setDeleteTarget(null);
      setDeleteAdminPassword('');
      await loadRiders();
      alert(`Rider ${deletedName} has been permanently deleted from the fleet.`);
    } catch (err) {
      console.error('Delete rider error:', err);
      setDeleteError(err.message || 'Deletion failed.');
    } finally {
      setDeleting(false);
    }
  };

  // Allocate Money with Security Password Gate
  const handleAllocateMoney = async (e) => {
    e.preventDefault();
    setAllocError('');
    setAllocSuccess('');

    const numAmount = parseFloat(allocAmount);
    if (!numAmount || isNaN(numAmount) || numAmount === 0) {
      setAllocError('Please enter a valid amount.');
      return;
    }
    if (!adminPasswordInput.trim()) {
      setAllocError('Admin Website Password is required to authorize money allocation.');
      return;
    }

    setAllocating(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminEmail = authData?.user?.email;
      if (!adminEmail) throw new Error('You must be signed in as admin.');

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPasswordInput.trim()
      });

      if (authErr) {
        throw new Error('Incorrect Admin Website Password. Authorization rejected.');
      }

      const signedAmount = allocType === 'deduction' ? -Math.abs(numAmount) : Math.abs(numAmount);
      const notesLabel = allocNotes.trim() || `${allocType.toUpperCase()} allocation for ${allocTarget.name}`;

      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_allocate_rider_money', {
        p_rider_id: allocTarget.id,
        p_amount: signedAmount,
        p_type: allocType,
        p_notes: notesLabel,
        p_admin_email: adminEmail
      });

      if (rpcErr) throw rpcErr;
      if (!rpcData || !rpcData.success) {
        throw new Error(rpcData?.message || 'Transaction could not be completed.');
      }

      setAllocSuccess(`Successfully allocated ${currency(Math.abs(signedAmount))} to ${allocTarget.name}! New Balance: ${currency(rpcData.new_balance)}`);
      await loadRiders();

      setTimeout(() => {
        setAllocTarget(null);
        setAllocAmount('');
        setAllocNotes('');
        setAdminPasswordInput('');
        setAllocSuccess('');
      }, 1600);
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
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Phone Number (10 digit)"
            type="tel"
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Initial Password"
            title="Rider phone login password"
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
              const isOnDuty = r.is_on_duty !== false;

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
                      {/* On Duty / Off Duty Badge */}
                      <span className={`rider-duty-pill ${isOnDuty ? 'duty-on' : 'duty-off'}`}>
                        {isOnDuty ? '🟢 On Duty' : '🔴 Off Duty'}
                      </span>

                      {/* Active Deliveries Indicator */}
                      <span className={`rider-work-badge ${isFree ? 'free' : 'busy'}`}>
                        {isFree ? 'Available (0 active)' : `${activeCount} active ${activeCount === 1 ? 'order' : 'orders'}`}
                      </span>

                      <span className={`rider-status-pill ${r.active ? 'active' : 'inactive'}`}>
                        {r.active ? 'Active Fleet' : 'Deactivated'}
                      </span>
                    </div>
                  </div>

                  {/* Rider Details Grid */}
                  <div className="rider-info-grid">
                    <div className="rider-info-col">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="info-label">Compensation</span>
                        <button
                          type="button"
                          className="btn-link-mini"
                          onClick={() => {
                            setEditPayTypeTarget(r);
                            setEditPayType(r.pay_type || 'commission');
                            setEditCommissionRate(r.commission_per_order || 50);
                          }}
                          title="Switch between Commission and Salary"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      </div>
                      <strong className="info-val">
                        {r.pay_type === 'salary' ? '💼 Fixed Salary (No per-order comm.)' : `⚡ Commission (Rs. ${r.commission_per_order || 50}/order)`}
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

                    <button
                      type="button"
                      className="btn-danger-icon"
                      onClick={() => {
                        setDeleteTarget(r);
                        setDeleteAdminPassword('');
                        setDeleteError('');
                      }}
                      title="Permanently Delete Rider"
                    >
                      <Trash2 size={15} />
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
                <span className="eyebrow" style={{ color: 'var(--green-dark, #15803d)', fontWeight: 800 }}>RIDER COMPENSATION & PAYOUT</span>
                <h3>Allocate Money: {allocTarget.name}</h3>
                <small>Current Account Balance: <strong>{currency(allocTarget.balance || 0)}</strong></small>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setAllocTarget(null)}>
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
                  placeholder="e.g. Monthly salary payout / weekly bonus"
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
              <button className="icon-btn modal-close-btn" onClick={() => setChangePwTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary, #667085)', margin: '0 0 14px' }}>
                Set a new password for {changePwTarget.name}. They will use this password to log in on their phone.
              </p>
              <input
                type="text"
                value={newRiderPw}
                onChange={e => setNewRiderPw(e.target.value)}
                placeholder="New password (e.g. rider2026)"
                style={{ width: '100%', marginBottom: 18 }}
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

      {/* MODAL 3: EDIT COMPENSATION TYPE (Commission vs Salary) */}
      {editPayTypeTarget && (
        <div className="modal-backdrop" onClick={() => setEditPayTypeTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Edit Compensation: {editPayTypeTarget.name}</h3>
                <small>Select whether rider is paid by commission per order or fixed salary</small>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setEditPayTypeTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePayType} style={{ padding: '20px 24px' }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                  Compensation Model
                </label>
                <select
                  value={editPayType}
                  onChange={e => setEditPayType(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="commission">Commission-Based (Per Delivered Order)</option>
                  <option value="salary">Fixed Salary-Based (No Commission on Orders)</option>
                </select>
              </div>

              {editPayType === 'commission' ? (
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                    Commission Rate per Order (NPR)
                  </label>
                  <input
                    type="number"
                    value={editCommissionRate}
                    onChange={e => setEditCommissionRate(e.target.value)}
                    placeholder="e.g. 50"
                    style={{ width: '100%' }}
                    required
                  />
                  <small style={{ color: 'var(--text-secondary, #667085)', display: 'block', marginTop: 4 }}>
                    Rider automatically earns this amount whenever they mark an order delivered.
                  </small>
                </div>
              ) : (
                <div style={{
                  padding: 12,
                  background: 'var(--bg-main, #f8fafc)',
                  border: '1px solid var(--line, #e2e8f0)',
                  borderRadius: 10,
                  fontSize: 13,
                  color: 'var(--text-secondary, #64748b)',
                  marginBottom: 16
                }}>
                  ℹ️ <strong>Fixed Salary Model:</strong> This rider will <u>not</u> receive automated commissions per delivered order. You can allocate their weekly/monthly salary anytime using the <strong>Allocate Money / Pay</strong> button.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-outline" onClick={() => setEditPayTypeTarget(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingPayType}>
                  {savingPayType ? 'Saving…' : 'Update Compensation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PERMANENTLY DELETE RIDER (Requires Admin Password) */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottomColor: '#fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 style={{ color: '#dc2626', margin: 0 }}>Permanently Delete Rider?</h3>
                  <small>{deleteTarget.name} ({deleteTarget.phone})</small>
                </div>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDeleteRider} style={{ padding: '20px 24px' }}>
              {deleteError && (
                <div className="alloc-alert error" style={{ marginBottom: 14 }}>
                  <AlertTriangle size={16} /> <span>{deleteError}</span>
                </div>
              )}

              <p style={{ fontSize: 13, color: 'var(--text-primary, #334155)', margin: '0 0 14px', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>? Any active orders assigned to this rider will be unassigned so another rider can deliver them.
              </p>

              {/* SECURITY GATE: ADMIN PASSWORD */}
              <div className="admin-password-gate" style={{ marginBottom: 18 }}>
                <div className="gate-title">
                  <Lock size={15} />
                  <strong>Security Verification: Enter Admin Password</strong>
                </div>
                <p>Enter your Admin Website Password to authorize deleting this rider.</p>
                <input
                  type="password"
                  value={deleteAdminPassword}
                  onChange={e => setDeleteAdminPassword(e.target.value)}
                  placeholder="Your Admin Website Password"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="danger-btn"
                  style={{ padding: '10px 16px', fontWeight: 700 }}
                  disabled={deleting || !deleteAdminPassword.trim()}
                >
                  <Trash2 size={16} />
                  <span>{deleting ? 'Verifying & Deleting…' : 'Delete Rider Permanently'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: RIDER LEDGER HISTORY */}
      {ledgerTarget && (
        <div className="modal-backdrop" onClick={() => setLedgerTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Payout & Compensation History</h3>
                <small>{ledgerTarget.name} · Current Balance: <strong>{currency(ledgerTarget.balance || 0)}</strong></small>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setLedgerTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingLedger ? (
                <p>Loading ledger records...</p>
              ) : ledgerList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary, #64748b)' }}>
                  <FileText size={36} style={{ opacity: 0.35, marginBottom: 8 }} />
                  <p>No payout or allocation records found for this rider.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {ledgerList.map(record => (
                    <div
                      key={record.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 12,
                        background: 'var(--bg-main, #f8fafc)',
                        border: '1px solid var(--line, #e2e8f0)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: 13, color: 'var(--text-primary, #0f172a)' }}>
                          {record.notes}
                        </strong>
                        <small style={{ color: 'var(--text-secondary, #64748b)' }}>
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
