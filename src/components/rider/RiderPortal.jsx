import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bike, 
  MapPin, 
  Phone, 
  CheckCircle, 
  Clock, 
  Navigation, 
  RefreshCw, 
  LogOut, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  AlertCircle,
  Package,
  ChevronRight,
  Sun,
  Moon,
  ExternalLink,
  Shield,
  FileText,
  Check,
  Power,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { currency, businessDate } from '@/utils/formatters';

const formatAdminName = (val) => {
  if (!val) return 'Aayush';
  if (val.toLowerCase().includes('noobvak') || val.toLowerCase().includes('aayush')) return 'Aayush';
  if (val.includes('@')) return 'Aayush';
  return val;
};

export function RiderPortal({ brandLogo, theme = 'light', toggleTheme, onGoToCustomer }) {
  // Session state
  const [rider, setRider] = useState(() => {
    try {
      const saved = localStorage.getItem('kp_rider_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login form state
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Portal tab state: 'active' | 'stats'
  const [tab, setTab] = useState('active');
  const [timeFilter, setTimeFilter] = useState('today'); // 'today' | 'week' | 'month' | 'all'

  // Data states
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [togglingDuty, setTogglingDuty] = useState(false);
  const [notice, setNotice] = useState('');

  // Auto-dismiss notice
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  // Handle Login
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');
    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (!cleanPhone) {
      setLoginError('Please enter your phone number.');
      return;
    }
    if (!passwordInput.trim()) {
      setLoginError('Please enter your password.');
      return;
    }

    setLoggingIn(true);
    try {
      const { data, error } = await supabase.rpc('rider_login', {
        p_phone: cleanPhone,
        p_password: passwordInput.trim()
      });

      if (error) throw error;
      if (!data || !data.success) {
        setLoginError(data?.message || 'Login failed. Please check credentials.');
        return;
      }

      const riderData = data.rider;
      setRider(riderData);
      localStorage.setItem('kp_rider_session', JSON.stringify(riderData));
      setPasswordInput('');
    } catch (err) {
      console.error('Rider login error:', err);
      setLoginError(err.message || 'Could not connect. Please try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('kp_rider_session');
    setRider(null);
    setOrders([]);
    setPayouts([]);
  };

  // Toggle On Duty / Off Duty
  const handleToggleDuty = async () => {
    if (!rider?.id || togglingDuty) return;
    const isCurrentlyOn = rider.is_on_duty !== false;
    const nextDutyState = !isCurrentlyOn;

    // Strict rule: Rider can only go Off Duty once their assigned work is finished (delivered or cancelled)
    if (isCurrentlyOn && activeOrders.length > 0) {
      alert(
        `⚠️ You cannot go Off Duty right now.\n\nYou have ${activeOrders.length} active delivery assigned to you (${activeOrders
          .map(o => o.order_code || `KP-${o.order_number}`)
          .join(', ')}).\n\nPlease complete and mark all assigned orders as Delivered before ending your duty shift.`
      );
      return;
    }

    setTogglingDuty(true);
    try {
      const { data, error } = await supabase.rpc('rider_toggle_duty', {
        p_rider_id: rider.id,
        p_is_on_duty: nextDutyState
      });

      if (error) throw error;
      if (data?.success) {
        const updated = { ...rider, is_on_duty: nextDutyState };
        setRider(updated);
        localStorage.setItem('kp_rider_session', JSON.stringify(updated));
        setNotice(nextDutyState ? '🟢 You are now ON DUTY (Available for deliveries)' : '🔴 You are now OFF DUTY (Resting)');
      }
    } catch (err) {
      console.error('Toggle duty error:', err);
      alert(`Could not toggle duty: ${err.message}`);
    } finally {
      setTogglingDuty(false);
    }
  };

  // Load Rider Orders & Data
  const loadRiderData = async (showSpinner = true) => {
    if (!rider?.id) return;
    if (showSpinner) setLoadingOrders(true);
    try {
      // 1. Fetch Orders assigned to this rider
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select(`
          id, order_number, order_code, customer_name, customer_phone,
          delivery_address, delivery_lat, delivery_lng, order_type,
          status, subtotal, discount, delivery_fee, total, notes,
          payment_method, payment_status, business_date, created_at,
          order_items (id, item_name, quantity, unit_price, line_total)
        `)
        .eq('rider_id', rider.id)
        .order('created_at', { ascending: false });

      if (!orderErr && orderData) {
        setOrders(orderData);
      }

      // 2. Fetch Payouts/Ledger for this rider (try secure RPC get_rider_statement first, fallback to table)
      let payoutRecords = [];
      try {
        const { data: rpcPayouts, error: rpcErr } = await supabase.rpc('get_rider_statement', {
          p_rider_id: rider.id
        });
        if (!rpcErr && Array.isArray(rpcPayouts)) {
          payoutRecords = rpcPayouts;
        } else {
          const { data: tablePayouts } = await supabase
            .from('rider_payouts')
            .select('*')
            .eq('rider_id', rider.id)
            .order('created_at', { ascending: false });
          if (tablePayouts) payoutRecords = tablePayouts;
        }
      } catch (pErr) {
        console.warn('Error fetching rider payouts, trying direct query:', pErr);
        const { data: fallbackPayouts } = await supabase
          .from('rider_payouts')
          .select('*')
          .eq('rider_id', rider.id)
          .order('created_at', { ascending: false });
        if (fallbackPayouts) payoutRecords = fallbackPayouts;
      }
      setPayouts(payoutRecords);

      // 3. Refresh rider balance & pay info
      const { data: freshRider } = await supabase
        .from('riders')
        .select('id, name, phone, pay_type, commission_per_order, balance, active, is_on_duty')
        .eq('id', rider.id)
        .maybeSingle();

      if (freshRider) {
        setRider(prev => ({ ...prev, ...freshRider }));
        localStorage.setItem('kp_rider_session', JSON.stringify({ ...rider, ...freshRider }));
      }
    } catch (err) {
      console.error('Failed to load rider data:', err);
    } finally {
      if (showSpinner) setLoadingOrders(false);
    }
  };

  // Initial load and real-time subscription + periodic sync
  useEffect(() => {
    if (!rider?.id) return;
    loadRiderData(true);

    // Setup real-time listener for orders assigned to this rider
    const channel = supabase
      .channel(`rider-live-${rider.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `rider_id=eq.${rider.id}`
        },
        () => {
          loadRiderData(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rider_payouts',
          filter: `rider_id=eq.${rider.id}`
        },
        () => {
          loadRiderData(false);
        }
      )
      .subscribe();

    // Polling fallback every 8 seconds for rock-solid reliability
    const interval = setInterval(() => {
      loadRiderData(false);
    }, 8000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [rider?.id]);

  // Update order status (Out for Delivery or Delivered)
  const updateStatus = async (orderId, newStatus) => {
    if (rider.is_on_duty === false) {
      alert('⚠️ You are currently OFF DUTY. Please toggle On Duty at the top before starting or updating deliveries.');
      return;
    }
    setUpdatingOrderId(orderId);
    try {
      // Optimistic update
      setOrders(current =>
        current.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      const { data, error } = await supabase.rpc('rider_update_order_status', {
        p_rider_id: rider.id,
        p_order_id: orderId,
        p_new_status: newStatus
      });

      if (error) throw error;
      if (!data || !data.success) {
        alert(data?.message || 'Could not update status');
        await loadRiderData(false);
        return;
      }

      setNotice(
        newStatus === 'delivered'
          ? '🎉 Order marked Delivered! Sales & earnings updated.'
          : '🛵 Order marked Out for Delivery!'
      );
      await loadRiderData(false);
    } catch (err) {
      console.error('Error updating status:', err);
      alert(`Update failed: ${err.message}`);
      await loadRiderData(false);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Active (Ongoing) Deliveries: status is not delivered and not cancelled
  const activeOrders = useMemo(() => {
    return orders.filter(
      o => !['delivered', 'cancelled'].includes(String(o.status || '').toLowerCase())
    );
  }, [orders]);

  // Filtered orders for Statistics & History (Reliable Nepal Business Date matching)
  const filteredOrders = useMemo(() => {
    const todayBusinessDate = businessDate();
    const now = new Date();

    return orders.filter(o => {
      const isDelivered = String(o.status || '').toLowerCase() === 'delivered';
      if (!isDelivered) return false;

      const orderDate = new Date(o.created_at);
      const orderBizDate = o.business_date || businessDate(orderDate);

      if (timeFilter === 'today') {
        return orderBizDate === todayBusinessDate;
      }
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= oneWeekAgo;
      }
      if (timeFilter === 'month') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= oneMonthAgo;
      }
      return true; // 'all'
    });
  }, [orders, timeFilter]);

  // Stats summary calculations
  const statsSummary = useMemo(() => {
    const totalSales = filteredOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const totalDelivered = filteredOrders.length;
    
    // COD Cash collected (cash on delivery)
    const codCash = filteredOrders
      .filter(o => (o.payment_method || 'cash').toLowerCase() === 'cash')
      .reduce((s, o) => s + Number(o.total || 0), 0);

    // Online paid orders
    const onlineSales = filteredOrders
      .filter(o => (o.payment_method || 'cash').toLowerCase() !== 'cash')
      .reduce((s, o) => s + Number(o.total || 0), 0);

    // Earnings estimate for this filtered period:
    // When rider is salary-based, per-order commission is 0.
    const isSalary = rider?.pay_type === 'salary';
    const periodCommission = isSalary
      ? 0
      : totalDelivered * Number(rider?.commission_per_order || 50);

    // Payout ledger total for this period
    const totalPayoutsAllocated = payouts.reduce((s, p) => s + Number(p.amount || 0), 0);

    return {
      totalSales,
      totalDelivered,
      codCash,
      onlineSales,
      periodCommission,
      isSalary,
      totalPayoutsAllocated
    };
  }, [filteredOrders, payouts, rider]);

  // Helper to open Google Maps navigation (ONLY called when coordinates exist)
  const openMaps = (order) => {
    if (order.delivery_lat && order.delivery_lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}`;
      window.open(url, '_blank');
    }
  };

  // Helper to call customer
  const callCustomer = (phone) => {
    if (!phone) {
      alert('Customer phone number is not available.');
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  // -------------------------------------------------------------
  // RENDER: LOGIN VIEW (if not logged in)
  // -------------------------------------------------------------
  if (!rider) {
    return (
      <div className="rider-login-shell">
        <div className="rider-login-card">
          <div className="rider-login-brand">
            {brandLogo ? (
              <img src={brandLogo} alt="Khante Pinte" className="rider-brand-img" />
            ) : (
              <div className="rider-brand-badge">
                <Bike size={32} />
              </div>
            )}
            <h2>Khante Pinte Rider Portal</h2>
            <p>Late Night Food Delivery · Biratnagar</p>
          </div>

          <form onSubmit={handleLogin} className="rider-login-form">
            {loginError && (
              <div className="rider-login-error">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <label>
              <span>Phone Number</span>
              <input
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="e.g. 9800000000"
                required
                autoFocus
              />
            </label>

            <label>
              <span>Rider Password</span>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Enter password given by admin"
                required
              />
            </label>

            <button type="submit" className="btn-primary rider-btn-full" disabled={loggingIn}>
              <Bike size={18} />
              <span>{loggingIn ? 'Logging In…' : 'Log In to Delivery Shift'}</span>
            </button>
          </form>

          <div className="rider-login-footer">
            <small>Credentials are created by the admin in Restaurant Settings.</small>
            {onGoToCustomer && (
              <button type="button" className="btn-link" onClick={onGoToCustomer}>
                ← Go to Khante Pinte Customer Site
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isOnDuty = rider.is_on_duty !== false;

  // -------------------------------------------------------------
  // RENDER: AUTHENTICATED RIDER PORTAL
  // -------------------------------------------------------------
  return (
    <div className="rider-portal-shell">
      {/* Top Mobile Bar */}
      <header className="rider-header">
        <div className="rider-header-left">
          <div className="rider-avatar-bubble">
            <Bike size={20} />
          </div>
          <div>
            <div className="rider-name-row">
              <strong>{rider.name}</strong>
            </div>
            <small className="rider-phone-tag">{rider.phone || 'Biratnagar Fleet'}</small>
          </div>
        </div>

        <div className="rider-header-right">
          {/* Duty Switch Button */}
          <button
            type="button"
            className={`rider-duty-toggle-btn ${isOnDuty ? 'on' : 'off'}`}
            onClick={handleToggleDuty}
            disabled={togglingDuty}
            title={isOnDuty ? 'Click to go Off Duty' : 'Click to go On Duty'}
          >
            <span className="duty-dot-indicator" />
            <span>{isOnDuty ? 'ON DUTY' : 'OFF DUTY'}</span>
          </button>

          {toggleTheme && (
            <button
              type="button"
              className="icon-btn rider-theme-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={17} style={{ color: '#facc15' }} /> : <Moon size={17} />}
            </button>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={() => loadRiderData(true)}
            title="Refresh Deliveries"
            disabled={loadingOrders}
          >
            <RefreshCw size={17} className={loadingOrders ? 'spin-anim' : ''} />
          </button>

          <button
            type="button"
            className="icon-btn rider-logout-btn"
            onClick={handleLogout}
            title="Log Out of Shift"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* Floating Notice Toast */}
      {notice && (
        <div className="rider-toast-notice">
          <span>{notice}</span>
        </div>
      )}

      {/* Duty Status Alert Banner when OFF DUTY */}
      {!isOnDuty && (
        <div className="rider-offduty-banner">
          <Power size={16} />
          <div>
            <strong>You are currently OFF DUTY.</strong>
            <small>The counter will not assign new deliveries to you until you toggle On Duty.</small>
          </div>
          <button type="button" className="btn-duty-rejoin" onClick={handleToggleDuty}>
            Go On Duty
          </button>
        </div>
      )}

      {/* Quick Summary Pill Bar */}
      <section className="rider-quick-stats">
        <div className="rider-quick-stat-item">
          <span>Active Tasks</span>
          <strong>{activeOrders.length}</strong>
        </div>
        <div className="rider-quick-stat-item">
          <span>Model</span>
          <strong>{rider.pay_type === 'salary' ? '💼 Salary' : '⚡ Commission'}</strong>
        </div>
        <div className="rider-quick-stat-item highlight">
          <span>Account Balance</span>
          <strong>{currency(rider.balance || 0)}</strong>
        </div>
      </section>

      {/* Tab Navigation */}
      <nav className="rider-tab-nav">
        <button
          type="button"
          className={`rider-tab-btn ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          <Package size={17} />
          <span>Active Tasks ({activeOrders.length})</span>
        </button>

        <button
          type="button"
          className={`rider-tab-btn ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => setTab('stats')}
        >
          <TrendingUp size={17} />
          <span>Sales & Statements</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="rider-body">
        {/* TAB 1: ACTIVE DELIVERIES */}
        {tab === 'active' && (
          <div className="rider-active-section">
            <div className="rider-section-title">
              <h3>Deliveries Assigned to You</h3>
              <small>Live sync with kitchen & admin counter</small>
            </div>

            {loadingOrders && !orders.length ? (
              <div className="rider-loading-card">
                <RefreshCw size={24} className="spin-anim" />
                <p>Checking active orders...</p>
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="rider-empty-card">
                <div className="rider-empty-icon">🛋️</div>
                <h4>No active deliveries right now!</h4>
                <p>
                  {isOnDuty
                    ? "You're all caught up. When counter assigns an order to you, it will pop up right here automatically."
                    : "You are currently marked OFF DUTY. Turn On Duty above to receive delivery orders."}
                </p>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => loadRiderData(true)}
                  style={{ marginTop: 12 }}
                >
                  <RefreshCw size={15} /> Check for new orders
                </button>
              </div>
            ) : (
              <div className="rider-orders-list">
                {activeOrders.map(order => {
                  const isOut = order.status === 'out_for_delivery';
                  const isCOD = (order.payment_method || 'cash').toLowerCase() === 'cash';
                  const orderCode = order.order_code || `KP-${order.order_number}`;
                  const hasGpsLocation = Boolean(order.delivery_lat && order.delivery_lng);

                  return (
                    <article className={`rider-order-card ${isOut ? 'out-route' : ''}`} key={order.id}>
                      {/* Card Header */}
                      <div className="rider-card-top">
                        <div>
                          <span className="rider-order-id">{orderCode}</span>
                          <span className={`rider-order-status ${order.status}`}>
                            {isOut ? '🛵 Out for Delivery' : '🍳 Ready for Delivery'}
                          </span>
                        </div>
                        <div className="rider-card-time">
                          <Clock size={13} />
                          <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="rider-customer-box">
                        <div className="rider-customer-name">
                          <strong>{order.customer_name || 'Customer'}</strong>
                          <span className="rider-phone-pill">{order.customer_phone}</span>
                        </div>

                        {/* Delivery Address & Landmark */}
                        <div className="rider-address-row">
                          <MapPin size={18} className="rider-pin-icon" />
                          <div>
                            <p className="rider-address-text">{order.delivery_address || 'Address provided on call'}</p>
                            {hasGpsLocation ? (
                              <span className="rider-gps-pill">📍 GPS Location Shared by Customer</span>
                            ) : (
                              <span className="rider-manual-pill">📍 Street & Landmark (No GPS Pin)</span>
                            )}
                          </div>
                        </div>

                        {/* Order Notes / Instructions */}
                        {order.notes && (
                          <div className="rider-notes-bubble">
                            <strong>Note:</strong> {order.notes}
                          </div>
                        )}
                      </div>

                      {/* Order Items Summary */}
                      <div className="rider-items-summary">
                        <span className="rider-items-label">Order Items ({order.order_items?.length || 0}):</span>
                        <div className="rider-items-chips">
                          {(order.order_items || []).map(item => (
                            <span key={item.id} className="rider-item-chip">
                              <strong>{item.quantity}×</strong> {item.item_name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Payment Banner */}
                      <div className={`rider-payment-banner ${isCOD ? 'cod' : 'online'}`}>
                        {isCOD ? (
                          <>
                            <div className="pay-banner-text">
                              <span>💵 CASH ON DELIVERY:</span>
                              <strong>{currency(order.total)}</strong>
                            </div>
                            <small>Please collect exact cash from customer</small>
                          </>
                        ) : (
                          <>
                            <div className="pay-banner-text">
                              <span>✅ PAID ONLINE (QR / eSewa):</span>
                              <strong>{currency(order.total)}</strong>
                            </div>
                            <small>Do NOT collect cash from customer</small>
                          </>
                        )}
                      </div>

                      {/* Action Buttons Row: Google Maps only if user actually selected GPS location */}
                      <div className={`rider-actions-grid ${!hasGpsLocation ? 'single-call-btn' : ''}`}>
                        {hasGpsLocation && (
                          <button
                            type="button"
                            className="rider-btn-nav"
                            onClick={() => openMaps(order)}
                          >
                            <Navigation size={18} />
                            <span>Open in Google Maps</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="rider-btn-call"
                          onClick={() => callCustomer(order.customer_phone)}
                        >
                          <Phone size={18} />
                          <span>Call Customer</span>
                        </button>
                      </div>

                      {/* Delivery Status Flow Button */}
                      <div className="rider-status-cta">
                        {!isOut ? (
                          <button
                            type="button"
                            className="btn-primary rider-cta-out"
                            onClick={() => updateStatus(order.id, 'out_for_delivery')}
                            disabled={updatingOrderId === order.id}
                          >
                            <Bike size={18} />
                            <span>
                              {updatingOrderId === order.id ? 'Updating…' : 'Start Delivery (Out for Delivery)'}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary rider-cta-deliver"
                            onClick={() => {
                              if (window.confirm(`Mark order ${orderCode} as DELIVERED${isCOD ? ` and confirm you collected ${currency(order.total)} cash` : ''}?`)) {
                                updateStatus(order.id, 'delivered');
                              }
                            }}
                            disabled={updatingOrderId === order.id}
                          >
                            <CheckCircle size={18} />
                            <span>
                              {updatingOrderId === order.id ? 'Completing…' : 'Mark Delivered ✓'}
                            </span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SALES, STATEMENTS & COMPENSATION */}
        {tab === 'stats' && (
          <div className="rider-stats-section">
            {/* Period Filter Buttons */}
            <div className="rider-period-pills">
              <button
                type="button"
                className={`rider-period-pill ${timeFilter === 'today' ? 'active' : ''}`}
                onClick={() => setTimeFilter('today')}
              >
                Today
              </button>
              <button
                type="button"
                className={`rider-period-pill ${timeFilter === 'week' ? 'active' : ''}`}
                onClick={() => setTimeFilter('week')}
              >
                This Week
              </button>
              <button
                type="button"
                className={`rider-period-pill ${timeFilter === 'month' ? 'active' : ''}`}
                onClick={() => setTimeFilter('month')}
              >
                This Month
              </button>
              <button
                type="button"
                className={`rider-period-pill ${timeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTimeFilter('all')}
              >
                All Time
              </button>
            </div>

            {/* Metric Cards Grid */}
            <div className="rider-metrics-grid">
              <div className="rider-metric-card revenue">
                <span className="metric-label">Total Sales Generated</span>
                <strong className="metric-val">{currency(statsSummary.totalSales)}</strong>
                <small className="metric-sub">{statsSummary.totalDelivered} orders delivered</small>
              </div>

              <div className="rider-metric-card earnings">
                <span className="metric-label">
                  {statsSummary.isSalary ? 'Compensation Model' : 'Commission Earned'}
                </span>
                <strong className="metric-val">
                  {statsSummary.isSalary ? 'Fixed Salary' : currency(statsSummary.periodCommission)}
                </strong>
                <small className="metric-sub">
                  {statsSummary.isSalary
                    ? 'Salary allocated by counter'
                    : `Rs. ${rider.commission_per_order || 50} per delivered order`}
                </small>
              </div>

              <div className="rider-metric-card cod">
                <span className="metric-label">COD Cash Collected</span>
                <strong className="metric-val">{currency(statsSummary.codCash)}</strong>
                <small className="metric-sub">Physical cash to hand over</small>
              </div>

              <div className="rider-metric-card online">
                <span className="metric-label">Online Payments</span>
                <strong className="metric-val">{currency(statsSummary.onlineSales)}</strong>
                <small className="metric-sub">Paid directly via QR / eSewa</small>
              </div>
            </div>

            {/* Rider Account Allocation / Payout History */}
            <div className="rider-ledger-box">
              <div className="ledger-title-row">
                <div>
                  <h4>Account Statement & Passbook</h4>
                  <small>Detailed ledger of commissions, salaries & cash payouts</small>
                </div>
                <span className="ledger-badge">Balance: {currency(rider.balance || 0)}</span>
              </div>

              {payouts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--text-secondary, #64748b)' }}>
                  <FileText size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: 13 }}>No payout or compensation transactions recorded yet.</p>
                </div>
              ) : (
                <div className="rider-ledger-list">
                  {payouts.map(p => {
                    const isPositive = Number(p.amount) >= 0;
                    const typeLabel = 
                      p.type === 'commission' ? 'Order Commission' :
                      p.type === 'salary' ? 'Salary Credit' :
                      p.type === 'bonus' ? 'Bonus / Incentive' :
                      p.type === 'payout' ? 'Cash/Bank Payout' :
                      String(p.type || 'transaction').toUpperCase();

                    return (
                      <div className={`rider-ledger-item ${isPositive ? 'credit' : 'debit'}`} key={p.id}>
                        <div className="ledger-item-icon-wrap" style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: isPositive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: isPositive ? '#16a34a' : '#dc2626'
                        }}>
                          {isPositive ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div className="ledger-item-left" style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              textTransform: 'uppercase',
                              background: isPositive ? '#dcfce7' : '#fee2e2',
                              color: isPositive ? '#15803d' : '#b91c1c'
                            }}>
                              {isPositive ? 'CREDITED' : 'DEBITED'}
                            </span>
                            <strong style={{ fontSize: 13 }}>
                              {typeLabel}
                            </strong>
                          </div>
                          <p style={{ margin: '3px 0 2px', fontSize: 13, color: 'inherit', opacity: 0.9 }}>
                            {p.notes || 'No description provided'}
                          </p>
                          <small style={{ opacity: 0.65, fontSize: 11 }}>
                            {new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} · {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {p.admin_email ? ` · Auth by ${formatAdminName(p.admin_email)}` : ''}
                          </small>
                        </div>
                        <div className="ledger-item-right" style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                          <span className={`ledger-amount ${isPositive ? 'plus' : 'minus'}`} style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: isPositive ? '#16a34a' : '#dc2626'
                          }}>
                            {isPositive ? '+' : ''}{currency(p.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Completed Orders List in Selected Period */}
            <div className="rider-history-box">
              <div className="ledger-title-row">
                <div>
                  <h4>Delivered Orders Breakdown ({filteredOrders.length})</h4>
                  <small>Orders completed in {timeFilter} shift</small>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <p className="rider-ledger-empty">No completed deliveries found for this period.</p>
              ) : (
                <div className="rider-history-list">
                  {filteredOrders.map(ord => (
                    <div className="rider-history-item" key={ord.id}>
                      <div className="history-left">
                        <strong>{ord.order_code || `KP-${ord.order_number}`}</strong>
                        <span className="history-cust-name">{ord.customer_name}</span>
                        <small>{new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ord.delivery_address || 'Biratnagar'}</small>
                      </div>
                      <div className="history-right">
                        <strong className="history-order-amt">{currency(ord.total)}</strong>
                        <span className={`history-pay-tag ${ord.payment_method}`}>
                          {ord.payment_method === 'cash' ? '💵 COD' : '✅ Online'}
                        </span>
                        {!statsSummary.isSalary && (
                          <small className="history-comm-tag">+{currency(rider.commission_per_order || 50)} comm.</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
