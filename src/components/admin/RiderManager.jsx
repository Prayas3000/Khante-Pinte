import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Edit2,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle
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

  // PAYOUT (Deduct from Balance) modal state
  const [payoutTarget, setPayoutTarget] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('Cash Handover at Counter');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutAdminPassword, setPayoutAdminPassword] = useState('');
  const [payingOut, setPayingOut] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState('');

  // Credit Money (Salary / Bonus) modal state
  const [creditTarget, setCreditTarget] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditType, setCreditType] = useState('salary'); // 'salary' | 'bonus'
  const [creditNotes, setCreditNotes] = useState('');
  const [creditAdminPassword, setCreditAdminPassword] = useState('');
  const [crediting, setCrediting] = useState(false);
  const [creditError, setCreditError] = useState('');
  const [creditSuccess, setCreditSuccess] = useState('');

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
          setRiders(data.filter(r => r.active));
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

  // PAYOUT CASH/BANK (Deduct from rider balance with Admin Password)
  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    setPayoutError('');
    setPayoutSuccess('');

    const numAmount = parseFloat(payoutAmount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      setPayoutError('Please enter a valid payout amount.');
      return;
    }
    if (!payoutAdminPassword.trim()) {
      setPayoutError('Admin Website Password is required to authorize cash payout.');
      return;
    }

    setPayingOut(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminEmail = authData?.user?.email;
      if (!adminEmail) throw new Error('You must be signed in as admin.');

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: payoutAdminPassword.trim()
      });

      if (authErr) {
        throw new Error('Incorrect Admin Website Password. Authorization rejected.');
      }

      const deductionAmount = -Math.abs(numAmount);
      const debitNote = `CASH/BANK PAYOUT: ${payoutMethod} — ${payoutNotes.trim() || 'Paid out by restaurant owner'}`;

      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_allocate_rider_money', {
        p_rider_id: payoutTarget.id,
        p_amount: deductionAmount,
        p_type: 'payout',
        p_notes: debitNote,
        p_admin_email: 'Aayush'
      });

      if (rpcErr) throw rpcErr;
      if (!rpcData || !rpcData.success) {
        throw new Error(rpcData?.message || 'Payout could not be processed.');
      }

      setPayoutSuccess(`Successfully settled and deducted ${currency(numAmount)} from ${payoutTarget.name}! Remaining Balance: ${currency(rpcData.new_balance)}`);
      await loadRiders();

      setTimeout(() => {
        setPayoutTarget(null);
        setPayoutAmount('');
        setPayoutNotes('');
        setPayoutAdminPassword('');
        setPayoutSuccess('');
      }, 1600);
    } catch (err) {
      console.error('Payout error:', err);
      setPayoutError(`Payout failed: ${err.message}`);
    } finally {
      setPayingOut(false);
    }
  };

  // Credit Money (Salary/Bonus to rider balance with Admin Password)
  const handleCreditSubmit = async (e) => {
    e.preventDefault();
    setCreditError('');
    setCreditSuccess('');

    const numAmount = parseFloat(creditAmount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      setCreditError('Please enter a valid credit amount.');
      return;
    }
    if (!creditAdminPassword.trim()) {
      setCreditError('Admin Website Password is required to authorize money credit.');
      return;
    }

    setCrediting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminEmail = authData?.user?.email;
      if (!adminEmail) throw new Error('You must be signed in as admin.');

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: creditAdminPassword.trim()
      });

      if (authErr) {
        throw new Error('Incorrect Admin Website Password. Authorization rejected.');
      }

      const creditNote = `${creditType.toUpperCase()} CREDIT: ${creditNotes.trim() || 'Allocated by owner'}`;

      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_allocate_rider_money', {
        p_rider_id: creditTarget.id,
        p_amount: Math.abs(numAmount),
        p_type: creditType,
        p_notes: creditNote,
        p_admin_email: 'Aayush'
      });

      if (rpcErr) throw rpcErr;
      if (!rpcData || !rpcData.success) {
        throw new Error(rpcData?.message || 'Credit could not be processed.');
      }

      setCreditSuccess(`Successfully credited ${currency(numAmount)} to ${creditTarget.name}! New Balance: ${currency(rpcData.new_balance)}`);
      await loadRiders();

      setTimeout(() => {
        setCreditTarget(null);
        setCreditAmount('');
        setCreditNotes('');
        setCreditAdminPassword('');
        setCreditSuccess('');
      }, 1600);
    } catch (err) {
      console.error('Credit error:', err);
      setCreditError(`Credit failed: ${err.message}`);
    } finally {
      setCrediting(false);
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
          <h3>Rider Fleet & Compensation Studio</h3>
          <small>Manage riders, track duty status, view live deliveries, allocate salaries & settle payouts.</small>
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
                        {r.pay_type === 'salary' ? '💼 Fixed Salary' : `⚡ Commission (Rs. ${r.commission_per_order || 50}/order)`}
                      </strong>
                    </div>

                    <div className="rider-info-col">
                      <span className="info-label">Unsettled Balance</span>
                      <strong className={`info-val ${Number(r.balance || 0) > 0 ? 'green-text' : ''}`}>
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

                  {/* Action Buttons Row */}
                  <div className="rider-card-actions">
                    {/* PAYOUT BUTTON (Deduct balance when cash is handed over) */}
                    <button
                      type="button"
                      className="btn-payout-cta"
                      onClick={() => {
                        setPayoutTarget(r);
                        setPayoutAmount(Number(r.balance || 0) > 0 ? String(r.balance) : '');
                        setPayoutMethod('Cash Handover at Counter');
                        setPayoutNotes('');
                        setPayoutAdminPassword('');
                        setPayoutError('');
                        setPayoutSuccess('');
                      }}
                      title="Record payout handed over to rider (deducts from balance)"
                    >
                      <ArrowDownCircle size={15} /> <span>Settle Payout</span>
                    </button>

                    {/* CREDIT SALARY / BONUS BUTTON */}
                    <button
                      type="button"
                      className="btn-primary-soft"
                      onClick={() => {
                        setCreditTarget(r);
                        setCreditAmount('');
                        setCreditType(r.pay_type === 'salary' ? 'salary' : 'bonus');
                        setCreditNotes('');
                        setCreditAdminPassword('');
                        setCreditError('');
                        setCreditSuccess('');
                      }}
                      title="Credit fixed salary or bonus to rider balance"
                    >
                      <ArrowUpCircle size={15} /> <span>Credit Money</span>
                    </button>

                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => openLedger(r)}
                      title="View all earnings and payout debits"
                    >
                      <FileText size={15} /> <span>Passbook</span>
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
                      title="Permanently Delete Rider (Requires Password)"
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

      {/* MODAL 1: SETTLE PAYOUT / CASH HANDOVER (DEDUCTS BALANCE) */}
      {payoutTarget && createPortal(
        <div className="modal-backdrop" onClick={() => setPayoutTarget(null)}>
          <div className="modal-content alloc-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottomColor: '#fecaca' }}>
              <div>
                <span className="eyebrow" style={{ color: '#dc2626', fontWeight: 800 }}>SETTLE PAYOUT / CASH HANDOVER</span>
                <h3 style={{ margin: '2px 0' }}>Payout: {payoutTarget.name}</h3>
                <small>Current Unsettled Balance: <strong>{currency(payoutTarget.balance || 0)}</strong></small>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setPayoutTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePayoutSubmit} className="alloc-form">
              {payoutError && (
                <div className="alloc-alert error">
                  <AlertTriangle size={16} /> <span>{payoutError}</span>
                </div>
              )}
              {payoutSuccess && (
                <div className="alloc-alert success">
                  <Check size={16} /> <span>{payoutSuccess}</span>
                </div>
              )}

              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #64748b)', lineHeight: 1.45 }}>
                Record money you have paid to <strong>{payoutTarget.name}</strong>. This amount will be <strong>deducted</strong> from their balance and recorded in their statement as a debited payout.
              </p>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Payout Amount (NPR)</label>
                  {Number(payoutTarget.balance || 0) > 0 && (
                    <button
                      type="button"
                      className="btn-link-mini"
                      onClick={() => setPayoutAmount(String(payoutTarget.balance))}
                    >
                      Pay Full Balance ({currency(payoutTarget.balance)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Payment Channel</label>
                <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)}>
                  <option value="Cash Handover at Counter">💵 Cash Handover at Counter</option>
                  <option value="Bank / eSewa Online Transfer">📱 Online Transfer (eSewa / Khalti / Bank)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Remark / Note (Shown in Rider's Statement)</label>
                <input
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  placeholder="e.g. Handed over cash at counter for week 47"
                  required
                />
              </div>

              {/* SECURITY GATE: ADMIN PASSWORD */}
              <div className="admin-password-gate">
                <div className="gate-title">
                  <Lock size={16} />
                  <strong>Security Verification: Enter Admin Password</strong>
                </div>
                <p>To safeguard restaurant finances, please enter your Admin Website Password to authorize this payout deduction.</p>
                <input
                  type="password"
                  value={payoutAdminPassword}
                  onChange={e => setPayoutAdminPassword(e.target.value)}
                  placeholder="Your Admin Website Password"
                  required
                />
              </div>

              <div className="alloc-modal-actions">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setPayoutTarget(null)}
                  disabled={payingOut}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: '#dc2626', color: '#fff' }}
                  disabled={payingOut || !payoutAmount}
                >
                  <ShieldCheck size={17} />
                  <span>{payingOut ? 'Authorizing Payout…' : 'Authorize & Deduct Payout'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: CREDIT SALARY / BONUS (ADDS TO BALANCE) */}
      {creditTarget && createPortal(
        <div className="modal-backdrop" onClick={() => setCreditTarget(null)}>
          <div className="modal-content alloc-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: 'var(--green-dark, #15803d)', fontWeight: 800 }}>CREDIT SALARY OR BONUS</span>
                <h3 style={{ margin: '2px 0' }}>Credit: {creditTarget.name}</h3>
                <small>Current Account Balance: <strong>{currency(creditTarget.balance || 0)}</strong></small>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setCreditTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreditSubmit} className="alloc-form">
              {creditError && (
                <div className="alloc-alert error">
                  <AlertTriangle size={16} /> <span>{creditError}</span>
                </div>
              )}
              {creditSuccess && (
                <div className="alloc-alert success">
                  <Check size={16} /> <span>{creditSuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label>Credit Type</label>
                <select value={creditType} onChange={e => setCreditType(e.target.value)}>
                  <option value="salary">Fixed Salary Credit</option>
                  <option value="bonus">Bonus / Incentive</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount (NPR)</label>
                <input
                  type="number"
                  step="any"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Remark / Note (Shown in Rider's Statement)</label>
                <input
                  value={creditNotes}
                  onChange={e => setCreditNotes(e.target.value)}
                  placeholder="e.g. Monthly salary credit for November"
                  required
                />
              </div>

              {/* SECURITY GATE: ADMIN PASSWORD */}
              <div className="admin-password-gate">
                <div className="gate-title">
                  <Lock size={16} />
                  <strong>Security Verification: Enter Admin Password</strong>
                </div>
                <p>Please enter your Admin Website Password to authorize crediting money to this rider's account.</p>
                <input
                  type="password"
                  value={creditAdminPassword}
                  onChange={e => setCreditAdminPassword(e.target.value)}
                  placeholder="Your Admin Website Password"
                  required
                />
              </div>

              <div className="alloc-modal-actions">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setCreditTarget(null)}
                  disabled={crediting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={crediting || !creditAmount}
                >
                  <ShieldCheck size={17} />
                  <span>{crediting ? 'Authorizing Credit…' : 'Authorize & Credit Money'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: CHANGE RIDER PASSWORD */}
      {changePwTarget && createPortal(
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
        </div>,
        document.body
      )}

      {/* MODAL 4: EDIT COMPENSATION MODEL (Commission vs Salary) */}
      {editPayTypeTarget && createPortal(
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
                  ℹ️ <strong>Fixed Salary Model:</strong> This rider will <u>not</u> receive automated commissions per delivered order. You can allocate their weekly/monthly salary anytime using the <strong>Credit Money</strong> button.
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
        </div>,
        document.body
      )}

      {/* MODAL 5: PERMANENTLY DELETE RIDER (Requires Admin Password) */}
      {deleteTarget && createPortal(
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
        </div>,
        document.body
      )}

      {/* MODAL 6: RIDER LEDGER HISTORY / PASSBOOK */}
      {ledgerTarget && createPortal(
        <div className="modal-backdrop" onClick={() => setLedgerTarget(null)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Compensation & Payout Passbook</h3>
                <small>{ledgerTarget.name} · Current Balance: <strong>{currency(ledgerTarget.balance || 0)}</strong></small>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setLedgerTarget(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
              {loadingLedger ? (
                <p>Loading ledger records...</p>
              ) : ledgerList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary, #64748b)' }}>
                  <FileText size={36} style={{ opacity: 0.35, marginBottom: 8 }} />
                  <p>No payout or compensation transactions recorded yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {ledgerList.map(record => {
                    const isPositive = Number(record.amount) >= 0;
                    return (
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
                            {new Date(record.created_at).toLocaleString()} {record.admin_email ? `· by ${record.admin_email.includes('noobvak') ? 'Aayush' : record.admin_email}` : ''}
                          </small>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ display: 'block', fontSize: 15, color: isPositive ? '#16a34a' : '#dc2626' }}>
                            {isPositive ? '+' : ''}{currency(record.amount)}
                          </strong>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            background: isPositive ? '#dcfce7' : '#fee2e2',
                            color: isPositive ? '#15803d' : '#b91c1c'
                          }}>
                            {isPositive ? 'CREDITED' : 'DEBITED PAYOUT'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
