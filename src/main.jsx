import { testConnection } from "./lib/testConnection";
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';
import './style.css';
import { Search, ShoppingBag, Clock3, MapPin, Phone, ChevronRight, Plus, Minus, X, Check, Bell, LayoutDashboard, ClipboardList, ChefHat, Store, Package, Tag, Users, Wallet, Settings, Bike, TrendingUp, ArrowLeft, LogIn, Menu as MenuIcon, CircleDollarSign, Receipt, AlertCircle, RefreshCw, Settings2, Instagram, Facebook } from 'lucide-react';

const currency = n => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
const formatTime12 = value => {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${suffix}`;
};
const parseTime12 = value => {
  const match = String(value || '').trim().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
};
const getStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } };
const saveStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const businessDate = (date = new Date()) => { const local = new Date(date.getTime() + 5.75 * 3600000); const utc = new Date(local.getTime() - 4 * 3600000); return utc.toISOString().slice(0, 10) };
const nowLabel = () => new Date().toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short' });
const dbToUiStatus = {
  pending: 'New',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};
const uiToDbStatus = {
  New: 'pending',
  Confirmed: 'confirmed',
  Preparing: 'preparing',
  Ready: 'ready',
  'Out for Delivery': 'out_for_delivery',
  Delivered: 'delivered',
  Cancelled: 'cancelled'
};
const formatDbOrder = row => ({
  id: `KP-${row.order_number}`,
  seq: Number(row.order_number),
  dbId: row.id,
  trackingToken: row.tracking_token,
  source: row.order_source === 'website' ? 'Website' : row.order_source === 'phone' ? 'Phone' : 'Walk-in',
  businessDate: row.business_date,
  createdAt: row.created_at,
  customer: row.customer_name || 'Walk-in',
  phone: row.customer_phone || '',
  address: row.delivery_address || '',
  type: row.order_type === 'pickup' ? 'Pickup' : 'Delivery',
  items: (row.order_items || []).map(item => ({
    id: item.menu_item_id || item.id,
    name: item.item_name,
    qty: Number(item.quantity),
    price: Number(item.unit_price)
  })),
  subtotal: Number(row.subtotal || 0),
  discount: Number(row.discount || 0),
  delivery: Number(row.delivery_fee || 0),
  total: Number(row.total || 0),
  payment: row.payment_method || 'cash',
  paymentStatus: row.payment_status || 'unpaid',
  paymentProofPath: row.payment_proof_path || null,
  cancellationReason: row.cancellation_reason || '',
  riderId: row.rider_id || null,
  rider: row.rider?.name || '',
  riderPhone: row.rider?.phone || '',
  status: dbToUiStatus[row.status] || 'New',
  note: row.notes || '',
  events: (row.order_status_history || []).map(event => ({
    status: dbToUiStatus[event.status] || event.status,
    time: event.changed_at,
    by: 'System'
  }))
});

function App() {

  useEffect(() => {
    testConnection();
  }, []);

  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState(['All']);

  useEffect(() => {
    const loadMenu = async () => {
      const { data: categoryData, error: categoryError } = await supabase
        .from('menu_categories')
        .select('id, name, display_order, active')
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (categoryError) {
        console.error('Menu categories loading failed:', categoryError);
        return;
      }
      if (!categoryData?.length) {
        setDbCategories(['All']);
        setProducts([]);
        return;
      }

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('id, category_id, name, description, price, image_url, available, stock_quantity, menu_categories(name)')
        .in('category_id', categoryData.map(category => category.id))
        .order('name');

      if (categoryError || menuError) {
        console.error('Menu loading failed:', categoryError || menuError);
        return;
      }

      setDbCategories(['All', ...categoryData.map(c => c.name)]);

      const formattedProducts = menuData.map(item => ({
        id: item.id,
        name: item.name,
        category: item.menu_categories?.name || 'Other',
        categoryId: item.category_id,
        price: Number(item.price),
        description: item.description || '',
        tag: '',
        emoji: '🍽️',
        image_url: item.image_url,
        outOfStock: !item.available || item.stock_quantity === 0
      }));

      setProducts(formattedProducts);
      console.log('Menu loaded from Supabase:', formattedProducts);
    };

    loadMenu();
  }, []);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [riders, setRiders] = useState([]);
  const [riderIds, setRiderIds] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [deliveryFee, setDeliveryFee] = useState(50);
  const [storeHours, setStoreHours] = useState({ open_time: '21:00', close_time: '04:00' });
  const [storeManualStatus, setStoreManualStatus] = useState('auto');
  const [storeOpen, setStoreOpen] = useState(false); const [storeStatusLoaded, setStoreStatusLoaded] = useState(false);

  useEffect(() => {
    const loadPublicVouchers = async () => {
      const { data, error } = await supabase.from('vouchers').select('id,code,discount_type,discount_value,minimum_order,maximum_discount,active,expires_at').eq('active', true).order('created_at', { ascending: false });
      if (!error) setVouchers((data || []).map(v => ({ id:v.id, code:v.code, type:v.discount_type, value:Number(v.discount_value), min:Number(v.minimum_order||0), max:Number(v.maximum_discount||0), active:v.active, expiresAt:v.expires_at })));
      else console.error('Vouchers loading failed:', error);
    };
    loadPublicVouchers();
  }, []);

  useEffect(() => {
    const loadBusinessSettings = async () => {
      const [{ data: methods, error: methodsError }, { data: feeRow, error: feeError }, { data: hoursRow }, { data: manualRow }, { data: openNow, error: openError }] = await Promise.all([
        supabase.from('payment_methods').select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof').order('display_order'),
        supabase.from('business_settings').select('setting_value').eq('setting_key', 'delivery_fee').maybeSingle(),
        supabase.from('business_settings').select('setting_value').eq('setting_key', 'store_hours').maybeSingle(),
        supabase.from('business_settings').select('setting_value').eq('setting_key', 'store_manual_status').maybeSingle(),
        supabase.rpc('is_store_open')
      ]);
      if (methodsError) console.error('Payment methods loading failed:', methodsError);
      else setPaymentMethods(methods || []);
      if (feeError) console.error('Delivery fee loading failed:', feeError);
      else if (feeRow?.setting_value !== undefined) setDeliveryFee(Number(feeRow.setting_value) || 0);
      if (hoursRow?.setting_value) setStoreHours(hoursRow.setting_value);
      if (manualRow?.setting_value) setStoreManualStatus(String(manualRow.setting_value).replaceAll('\"', ''));
      if (!openError) { setStoreOpen(!!openNow); setStoreStatusLoaded(true); } else { console.error('Store status check failed:', openError); }
    };
    loadBusinessSettings();
    const statusTimer = setInterval(async () => { const { data, error } = await supabase.rpc('is_store_open'); if (!error) { setStoreOpen(!!data); setStoreStatusLoaded(true); } }, 60000);
    return () => clearInterval(statusTimer);
  }, []);
  const [cart, setCart] = useState([]); const [category, setCategory] = useState('All'); const [search, setSearch] = useState('');
 const [view, setView] = useState(() => window.location.hostname.startsWith('admin.') || (['localhost','127.0.0.1'].includes(window.location.hostname) && window.location.pathname.startsWith('/admin')) ? 'admin' : 'customer');
useEffect(() => { const localHost = ['localhost','127.0.0.1'].includes(window.location.hostname); if (!localHost && !window.location.hostname.startsWith('admin.') && window.location.pathname.startsWith('/admin')) window.location.replace('https://admin.khantepinte.com.np/'); }, []);
const [brandLogo, setBrandLogo] = useState('');
useEffect(() => { let live = true; supabase.from('business_settings').select('setting_value').eq('setting_key','brand_logo_url').maybeSingle().then(({data,error}) => { if (!live) return; if (!error && data?.setting_value) { let value=data.setting_value; if (typeof value !== 'string') value=String(value); try { const parsed=JSON.parse(value); if (typeof parsed==='string') value=parsed; } catch {} setBrandLogo(value); } }); return () => { live = false; }; }, []);
const [adminSection, setAdminSection] = useState('Dashboard');
const [adminLogged, setAdminLogged] = useState(false);
const [loginEmail, setLoginEmail] = useState('');
const [loginPassword, setLoginPassword] = useState('');
const [adminChecking, setAdminChecking] = useState(true);
const [adminLoading, setAdminLoading] = useState(false);
const [adminError, setAdminError] = useState('');
const [forgotMode, setForgotMode] = useState(false);
const [forgotLoading, setForgotLoading] = useState(false);
const [forgotMessage, setForgotMessage] = useState('');
const [recoveryMode, setRecoveryMode] = useState(false);
const [newPassword, setNewPassword] = useState('');
const [confirmNewPassword, setConfirmNewPassword] = useState('');
const [recoveryError, setRecoveryError] = useState('');
const [recoveryLoading, setRecoveryLoading] = useState(false);

useEffect(() => {
  let active = true;
  let checkNumber = 0;

  const verifyAdmin = async (session) => {
    const thisCheck = ++checkNumber;

    if (!session) {
      if (active && thisCheck === checkNumber) {
        setAdminLogged(false);
        setAdminChecking(false);
      }
      return false;
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!active || thisCheck !== checkNumber) return false;

    const isAdmin = !error && !!data;
    setAdminLogged(isAdmin);
    setAdminChecking(false);
    return isAdmin;
  };

  const syncCustomerSession = async (session) => {
    if (!session?.user) {
      if (active) setCustomerAccount(null);
      saveStore('kp_customer_session', null);
      return;
    }

    // An Admin session must never be treated as a customer session on the storefront.
    const { data: adminRow, error: adminLookupError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (!active) return;
    if (adminLookupError) {
      console.error('Could not verify account type:', adminLookupError);
      setCustomerAccount(null);
      saveStore('kp_customer_session', null);
      return;
    }
    if (adminRow) {
      setCustomerAccount(null);
      saveStore('kp_customer_session', null);
      return;
    }

    const metadata = session.user.user_metadata || {};
    // Prefer explicit customer metadata. For older customer accounts without metadata,
    // verify that a customer profile exists before showing a signed-in account.
    let customerProfile = null;
    if (metadata.account_type !== 'customer') {
      const { data, error } = await supabase
        .from('customers')
        .select('name,phone,avatar_url')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setCustomerAccount(null);
        saveStore('kp_customer_session', null);
        return;
      }
      customerProfile = data;
    }

    const account = {
      name: customerProfile?.name || metadata.full_name || metadata.name || 'Food lover',
      email: session.user.email || '',
      phone: customerProfile?.phone || metadata.phone || '',
      userId: session.user.id,
      avatarUrl: customerProfile?.avatar_url || metadata.avatar_url || ''
    };
    setCustomerAccount(account);
    saveStore('kp_customer_session', account);
  };

  supabase.auth.getSession().then(async ({ data, error }) => {
    if (error) {
      console.error('Could not check Supabase session:', error);
      if (active) setAdminChecking(false);
      return;
    }
    await verifyAdmin(data.session);
    await syncCustomerSession(data.session);
  });

  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    // Defer Supabase reads until after the auth callback has completed.
    setTimeout(() => {
      if (!active) return;
      verifyAdmin(session);
      syncCustomerSession(session);
    }, 0);
  });

  return () => {
    active = false;
    authListener.subscription.unsubscribe();
  };
}, []);

  const [checkoutOpen, setCheckoutOpen] = useState(false); const [customerAuthOpen, setCustomerAuthOpen] = useState(false); const [customerAuthMode, setCustomerAuthMode] = useState('login'); const [customerAccount, setCustomerAccount] = useState(null); const [accountOpen, setAccountOpen] = useState(false); const [trackingOrderId, setTrackingOrderId] = useState(() => getStore('kp_last_order_id', '')); const [trackingPhone, setTrackingPhone] = useState(''); const [trackingOpen, setTrackingOpen] = useState(false); const [lastOrderId, setLastOrderId] = useState(() => getStore('kp_last_order_id', '')); const [notice, setNotice] = useState(''); const [closedNoticeDismissed, setClosedNoticeDismissed] = useState(false); const [selectedProduct, setSelectedProduct] = useState(null);
  useEffect(() => { if (storeOpen) setClosedNoticeDismissed(false); }, [storeOpen]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false); const [voucherInput, setVoucherInput] = useState(''); const [appliedVoucher, setAppliedVoucher] = useState(null); const [menuOpen, setMenuOpen] = useState(false); const [selectedOrder, setSelectedOrder] = useState(null);
  useEffect(() => saveStore('kp_vouchers', vouchers), [vouchers]); useEffect(() => saveStore('kp_riders', riders), [riders]);
  const filtered = products.filter(p => (category === 'All' || p.category === category) && (`${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())));
  const cartSubtotal = cart.reduce((s, x) => s + x.price * x.qty, 0); const delivery = cart.length ? deliveryFee : 0;
  const voucherDiscount = appliedVoucher ? Number(appliedVoucher.serverDiscount || 0) : 0;
  const cartCount = cart.reduce((s, x) => s + x.qty, 0);
  const add = (p) => { if (p.outOfStock) { setNotice('This item is currently out of stock.'); return } setCart(c => { const old = c.find(x => x.id === p.id); return old ? c.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...p, qty: 1 }] }) };
  const changeQty = (id, d) => {
    setCart(current => current
      .map(item => item.id === id ? { ...item, qty: item.qty + d } : item)
      .filter(item => item.qty > 0));
    // Revalidate a voucher after cart contents change.
    setAppliedVoucher(null);
  };
  const removeCartItem = id => {
    setCart(current => current.filter(item => item.id !== id));
    setAppliedVoucher(null);
  };
  const total = cartSubtotal - voucherDiscount + delivery;

  const loadOrders = async (showLoader = false) => {
    if (showLoader) setOrdersLoading(true);
    setOrdersError('');
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, delivery_address, order_type, order_source, status, subtotal, discount, delivery_fee, total, notes, tracking_token, business_date, created_at, payment_method, payment_status, payment_proof_path, cancellation_reason, rider_id, order_items(id, menu_item_id, item_name, quantity, unit_price, line_total), order_status_history(id, status, changed_at), rider:riders(id,name,phone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data || []).map(formatDbOrder));
    } catch (error) {
      console.error('Orders loading failed:', error);
      setOrdersError(error.message || 'Could not load orders.');
    } finally {
      if (showLoader) setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!adminLogged) return;
    const loadRiders = async () => {
      const { data, error } = await supabase.from('riders').select('id,name,phone,active').eq('active', true).order('name');
      if (error) { console.error('Riders loading failed:', error); return; }
      setRiders((data || []).map(r => r.name));
      setRiderIds(Object.fromEntries((data || []).map(r => [r.name, r.id])));
    };
    loadRiders();
    const loadVouchers = async () => {
      const { data, error } = await supabase.from('vouchers').select('id,code,discount_type,discount_value,minimum_order,maximum_discount,active,expires_at').order('created_at', { ascending: false });
      if (error) { console.error('Vouchers loading failed:', error); setNotice(`Could not load vouchers: ${error.message}`); return; }
      setVouchers((data || []).map(v => ({ id:v.id, code:v.code, type:v.discount_type, value:Number(v.discount_value), min:Number(v.minimum_order||0), max:Number(v.maximum_discount||0), active:v.active, expiresAt:v.expires_at })));
    };
    loadVouchers();
    loadOrders(true);
    const channel = supabase
      .channel('admin-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadOrders(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_history' }, () => loadOrders(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [adminLogged]);

  const newOrder = async (details, source = 'Phone') => {
    const orderSource = source === 'Phone' ? 'phone' : source === 'Website' ? 'website' : 'walkin';
    const orderType = (details.type || 'Delivery').toLowerCase();
    const payload = {
      customer_name: details.customer || 'Walk-in',
      customer_phone: details.phone || '',
      delivery_address: details.address || null,
      order_type: orderType === 'pickup' ? 'pickup' : 'delivery',
      order_source: orderSource,
      status: 'pending',
      subtotal: Number(details.subtotal || 0),
      discount: Number(details.discount || 0),
      delivery_fee: Number(details.delivery || 0),
      total: Number(details.total || 0),
      notes: details.note || '',
      payment_method: details.paymentMethod || 'cash',
      payment_status: details.paymentStatus || 'unpaid',
      rider_id: null,
      business_date: businessDate()
    };
    try {
      if (details.rider) {
        let riderId = riderIds[details.rider];
        if (!riderId) {
          const { data: riderRow, error: riderLookupError } = await supabase.from('riders').select('id').eq('name', details.rider).eq('active', true).maybeSingle();
          if (riderLookupError) throw riderLookupError;
          riderId = riderRow?.id || null;
        }
        payload.rider_id = riderId;
      }
      const { data: saved, error } = await supabase
        .from('orders').insert(payload)
        .select('id, order_number').single();
      if (error) throw error;

      const itemRows = (details.items || []).map(item => ({
        order_id: saved.id,
        menu_item_id: typeof item.id === 'string' ? item.id : null,
        item_name: item.name,
        quantity: Number(item.qty || 1),
        unit_price: Number(item.price || 0),
        line_total: Number(item.price || 0) * Number(item.qty || 1)
      }));
      if (itemRows.length) {
        const { error: itemError } = await supabase.from('order_items').insert(itemRows);
        if (itemError) throw itemError;
      }
      await loadOrders(false);
      setNotice(`Order KP-${saved.order_number} created successfully.`);
      return saved;
    } catch (error) {
      console.error('POS order creation failed:', error);
      setNotice(`Could not create order: ${error.message}`);
      throw error;
    }
  };


const applyVoucher = async () => {
  if (!voucherInput.trim()) { setNotice('Enter a voucher code.'); return; }
  const { data, error } = await supabase.rpc('validate_website_voucher', { p_code: voucherInput.trim().toUpperCase(), p_subtotal: cartSubtotal });
  if (error) { setNotice(`Could not validate voucher: ${error.message}`); return; }
  if (!data?.valid) { setAppliedVoucher(null); setNotice(data?.message || 'Voucher is invalid.'); return; }
  const voucher = vouchers.find(v => v.code.toUpperCase() === data.code.toUpperCase()) || { code: data.code, active: true };
  setAppliedVoucher({ ...voucher, serverDiscount: Number(data.discount) });
  setNotice(`Voucher applied! You save ${currency(data.discount)}.`);
};

  const submitCheckout = async (form) => {
    if (!cart.length) return;

    try {
      let paymentProofPath = null;
      if (form.paymentProof) {
        const extension = form.paymentProof.name.split('.').pop()?.toLowerCase() || 'jpg';
        paymentProofPath = `proofs/${crypto.randomUUID()}.${extension}`;
        const { error: proofUploadError } = await supabase.storage.from('payment-proofs')
          .upload(paymentProofPath, form.paymentProof, { contentType: form.paymentProof.type, upsert: false });
        if (proofUploadError) throw proofUploadError;
      }
      const { data, error } = await supabase.rpc(
        'create_website_order',
        {
          p_customer_name: form.name.trim(),
          p_customer_phone: form.phone.trim(),
          p_delivery_address: form.address.trim() || null,
          p_order_type: form.type.toLowerCase(),
          p_items: cart.map(item => ({
            id: item.id,
            qty: item.qty
          })),
          p_notes: [form.gift ? `GIFT ORDER — Recipient: ${form.recipientName}; recipient phone: ${form.recipientPhone}; delivery address: ${form.address}` : '', form.contactPhone ? `CUSTOMER CALLBACK NUMBER: ${form.contactPhone}` : '', form.note ? `Customer note: ${form.note}` : ''].filter(Boolean).join(' | '),
          p_payment_method: form.paymentMethod || 'cash',
          p_payment_proof_path: paymentProofPath,
          p_voucher_code: appliedVoucher?.code || null
        }
      );

      if (error) throw error;

      if (!data || !data.success) {
        throw new Error('Order could not be created.');
      }

      const order = {
        id: `KP-${data.order_number}`,
        dbId: data.order_id,
        trackingToken: data.tracking_token,
        seq: Number(data.order_number),
        source: 'Website',
        businessDate: businessDate(),
        createdAt: new Date().toISOString(),
        customer: form.name,
        phone: form.phone,
        address: form.address,
        type: form.type,
        items: cart.map(item => ({ ...item })),
        subtotal: Number(data.subtotal),
        discount: Number(data.discount || 0),
        delivery: Number(data.delivery_fee),
        total: Number(data.total),
        payment: form.paymentMethod || 'cash',
        paymentStatus: 'Unpaid',
        status: 'New',
        rider: '',
        note: form.note || '',
        events: [
          {
            status: 'New',
            time: new Date().toISOString(),
            by: 'Website'
          }
        ]
      };

      setOrders(previous => [order, ...previous]);
      loadOrders(false);
      setCart([]);
      setAppliedVoucher(null);
      setVoucherInput('');
      setCheckoutOpen(false);

      setLastOrderId(order.id);
      saveStore('kp_last_order_id', order.id);
      setTrackingOrderId(order.id);
      setTrackingPhone(customerAccount?.userId ? '' : form.phone);
      setTrackingOpen(true);

      setNotice(`Order ${order.id} placed successfully!`);

    } catch (error) {
      console.error('Order submission failed:', error);
      setNotice(`Order failed: ${error.message}`);
    }
  };

  const changeStatus = async (id, status) => {
    const order = orders.find(item => item.id === id);
    if (!order?.dbId) {
      setNotice('This order is not saved in the database. Refresh orders and try again.');
      return;
    }
    const dbStatus = uiToDbStatus[status];
    if (!dbStatus) return;
    const { error } = await supabase.from('orders').update({ status: dbStatus }).eq('id', order.dbId);
    if (error) {
      console.error('Order status update failed:', error);
      setNotice(`Could not update order: ${error.message}`);
      return;
    }
    await loadOrders(false);
    setNotice(`${id} updated to ${status}.`);
  };
  const changePaymentStatus = async (id, status) => {
    const order = orders.find(item => item.id === id);
    if (!order?.dbId) return;
    const { error } = await supabase.from('orders').update({ payment_status: status }).eq('id', order.dbId);
    if (error) { setNotice(`Could not update payment status: ${error.message}`); return; }
    await loadOrders(false);
    setNotice(`${id} payment marked ${status}.`);
  };

  const assignRider = async (id, rider) => {
    const order = orders.find(o => o.id === id);
    if (!order?.dbId) return;
    let riderId = rider ? riderIds[rider] : null;
    if (rider && !riderId) {
      const { data: riderRow, error: lookupError } = await supabase.from('riders').select('id').eq('name', rider).eq('active', true).maybeSingle();
      if (lookupError) { setNotice(`Could not find rider: ${lookupError.message}`); return; }
      riderId = riderRow?.id || null;
    }
    const { error } = await supabase.from('orders').update({ rider_id: riderId }).eq('id', order.dbId);
    if (error) { setNotice(`Could not assign rider: ${error.message}`); return; }
    await loadOrders(false);
    setNotice(rider ? `${rider} assigned to ${id}.` : `Rider removed from ${id}.`);
  };
  const cancelOrder = id => {
    const order = orders.find(item => item.id === id);
    if (!order?.dbId) { setNotice('This order is not saved in Supabase. Refresh orders and try again.'); return; }
    setCancelTarget(order);
    setCancelReasonInput('');
  };
  const confirmCancelOrder = async () => {
    if (!cancelTarget?.dbId || cancelSaving) return;
    setCancelSaving(true);
    const { data, error } = await supabase.from('orders')
      .update({ status: 'cancelled', cancellation_reason: cancelReasonInput.trim() || null })
      .eq('id', cancelTarget.dbId)
      .select('id,status,cancellation_reason')
      .single();
    setCancelSaving(false);
    if (error) { setNotice(`Could not cancel order: ${error.message}`); return; }
    if (!data || data.status !== 'cancelled') { setNotice('Order was not cancelled. Please refresh and try again.'); return; }
    const cancelledId = cancelTarget.id;
    setCancelTarget(null);
    setCancelReasonInput('');
    await loadOrders(true);
    setAdminSection('Cancelled Orders');
    setNotice(`${cancelledId} cancelled and moved to Cancelled Orders.`);
  };

  const login = async () => {
    setAdminError('');
    if (!loginEmail.trim() || !loginPassword) {
      setAdminError('Enter your email and password.');
      return;
    }

    setAdminLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      });

      if (error) throw error;

      const { data: admin, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (adminError || !admin) {
        await supabase.auth.signOut();
        throw new Error('This account is not authorised for Admin access.');
      }

      setAdminLogged(true);
      setLoginPassword('');
    } catch (error) {
      const message = error.message || 'Login failed.';
      setAdminError(message.toLowerCase().includes('invalid login credentials')
        ? 'Incorrect email or password.'
        : message);
    } finally {
      setAdminLoading(false);
    }
  };
  const logoutAdmin = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setNotice(`Could not sign out: ${error.message}`);
      return;
    }
    setAdminLogged(false);
    setLoginPassword('');
    setAdminError('');
    setView('admin');
  };

  const requestPasswordReset = async () => {
    setForgotMessage('');
    setAdminError('');
    if (!loginEmail.trim()) {
      setForgotMessage('Enter your admin email address first.');
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
        redirectTo: `${window.location.origin}/admin`
      });
      if (error) throw error;
      setForgotMessage('If this email belongs to an account, a password reset link has been sent. Check your inbox and spam folder.');
    } catch (error) {
      setForgotMessage(error.message || 'Could not send the password reset email. Please try again later.');
    } finally {
      setForgotLoading(false);
    }
  };

  const saveNewPassword = async () => {
    setRecoveryError('');
    if (newPassword.length < 6) {
      setRecoveryError('Your password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setRecoveryError('The passwords do not match.');
      return;
    }
    setRecoveryLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await supabase.auth.signOut();
      setRecoveryMode(false);
      setNewPassword('');
      setConfirmNewPassword('');
      window.history.replaceState({}, document.title, window.location.pathname);
      setAdminError('Password updated successfully. Please sign in with your new password.');
      setView(window.location.hostname.startsWith('admin.') || (['localhost','127.0.0.1'].includes(window.location.hostname) && window.location.pathname.startsWith('/admin')) ? 'admin' : 'customer');
    } catch (error) {
      setRecoveryError(error.message || 'Could not update password. The reset link may have expired.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  useEffect(() => {
    if (!adminLogged) return;
    const channel = supabase
      .channel('khante-pinte-admin-order-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        const row = payload.new || {};
        const oldRow = payload.old || {};
        if (payload.eventType === 'INSERT') {
          const item = {
            id: `${row.id || Date.now()}-new`,
            title: `New order KP-${row.order_number || ''}`,
            message: `${row.customer_name || 'Customer'} · ${currency(Number(row.total || 0))}`,
            time: new Date().toISOString(),
            kind: 'new'
          };
          setNotifications(current => [item, ...current].slice(0, 30));
          setNewOrderAlert({
            orderNumber: row.order_number,
            customer: row.customer_name || 'Customer',
            amount: Number(row.total || 0)
          });
          setNotice(`NEW ORDER: KP-${row.order_number || ''} · ${row.customer_name || 'Customer'} · ${currency(Number(row.total || 0))}`);
        } else if (payload.eventType === 'UPDATE' && row.status && row.status !== oldRow.status) {
          const item = {
            id: `${row.id || Date.now()}-${Date.now()}`,
            title: `Order KP-${row.order_number || ''} updated`,
            message: `Status changed to ${row.status.replaceAll('_', ' ')}`,
            time: new Date().toISOString(),
            kind: 'status'
          };
          setNotifications(current => [item, ...current].slice(0, 30));
        }
        loadOrders(false);
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Order realtime connection:', status);
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [adminLogged]);

  const stats = useMemo(() => { const day = businessDate(); const dayOrders = orders.filter(o => o.businessDate === day && o.status !== 'Cancelled'); const sales = dayOrders.reduce((s, o) => s + o.total, 0); return { dayOrders, sales, avg: dayOrders.length ? sales / dayOrders.length : 0, all: orders.length } }, [orders]);
  if (recoveryMode) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="brand-mark large">KP</div>
          <span className="eyebrow">ACCOUNT RECOVERY</span>
          <h1>Set new <em>password</em></h1>
          <p>Choose a new password for your Khante Pinte account.</p>
          <label>New password<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" /></label>
          <label>Confirm new password<input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNewPassword()} placeholder="Enter the password again" /></label>
          {recoveryError && <p className="form-error">{recoveryError}</p>}
          <button className="btn-primary full" onClick={saveNewPassword} disabled={recoveryLoading}>{recoveryLoading ? 'Updating password...' : 'Update password'}</button>
        </div>
      </div>
    );
  }

  if (view === 'admin' && adminChecking) {
    return <div className="login-page">Checking Admin access...</div>;
  }

  if (view === 'admin' && !adminLogged) {
    return (
      <AdminLogin
        email={loginEmail}
        setEmail={setLoginEmail}
        password={loginPassword}
        setPassword={setLoginPassword}
        onLogin={login}
        onBack={() => { window.location.href = window.location.hostname.startsWith('admin.') ? 'https://khantepinte.com.np/' : '/'; }}
        loading={adminLoading}
        error={adminError}
        setError={setAdminError}
        forgotMode={forgotMode}
        setForgotMode={setForgotMode}
        forgotLoading={forgotLoading}
        forgotMessage={forgotMessage}
        setForgotMessage={setForgotMessage}
        onForgot={requestPasswordReset}
      />
    );
  }
  return <div className="app-shell">
    {view === 'customer' ? <>
      <header className="site-header"><a className="brand" href="#top">{brandLogo ? <img className="kp-header-logo" src={brandLogo} alt="Khante Pinte" /> : <span className="brand-mark">KP</span>}<span><strong>KHANTE PINTE</strong><small>Late night cravings, sorted.</small></span></a><nav className="main-nav"><a href="#menu">Menu</a><a href="#about">About</a><a href="#contact">Contact</a></nav><div className="header-actions">{customerAccount ? <><button className="customer-account-trigger" onClick={() => setAccountOpen(true)}><span className="customer-avatar-mini">{customerAccount.avatarUrl ? <img src={customerAccount.avatarUrl} alt="" /> : (customerAccount.name || 'K').slice(0,1).toUpperCase()}</span><span className="customer-welcome"><small>WELCOME BACK</small><strong>{customerAccount.name && !String(customerAccount.name).includes('@') ? customerAccount.name : 'Food lover'}</strong></span><span className="account-chevron">⌄</span></button><button className="btn-outline customer-logout" onClick={async () => { await supabase.auth.signOut(); setCustomerAccount(null); saveStore('kp_customer_session', null); setNotice('You have been logged out.'); }}><LogIn size={16} /> Logout</button></> : <button className="btn-outline" onClick={() => setCustomerAuthOpen(true)}><LogIn size={16} /> Login</button>}<button className="btn-outline" onClick={() => { setTrackingOrderId(lastOrderId || trackingOrderId || getStore('kp_last_order_id', '')); setTrackingPhone(''); setTrackingOpen(true); }}>Track order</button><button className="cart-button" onClick={() => storeOpen ? setCheckoutOpen(true) : setNotice('Khante Pinte is currently closed. Please order during our business hours.')}><ShoppingBag size={18} /> <span>Cart</span><b>{cartCount}</b></button><button className="icon-btn mobile-menu" onClick={() => setMenuOpen(!menuOpen)}><MenuIcon /></button></div></header>
      {menuOpen && <div className="mobile-nav"><a href="#menu" onClick={() => setMenuOpen(false)}>Menu</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a></div>}
      <main id="top"><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="dot-live" style={{ background: storeOpen ? '#16a34a' : '#dc2626' }} /> {storeOpen ? 'WE ARE OPEN' : 'CURRENTLY CLOSED'} · {formatTime12(storeHours.open_time)} — {formatTime12(storeHours.close_time)}</div><h1>Late night.<br /><em>Great bites.</em></h1><p>When hunger doesn't sleep, neither do we. Fresh food, bold flavours, delivered to your door in Biratnagar.</p><div className="hero-cta"><a className="btn-primary" href="#menu">Explore menu <ChevronRight /></a><span><Clock3 size={16} /> Night delivery</span></div><div className="hero-meta"><span><MapPin size={15} /> Biratnagar</span><span><Phone size={15} /> 9849073408</span></div></div><div className="hero-art"><div className="hero-orbit orbit-1" /><div className="hero-orbit orbit-2" /><div className="hero-food">🍜</div><div className="hero-sticker sticker-top">OPEN<br /><b>{formatTime12(storeHours.open_time)}</b></div><div className="hero-sticker sticker-bottom"><b>{formatTime12(storeHours.close_time)}</b><br />CLOSING</div><div className="hero-art-caption">NIGHT CRAVINGS<br /><strong>MADE RIGHT.</strong></div></div></section>
        <section className="benefits"><div><Clock3 /><span><strong>Night service</strong><small>{formatTime12(storeHours.open_time)} – {formatTime12(storeHours.close_time)}</small></span></div><div><Bike /><span><strong>Delivery</strong><small>Biratnagar</small></span></div><div><Wallet /><span><strong>Easy payment</strong><small>Cash on delivery</small></span></div><div><Phone /><span><strong>Call to order</strong><small>9849073408</small></span></div></section>
        <section id="menu" className="menu-section"><div className="section-heading"><div><span className="eyebrow">THE MENU</span><h2>What are you <em>craving?</em></h2><p>Find your favourites and let the night get delicious.</p><div className="menu-count-badge"><span className="menu-count-icon">✦</span><span className="menu-count-number">{products.length}</span><span className="menu-count-copy"><strong>delicious choices</strong><small>and counting on your cravings</small></span><span className="menu-count-sparkle">✧</span></div></div><div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search the menu..." /></div></div><div className="category-row">{dbCategories.map(c => <button key={c} className={category === c ? 'category-active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div><div className="food-grid">{filtered.map(p => <FoodCard key={p.id} product={p} onAdd={() => add(p)} onOpen={() => setSelectedProduct(p)} cartQty={cart.find(x => x.id === p.id)?.qty || 0} />)}</div>{!filtered.length && <div className="empty-state">No menu items found. Try another search.</div>}</section>
        <section id="about" className={`about-strip ${brandLogo ? 'about-strip-branded' : ''}`}>{brandLogo && <img className="kp-about-logo" src={brandLogo} alt="Khante Pinte logo" />}<div><span className="eyebrow">OUR PROMISE</span><h2>Good food.<br />No <em>compromise.</em></h2></div><p>Khante Pinte is here for those late-night moments. Whether it's a quick snack, a full meal or something to share with friends, we're bringing flavour to your night.</p><div className="about-icon">🌙</div></section>
        <footer id="contact" className="footer kp-footer"><div className="footer-brand">{brandLogo ? <img className="kp-footer-logo" src={brandLogo} alt="Khante Pinte logo" /> : <span className="brand-mark">KP</span>}<div><strong>KHANTE PINTE</strong><small>Late night cravings, sorted.</small><p>Good food, comforting flavours and late-night happiness — serving Biratnagar with fresh, satisfying bites when cravings strike.</p></div></div><div className="footer-column"><strong>ABOUT US</strong><p>Khante Pinte is your neighbourhood food stop for delicious meals, snacks and late-night cravings. We believe good food brings people together, whether you are ordering for yourself, your family or someone special.</p></div><div className="footer-column"><strong>VISIT & CONTACT</strong><p><MapPin size={14}/> Buspark, Biratnagar, Nepal</p><p><Clock3 size={14}/> {formatTime12(storeHours.open_time)} – {formatTime12(storeHours.close_time)} (NPT)</p><a href="tel:9849073408"><Phone size={14}/> 9849073408</a><a href="https://wa.me/9849073408" target="_blank" rel="noreferrer">WhatsApp 9849073408 (Primary)</a><a href="https://wa.me/9822551213" target="_blank" rel="noreferrer">WhatsApp 9822551213</a><a href="https://wa.me/9764463286" target="_blank" rel="noreferrer">WhatsApp 9764463286</a><a href="https://wa.me/9709027043" target="_blank" rel="noreferrer">WhatsApp 9709027043</a></div><div className="footer-column"><strong>FOLLOW OUR FOOD JOURNEY</strong><a href="https://www.instagram.com/khantepinte.biratnagar?utm_source=ig_web_button_share_sheet&dmpr=ZDNlZDc0MzIxNw==" target="_blank" rel="noreferrer"><Instagram size={16} aria-hidden="true"/> Instagram</a><a href="https://www.facebook.com/KhantePinte.biratnagar/" target="_blank" rel="noreferrer"><Facebook size={16} aria-hidden="true"/> Facebook</a><small>Follow us for updates, offers and delicious moments.</small></div><div className="footer-bottom">© {new Date().getFullYear()} Khante Pinte. All rights reserved. <span>Made for late-night cravings. ♥</span></div></footer></main>
      {storeStatusLoaded && !storeOpen && !closedNoticeDismissed && <div className="modal-backdrop" style={{ position:'fixed', inset:0, zIndex:12000, background:'rgba(12,18,28,.72)', backdropFilter:'blur(5px)', display:'grid', placeItems:'center', padding:20 }}>
        <div role="dialog" aria-modal="true" aria-labelledby="closed-store-title" style={{ width:'min(470px,100%)', background:'#fff', borderRadius:24, padding:'32px 28px', textAlign:'center', boxShadow:'0 28px 90px rgba(0,0,0,.3)' }}>
          <div style={{ width:76, height:76, borderRadius:24, margin:'0 auto 18px', display:'grid', placeItems:'center', background:'#fff1e8', fontSize:38 }}>🌙</div>
          <div style={{ fontSize:12, letterSpacing:2, fontWeight:800, color:'#d97706', marginBottom:10 }}>A LITTLE BREAK BEFORE THE NEXT BITE</div>
          <h2 id="closed-store-title" style={{ fontSize:28, lineHeight:1.15, margin:'0 0 12px', color:'#182230' }}>We’re closed for now.</h2>
          <p style={{ color:'#667085', lineHeight:1.65, margin:'0 0 18px' }}>Our kitchen is taking a short rest, but the cravings don’t have to wait too long. We’ll be back and cooking fresh for you at <strong>{formatTime12(storeHours.open_time)}</strong>.</p>
          <div style={{ border:'1px solid #f0e2d5', background:'#fffaf5', borderRadius:14, padding:14, marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:1.2, color:'#98a2b3' }}>OUR DAILY HOURS</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#202939', marginTop:5 }}>{formatTime12(storeHours.open_time)} – {formatTime12(storeHours.close_time)}</div>
            <div style={{ fontSize:12, color:'#667085', marginTop:5 }}>Nepal time (NPT)</div>
          </div>
          <p style={{ color:'#667085', fontSize:13, margin:'0 0 20px' }}>Feel free to explore the menu while we get ready. Online ordering will open right on time. Thanks for keeping your late-night cravings with Khante Pinte! ❤️</p>
          <button className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:14 }} onClick={() => { setClosedNoticeDismissed(true); document.getElementById('menu')?.scrollIntoView({ behavior:'smooth' }); }}>Explore the menu</button>
          <button className="btn-outline" style={{ width:'100%', justifyContent:'center', marginTop:10 }} onClick={() => setClosedNoticeDismissed(true)}>Got it</button>
        </div>
      </div>}
      {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={() => { add(selectedProduct); }} account={customerAccount} onSignUp={() => { setSelectedProduct(null); setCustomerAuthMode('signup'); setCustomerAuthOpen(true); }} />}
      {customerAuthOpen && <CustomerAuth onGoogle={async () => { const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); if (error) setNotice(`Google sign-in failed: ${error.message}`); }} mode={customerAuthMode} setMode={setCustomerAuthMode} onClose={() => setCustomerAuthOpen(false)} onAuth={account => { setCustomerAccount(account); saveStore('kp_customer_session', account); setCustomerAuthOpen(false); setNotice(`Welcome to Khante Pinte, ${account.name}! Your account is ready.`); }} />}{accountOpen && customerAccount && <CustomerAccountPanel account={customerAccount} onClose={() => setAccountOpen(false)} onUpdated={updates => setCustomerAccount(current => ({ ...current, ...updates }))} />}{trackingOpen && <OrderTracking orderId={trackingOrderId} phone={trackingPhone} account={customerAccount} onClose={() => setTrackingOpen(false)} onLookup={(id, ph) => { setTrackingOrderId(id); setTrackingPhone(ph); }} />}{checkoutOpen && <Checkout account={customerAccount} cart={cart} subtotal={cartSubtotal} delivery={delivery} paymentMethods={paymentMethods} discount={voucherDiscount} total={total} voucher={voucherInput} setVoucher={setVoucherInput} applyVoucher={applyVoucher} applied={appliedVoucher} onChangeQty={changeQty} onRemoveItem={removeCartItem} onClose={() => setCheckoutOpen(false)} onSubmit={submitCheckout} />}
    </> : <AdminShell section={adminSection} setSection={setAdminSection} orders={orders} ordersLoading={ordersLoading} ordersError={ordersError} refreshOrders={() => loadOrders(true)} products={products} setProducts={setProducts} riders={riders} setRiders={setRiders} vouchers={vouchers} setVouchers={setVouchers} stats={stats} newOrder={newOrder} changeStatus={changeStatus} assignRider={assignRider} cancelOrder={cancelOrder} changePaymentStatus={changePaymentStatus} paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} deliveryFee={deliveryFee} setDeliveryFee={setDeliveryFee} storeHours={storeHours} setStoreHours={setStoreHours} storeManualStatus={storeManualStatus} setStoreManualStatus={setStoreManualStatus} storeOpen={storeOpen} setStoreOpen={setStoreOpen} notifications={notifications} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} onClearNotifications={() => setNotifications([])} newOrderAlert={newOrderAlert} onDismissNewOrderAlert={() => setNewOrderAlert(null)} onCustomer={() => { window.location.href = window.location.hostname.startsWith('admin.') ? 'https://khantepinte.com.np/' : '/'; }} onLogout={logoutAdmin} brandLogo={brandLogo} setBrandLogo={setBrandLogo} />}
    {cancelTarget && <div className="modal-backdrop" style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(0,0,0,.48)', display:'grid', placeItems:'center', padding:20 }}>
      <div className="panel" style={{ width:'min(480px,100%)', padding:24, background:'#fff', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <h2 style={{ marginTop:0 }}>Cancel order {cancelTarget.id}?</h2>
        <p style={{ color:'#667085' }}>This order will be moved to the Cancelled Orders page. You can optionally tell the customer why it was cancelled.</p>
        <label style={{ display:'block', fontWeight:600, marginBottom:8 }}>Cancellation reason (optional)</label>
        <textarea rows={4} value={cancelReasonInput} onChange={e=>setCancelReasonInput(e.target.value)} placeholder="e.g. Item unavailable, customer requested cancellation…" style={{ width:'100%', boxSizing:'border-box', padding:12, border:'1px solid #ddd', borderRadius:10, resize:'vertical' }} />
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:18 }}>
          <button className="btn-outline" onClick={()=>{setCancelTarget(null);setCancelReasonInput('');}} disabled={cancelSaving}>Keep order</button>
          <button className="danger-btn" onClick={confirmCancelOrder} disabled={cancelSaving}>{cancelSaving?'Cancelling…':'Confirm cancellation'}</button>
        </div>
      </div>
    </div>}
    {notice && <div className="toast"><span>{notice}</span><button onClick={() => setNotice('')}><X size={15} /></button></div>}
  </div>
}
function FoodCard({ product: p, onAdd, onOpen, cartQty }) { return <article className={`food-card menu-reveal ${p.outOfStock ? 'sold-out' : ''}`}><button type="button" className="food-card-open" onClick={onOpen} aria-label={`View ${p.name} details`}><div className="food-photo">{p.image_url ? <img className="food-image" src={p.image_url} alt={p.name} loading="lazy" /> : <span className="food-emoji">{p.emoji || '🍽️'}</span>}{p.tag && <span className="food-tag">{p.tag}</span>}{p.outOfStock && <span className="sold-label">SOLD OUT</span>}<span className="food-category">{p.category}</span></div><div className="food-info"><div className="food-title-row"><h3>{p.name}</h3><span className="food-price">{currency(p.price)}</span></div><p>{p.description || 'Tap to see item details, photos and customer reviews.'}</p><span className="food-view-hint">View details & reviews ↗</span></div></button><div className="food-add-wrap"><button className={`add-btn ${cartQty ? 'added' : ''}`} disabled={p.outOfStock} onClick={onAdd}>{p.outOfStock ? 'Unavailable' : cartQty ? `Add more · ${cartQty} in cart` : 'Add to order'}<Plus size={16} /></button></div></article> }

function ProductDetailModal({ product, onClose, onAdd, account, onSignUp }) {
 const [reviews,setReviews]=useState([]); const [loading,setLoading]=useState(true); const [rating,setRating]=useState(5); const [reviewText,setReviewText]=useState(''); const [message,setMessage]=useState(''); const [saving,setSaving]=useState(false); const [signedIn,setSignedIn]=useState(false); const [userId,setUserId]=useState(''); const [customerName,setCustomerName]=useState(account?.name||'');
 const loadReviews=async()=>{setLoading(true); const {data,error}=await supabase.from('menu_item_reviews').select('id,user_id,customer_name,rating,review,created_at').eq('menu_item_id',product.id).order('created_at',{ascending:false}); if(error) setMessage(`Could not load reviews: ${error.message}`); else setReviews(data||[]); setLoading(false);};
 useEffect(()=>{let live=true; supabase.auth.getUser().then(({data})=>{if(!live)return;setSignedIn(!!data.user);setUserId(data.user?.id||'');}); loadReviews(); return()=>{live=false;};},[product.id]);
 const submitReview=async()=>{setMessage(''); if(!signedIn){setMessage('Create an account or log in to write a review.');return;} if(reviewText.trim().length<3){setMessage('Please write at least 3 characters.');return;} setSaving(true); const {data:profile}=await supabase.from('customers').select('name').eq('auth_user_id',userId).maybeSingle(); const {error}=await supabase.from('menu_item_reviews').upsert({menu_item_id:product.id,user_id:userId,customer_name:profile?.name||account?.name||customerName||'Khante Pinte customer',rating,review:reviewText.trim(),updated_at:new Date().toISOString()},{onConflict:'menu_item_id,user_id'}); if(error)setMessage(error.message); else {setReviewText('');setMessage('Thank you! Your review has been saved.');await loadReviews();} setSaving(false);};
 const avg=reviews.length?(reviews.reduce((n,r)=>n+r.rating,0)/reviews.length).toFixed(1):'—';
 return <div className="modal-backdrop product-detail-backdrop" onClick={onClose}><section className="product-detail-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><header className="product-detail-head"><strong>Food details</strong><button className="icon-btn" onClick={onClose}><X/></button></header><div className="product-detail-scroll"><div className="product-detail-photo">{product.image_url?<img src={product.image_url} alt={product.name}/>:<span>{product.emoji||'🍽️'}</span>}</div><div className="product-detail-info"><span className="eyebrow">{product.category}</span><h2>{product.name}</h2><strong className="product-detail-price">{currency(product.price)}</strong><p>{product.description||'Freshly prepared by Khante Pinte.'}</p><button className="btn-primary" disabled={product.outOfStock} onClick={onAdd}>{product.outOfStock?'Currently unavailable':'Add to order'} <Plus size={16}/></button></div><section className="product-reviews"><div className="reviews-heading"><div><span className="eyebrow">CUSTOMER FEEDBACK</span><h3>Reviews & ratings</h3></div><strong>★ {avg} <small>({reviews.length})</small></strong></div>{loading?<p>Loading reviews…</p>:reviews.length?reviews.map(r=><article className="review-item" key={r.id}><div><strong>{r.customer_name}</strong><span>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span></div><p>{r.review}</p><small>{new Date(r.created_at).toLocaleDateString('en-NP')}</small></article>):<p className="review-empty">No reviews yet. Be the first to share your experience.</p>}<div className="write-review-box"><h4>Write your review</h4>{signedIn?<><label>Rating<select value={rating} onChange={e=>setRating(Number(e.target.value))}><option value={5}>★★★★★ — Excellent</option><option value={4}>★★★★☆ — Very good</option><option value={3}>★★★☆☆ — Good</option><option value={2}>★★☆☆☆ — Fair</option><option value={1}>★☆☆☆☆ — Poor</option></select></label><textarea value={reviewText} onChange={e=>setReviewText(e.target.value)} rows={4} maxLength={1200} placeholder="Tell others what you thought…"/><button className="btn-primary" disabled={saving} onClick={submitReview}>{saving?'Submitting…':'Submit review'}</button></>:<><p>Reviews are open to everyone, but you need a customer account to write one.</p><button className="btn-primary" onClick={onSignUp}>Sign up to write a review</button><button className="btn-outline" onClick={()=>{onClose();}}>Maybe later</button></>}{message&&<p className="review-message">{message}</p>}</div></section></div></section></div>;
}

function Checkout({
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
  const [newAddress, setNewAddress] = useState('');
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
      const { data: profile, error: profileError } = await supabase.from('customers')
        .select('id,name,phone').eq('auth_user_id', user.id).maybeSingle();
      if (!active) return;
      if (profileError) { setError(`Could not load your saved details: ${profileError.message}`); setLoadingAccountDetails(false); return; }
      if (profile) {
        setCustomerProfileId(profile.id);
        setName(profile.name || account?.name || '');
        setPhone(profile.phone || account?.phone || '');
        const { data: addressRows, error: addressError } = await supabase.from('customer_addresses')
          .select('id,label,address,is_default').eq('customer_id', profile.id)
          .order('is_default', { ascending: false }).order('created_at', { ascending: false });
        if (!active) return;
        if (addressError) setError(`Could not load saved addresses: ${addressError.message}`);
        else {
          setSavedAddresses(addressRows || []);
          const preferred = (addressRows || []).find(item => item.is_default) || (addressRows || [])[0];
          if (preferred) { setSelectedAddressId(preferred.id); setAddress(preferred.address); }
        }
      }
      setLoadingAccountDetails(false);
    };
    loadCustomerCheckoutDetails();
    return () => { active = false; };
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
    if (!orderName.trim()) validationErrors.push(isGift ? 'Please enter the recipient’s name.' : 'Please enter your name.');
    if (!phoneDigits) validationErrors.push(isGift ? 'Please enter the recipient’s phone number.' : 'Please enter your phone number.');
    else if (phoneDigits.length !== 10) validationErrors.push('Phone number must be exactly 10 digits.');
    if (useAlternateContact && callbackDigits.length !== 10) validationErrors.push('The alternate contact number must be exactly 10 digits.');
    if (type === 'Delivery' && !orderAddress.trim()) validationErrors.push('Please enter your delivery address.');
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
      const callbackPhone = useAlternateContact ? callbackDigits : (account?.userId ? String(account.phone || phone).replace(/\D/g, '') : phoneDigits);
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
      if (!isGift && type === 'Delivery' && saveNewAddress && selectedAddressId === 'new' && customerProfileId && orderAddress.trim()) {
        const { data: savedAddress, error: saveAddressError } = await supabase.from('customer_addresses')
          .insert({ customer_id: customerProfileId, label: 'Saved from checkout', address: orderAddress.trim(), is_default: savedAddresses.length === 0 })
          .select('id,label,address,is_default').single();
        if (!saveAddressError && savedAddress) setSavedAddresses(current => [savedAddress, ...current]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="checkout-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">CHECKOUT</span>
            <h2>Your order</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="checkout-scroll">
          <div className="checkout-items">
            {cart.map(x => (
              <div className="checkout-item" key={x.id} style={{ display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto', alignItems: 'center', gap: 10 }}>
                <span>{x.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <strong>{x.name}</strong>
                  <small>{currency(x.price)} each</small>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                    <button type="button" aria-label={`Decrease ${x.name} quantity`} onClick={() => onChangeQty(x.id, -1)} style={{ width: 30, height: 30, border: '1px solid #e4e7ec', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>−</button>
                    <strong style={{ minWidth: 18, textAlign: 'center', fontSize: 13 }}>{x.qty}</strong>
                    <button type="button" aria-label={`Increase ${x.name} quantity`} onClick={() => onChangeQty(x.id, 1)} disabled={x.outOfStock} style={{ width: 30, height: 30, border: '1px solid #e4e7ec', borderRadius: 8, background: '#fff', cursor: x.outOfStock ? 'not-allowed' : 'pointer', fontSize: 18, lineHeight: 1, opacity: x.outOfStock ? .45 : 1 }}>+</button>
                    <button type="button" onClick={() => onRemoveItem(x.id)} style={{ marginLeft: 5, border: 0, background: 'transparent', color: '#b42318', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
                  </div>
                </div>
                <b style={{ whiteSpace: 'nowrap' }}>{currency(x.qty * x.price)}</b>
              </div>
            ))}
            {!cart.length && <div style={{ padding: 20, textAlign: 'center', color: '#667085' }}>Your cart is empty. Close this window and add some food from the menu.</div>}
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

          {account?.userId && <div className="checkout-account-banner"><span>✓</span><div><strong>Welcome back, {account.name && !String(account.name).includes('@') ? account.name : 'there'}!</strong><small>{loadingAccountDetails ? 'Loading your saved details…' : 'Your account details are filled in automatically.'}</small></div></div>}
          <div className="checkout-gift-toggle"><label><input type="checkbox" checked={isGift} onChange={e => setIsGift(e.target.checked)} /> <span><strong>Is this order a gift for someone?</strong><small>We’ll deliver it to the person you choose.</small></span></label></div>
          {!isGift ? <div className="form-grid">
            <label>Customer name<input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>
            <label>Account phone number<input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))} placeholder="98XXXXXXXX" inputMode="numeric" type="tel" maxLength={10} /></label>
          </div> : <div className="gift-recipient-panel"><div className="gift-heading">🎁 <div><strong>Who should receive this gift?</strong><small>These details will be used for delivery.</small></div></div><div className="form-grid"><label>Recipient’s name<input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Full name" /></label><label>Recipient’s phone number<input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0,10))} placeholder="98XXXXXXXX" inputMode="numeric" type="tel" maxLength={10} /></label></div></div>}
          {account?.userId && <div className="checkout-alternate-contact"><label><input type="checkbox" checked={useAlternateContact} onChange={e => setUseAlternateContact(e.target.checked)} /><span><strong>Call me on a different number</strong><small>Optional — otherwise we’ll use your account phone number.</small></span></label>{useAlternateContact && <input value={alternateContact} onChange={e => setAlternateContact(e.target.value.replace(/\D/g, '').slice(0,10))} placeholder="Alternative 10-digit phone number" inputMode="numeric" type="tel" maxLength={10} />}</div>}

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
            <div className="checkout-address-panel"><label className="full-label">{isGift ? 'Recipient’s delivery address' : 'Delivery address'}
              {isGift ? <textarea rows="3" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} placeholder="Recipient’s area, street, house and nearby landmark…" /> : <>
                {account?.userId && savedAddresses.length > 0 && <select value={selectedAddressId} onChange={e => { setSelectedAddressId(e.target.value); const selected = savedAddresses.find(item => item.id === e.target.value); if (selected) setAddress(selected.address); else setAddress(''); }}><option value="new">＋ Add a new delivery location</option>{savedAddresses.map(item => <option key={item.id} value={item.id}>{item.label}{item.is_default ? ' · Default' : ''} — {item.address.slice(0,55)}</option>)}</select>}
                {(selectedAddressId === 'new' || !account?.userId || !savedAddresses.length) && <><textarea rows="3" value={address} onChange={e => { setAddress(e.target.value); setSelectedAddressId('new'); }} placeholder="Area, street, landmark, house..." />{account?.userId && <label className="checkout-save-address"><input type="checkbox" checked={saveNewAddress} onChange={e => setSaveNewAddress(e.target.checked)} /> Save this location to my account for next time</label>}</>}
              </>}
            </label></div>
          )}

          <label className="full-label">
            Payment method
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              {(paymentMethods || []).filter(method => method.enabled).map(method => <option key={method.code} value={method.code}>{method.name}</option>)}
            </select>
          </label>
          {paymentMethods?.find(method => method.code === paymentMethod && method.enabled)?.qr_image_url && (
            <div className="panel" style={{ padding: 14, marginTop: 10, textAlign: 'center' }}>
              <strong>{paymentMethods.find(method => method.code === paymentMethod && method.enabled).name} QR</strong>
              <img src={paymentMethods.find(method => method.code === paymentMethod).qr_image_url} alt={`${paymentMethod} payment QR`} style={{ display: 'block', width: 190, maxWidth: '100%', margin: '12px auto', borderRadius: 10 }} />
              <p style={{ fontSize: 13, color: '#667085' }}>{paymentMethods.find(method => method.code === paymentMethod && method.enabled).instructions || 'Scan the QR code to pay.'}</p>
            </div>
          )}

          {paymentMethods?.find(method => method.code === paymentMethod)?.requires_proof && (
            <label className="full-label">
              Payment screenshot <span style={{ color: '#b42318' }}>* Required</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" required onChange={e => setPaymentProof(e.target.files?.[0] || null)} />
              <small style={{ color: '#667085' }}>Upload your payment confirmation screenshot (PNG, JPG or WebP, max 5 MB). Your order remains Unpaid until the owner verifies it.</small>
            </label>
          )}
          {!paymentMethods?.find(method => method.code === paymentMethod)?.requires_proof && (
            <p style={{ fontSize: 13, color: '#667085' }}>No payment screenshot is needed for this payment method.</p>
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
                {currency(subtotal - discount +
                  (type === 'Delivery' ? delivery : 0))}
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


function CustomerAccountPanel({ account, onClose, onUpdated }) {
  const [profile, setProfile] = useState({ id: '', name: account.name || '', phone: account.phone || '', email: account.email || '', avatar_url: account.avatarUrl || '' });
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [addressText, setAddressText] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    let live = true;
    const load = async () => {
      setLoading(true); setError('');
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { if (live) { setError('Please log in again to view your account.'); setLoading(false); } return; }
      const meta = user.user_metadata || {};
      const { data: customer, error: customerError } = await supabase.from('customers')
        .upsert({ auth_user_id: user.id, name: profile.name || meta.full_name || user.email, phone: profile.phone || meta.phone || '' }, { onConflict: 'auth_user_id' })
        .select('id,name,phone,avatar_url').single();
      if (customerError) { if (live) { setError(customerError.message); setLoading(false); } return; }
      if (!live) return;
      setProfile({ id: customer.id, name: customer.name || '', phone: customer.phone || '', email: user.email || '', avatar_url: customer.avatar_url || '' });
      onUpdated({ name: customer.name || '', phone: customer.phone || '', email: user.email || '', userId: user.id, avatarUrl: customer.avatar_url || '' });
      const [addressResult, orderResult] = await Promise.all([
        supabase.from('customer_addresses').select('id,label,address,is_default,created_at').eq('customer_id', customer.id).order('is_default', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('orders').select('id,order_number,status,total,created_at,order_type,order_items(item_name,quantity,unit_price)').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(30)
      ]);
      if (!live) return;
      if (addressResult.error) setError(addressResult.error.message);
      else setAddresses(addressResult.data || []);
      if (orderResult.error) setError(orderResult.error.message);
      else setOrders(orderResult.data || []);
      setLoading(false);
    };
    load();
    return () => { live = false; };
  }, []);

  const saveProfile = async () => {
    setError(''); setMessage('');
    const digits = profile.phone.replace(/\D/g, '');
    if (!profile.name.trim()) { setError('Please enter your name.'); return; }
    if (digits.length !== 10) { setError('Phone number must be exactly 10 digits.'); return; }
    setSaving(true);
    const { error: updateError } = await supabase.from('customers').update({ name: profile.name.trim(), phone: digits }).eq('id', profile.id);
    if (!updateError) {
      const { error: metaError } = await supabase.auth.updateUser({ data: { full_name: profile.name.trim(), phone: digits } });
      if (metaError) setError(`Profile saved, but account details could not sync: ${metaError.message}`);
      else setMessage('Your profile has been updated.');
      onUpdated({ name: profile.name.trim(), phone: digits });
    } else setError(updateError.message);
    setSaving(false);
  };

  const uploadAvatar = async file => {
    if (!file) return;
    setError(''); setMessage('');
    const mimeToExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const ext = mimeToExt[file.type];
    if (!ext) { setError('Please choose a JPG, PNG or WEBP image. If your phone uses HEIC, save or export it as JPG first.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Your profile picture must be smaller than 5 MB.'); return; }
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) throw new Error('Your login session has expired. Please log in again and retry.');
      if (!profile.id) throw new Error('Your customer profile is still loading. Please wait a moment and retry.');
      const path = `${authData.user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('customer-avatars').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('customer-avatars').getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      const { error: saveError } = await supabase.from('customers').update({ avatar_url: avatarUrl }).eq('id', profile.id);
      if (saveError) throw saveError;
      setProfile(p => ({ ...p, avatar_url: avatarUrl }));
      onUpdated({ avatarUrl });
      setMessage('Profile picture updated successfully.');
    } catch (uploadProblem) {
      setError(uploadProblem?.message || 'Could not upload your photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addAddress = async () => {
    setError(''); setMessage('');
    if (!addressText.trim()) { setError('Please enter your address.'); return; }
    setSaving(true);
    if (!addresses.length) await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', profile.id);
    const { data, error: addError } = await supabase.from('customer_addresses').insert({ customer_id: profile.id, label: addressLabel.trim() || 'Other', address: addressText.trim(), is_default: addresses.length === 0 }).select('id,label,address,is_default,created_at').single();
    if (addError) setError(addError.message);
    else { setAddresses(current => [data, ...current]); setAddressText(''); setMessage('Address saved successfully.'); }
    setSaving(false);
  };
  const makeDefault = async id => {
    setSaving(true); setError('');
    const { error: clearError } = await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', profile.id);
    const { error: setErrorDb } = clearError ? { error: clearError } : await supabase.from('customer_addresses').update({ is_default: true }).eq('id', id).eq('customer_id', profile.id);
    if (setErrorDb) setError(setErrorDb.message);
    else setAddresses(current => current.map(a => ({ ...a, is_default: a.id === id })));
    setSaving(false);
  };
  const deleteAddress = async id => {
    const { error: deleteError } = await supabase.from('customer_addresses').delete().eq('id', id).eq('customer_id', profile.id);
    if (deleteError) setError(deleteError.message);
    else setAddresses(current => current.filter(a => a.id !== id));
  };
  const updatePassword = async () => {
    setError(''); setMessage('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSaving(true); const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    if (passwordError) setError(passwordError.message); else { setNewPassword(''); setMessage('Password changed successfully.'); }
    setSaving(false);
  };

  return <div className="account-backdrop" onClick={onClose}>
    <section className="customer-account-panel" role="dialog" aria-modal="true" aria-label="Your Khante Pinte account" onClick={e => e.stopPropagation()}>
      <header className="account-panel-head"><div><span className="eyebrow">KHANTE PINTE / MY ACCOUNT</span><h2>Your little corner.</h2></div><button className="icon-btn" onClick={onClose}><X /></button></header>
      <div className="account-profile-hero"><div className="account-avatar-large">{profile.avatar_url ? <img src={profile.avatar_url} alt="Your profile" /> : (profile.name || 'K').slice(0,1).toUpperCase()}</div><div><span className="account-welcome-label">GOOD TO SEE YOU AGAIN</span><h3>Welcome, {profile.name || (account.name && !String(account.name).includes('@') ? account.name : 'Food lover')}!</h3><p>Your cravings, your orders, all in one place.</p></div><label className="avatar-upload-btn">Change photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => uploadAvatar(e.target.files?.[0])} /></label></div>
      <nav className="account-tabs">{[['overview','Overview'],['orders','Order history'],['addresses','Saved addresses'],['settings','Settings']].map(([id,label]) => <button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
      <div className="account-panel-body">
        {loading ? <div className="account-loading">Getting your account ready…</div> : <>
          {tab==='overview' && <><div className="account-stats"><div><strong>{orders.length}</strong><small>Recent orders</small></div><div><strong>{addresses.length}</strong><small>Saved addresses</small></div><div><strong>{orders.filter(o=>o.status==='delivered').length}</strong><small>Delivered</small></div></div><div className="account-section-card account-recent-orders"><div className="account-card-heading"><div><h3>Recent orders</h3><p>Your latest Khante Pinte orders at a glance.</p></div><button className="account-view-all" onClick={() => setTab('orders')}>View all orders <span>→</span></button></div>{orders.slice(0,3).length ? orders.slice(0,3).map(o=><div className="account-order-row" key={o.id}><div><strong>KP-{o.order_number}</strong><small>{new Date(o.created_at).toLocaleDateString('en-NP')} · {(o.order_items||[]).reduce((n,i)=>n+Number(i.quantity),0)} items</small></div><span className={`account-status status-${String(o.status).replaceAll('_','-')}`}>{String(o.status).replaceAll('_',' ')}</span><b>{currency(o.total)}</b></div>) : <p className="account-muted">Your first delicious order is waiting to happen.</p>}</div></>}
          {tab==='orders' && <div className="account-section-card account-history-card"><div className="account-card-heading"><div><h3>Your order history</h3><p>{orders.length} recent orders associated with this account</p></div><span className="account-history-count">{orders.length}</span></div>{orders.length ? orders.map(o=><div className="account-order-full" key={o.id}><div className="account-order-row"><div><strong>KP-{o.order_number}</strong><small>{new Date(o.created_at).toLocaleString('en-NP')} · {o.order_type}</small></div><span className={`account-status status-${String(o.status).replaceAll('_','-')}`}>{String(o.status).replaceAll('_',' ')}</span><b>{currency(o.total)}</b></div><p>{(o.order_items||[]).map(i=>`${i.quantity} × ${i.item_name}`).join(' · ')}</p></div>) : <p className="account-muted">No orders yet. Your next favourite meal is just around the corner.</p>}</div>}
          {tab==='addresses' && <><div className="account-section-card"><h3>Saved delivery spots</h3>{addresses.map(a=><div className="saved-address-row" key={a.id}><div><strong>{a.label} {a.is_default && <span className="default-address-tag">DEFAULT</span>}</strong><p>{a.address}</p></div><div>{!a.is_default && <button className="text-link" onClick={()=>makeDefault(a.id)}>Make default</button>}<button className="text-link danger-link" onClick={()=>deleteAddress(a.id)}>Remove</button></div></div>)}{!addresses.length && <p className="account-muted">Save your home, work or favourite delivery address for quicker checkout.</p>}</div><div className="account-section-card"><h3>Add a new address</h3><label>Label<input value={addressLabel} onChange={e=>setAddressLabel(e.target.value)} placeholder="Home, Work…" /></label><label>Full address<textarea value={addressText} onChange={e=>setAddressText(e.target.value)} rows={3} placeholder="House, street, area and nearby landmark" /></label><button className="btn-primary" disabled={saving} onClick={addAddress}>Save address</button></div></>}
          {tab==='settings' && <><div className="account-section-card"><h3>Personal details</h3><label>Full name<input value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} /></label><label>Phone number<input value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value.replace(/\D/g,'').slice(0,10)}))} inputMode="numeric" maxLength={10} /></label><label>Email address<input value={profile.email} disabled /></label><button className="btn-primary" disabled={saving} onClick={saveProfile}>Save changes</button></div><div className="account-section-card"><h3>Change password</h3><label>New password<input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 6 characters" /></label><button className="btn-outline" disabled={saving} onClick={updatePassword}>Update password</button></div><button className="account-signout" onClick={async()=>{await supabase.auth.signOut();onClose();}}>Log out of Khante Pinte</button></>}
          {error && <p className="form-error account-message">{error}</p>}{message && <p className="form-success account-message">{message}</p>}
        </>}
      </div>
    </section>
  </div>;
}

function CustomerAuth({ mode, setMode, onClose, onAuth, onGoogle }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const requestCustomerReset = async () => {
    setError('');
    setSuccess('');
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (resetError) throw resetError;
      setSuccess('If this email has an account, a password reset link has been sent. Check your inbox and spam folder.');
    } catch (resetError) { setError(resetError.message || 'Could not send the reset email.'); }
    finally { setLoading(false); }
  };

  const submit = async () => {
    setError('');
    setSuccess('');
    if (!email.trim() || !password || (mode === 'signup' && (!name.trim() || !phone.trim()))) {
      setError(mode === 'signup' ? 'Please complete all fields.' : 'Enter your email and password.');
      return;
    }
    if (mode === 'signup' && phone.replace(/\D/g, '').length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim(), phone: phone.trim(), account_type: 'customer' } }
        });
        if (authError) throw authError;
        if (data.session) {
          onAuth({ name: name.trim(), email: email.trim(), phone: phone.trim(), userId: data.user?.id, avatarUrl: '' });
        } else {
          setSuccess('Account created. Check your email to confirm your account, then log in.');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (authError) throw authError;
        const metadata = data.user?.user_metadata || {};
        onAuth({
          name: metadata.full_name || metadata.name || 'Food lover',
          email: data.user?.email || email.trim(),
          phone: metadata.phone || '',
          userId: data.user?.id,
          avatarUrl: metadata.avatar_url || ''
        });
      }
    } catch (authError) {
      const message = authError.message || 'Could not complete sign in.';
      setError(message.toLowerCase().includes('invalid login credentials') ? 'Incorrect email or password.' : message);
    } finally {
      setLoading(false);
    }
  };

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="checkout-modal auth-modal" onClick={e => e.stopPropagation()}>
      <div className="modal-head">
        <div><span className="eyebrow">CUSTOMER ACCOUNT</span><h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2></div>
        <button className="icon-btn" onClick={onClose}><X /></button>
      </div>
      <div className="checkout-scroll">
        <label>Email address<input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" /></label>
        {!forgotMode && mode === 'signup' && <>
          <label>Full name<input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>
          <label>Phone number<input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} placeholder="10-digit phone number" /></label>
        </>}
        {!forgotMode && <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="At least 6 characters" /></label>}
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        {forgotMode ? <>
          <button className="btn-primary full" onClick={requestCustomerReset} disabled={loading}>{loading ? 'Sending...' : 'Send password reset link'}</button>
          <button className="text-link" onClick={() => { setForgotMode(false); setError(''); setSuccess(''); }}>Back to customer login</button>
        </> : <>
          <button className="btn-primary full" onClick={submit} disabled={loading}>{loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}</button>
          <button className="google-auth-button" onClick={onGoogle}><span className="google-g">G</span> Continue with Google</button>{mode === 'login' && <button className="text-link" onClick={() => { setForgotMode(true); setError(''); setSuccess(''); }}>Forgot password?</button>}
          <p className="guest-note">{mode === 'login' ? 'New here?' : 'Already have an account?'} <button className="text-link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}>{mode === 'login' ? 'Create an account' : 'Login'}</button></p>
          <button className="btn-outline full" onClick={onClose}>Continue as guest</button>
        </>}
        <small className="prototype-note">You can still place an order as a guest. Your account is securely managed by Supabase.</small>
      </div>
    </div>
  </div>;
}
function OrderTracking({ orderId, phone, account, onClose, onLookup }) {
  const [id, setId] = useState(orderId || '');
  const [ph, setPh] = useState(phone || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookupOrder = async (lookupId = id, lookupPhone = ph) => {
    const cleanId = String(lookupId || '').trim().toUpperCase();
    const match = cleanId.match(/^KP-(\d+)$/);
    if (!match || (!account?.userId && !String(lookupPhone || '').trim())) {
      setError(account?.userId ? 'Enter a valid order ID.' : 'Enter a valid order ID and the phone number used at checkout.');
      setOrder(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = account?.userId
        ? await supabase.rpc('get_customer_order_tracking', { p_order_number: Number(match[1]) })
        : await supabase.rpc('get_website_order_tracking', { p_order_number: Number(match[1]), p_customer_phone: String(lookupPhone).trim() });
      if (rpcError) throw rpcError;
      if (!data) {
        setOrder(null);
        setError('We could not find an order matching those details. Check your order ID and phone number.');
        return;
      }
      const mapStatus = {
        pending: 'New', confirmed: 'Confirmed', preparing: 'Preparing',
        ready: 'Ready', out_for_delivery: 'Out for Delivery',
        delivered: 'Delivered', cancelled: 'Cancelled'
      };
      setOrder({
        id: `KP-${data.order_number}`,
        customer: data.customer_name,
        phone: data.customer_phone,
        type: data.order_type === 'pickup' ? 'Pickup' : 'Delivery',
        status: mapStatus[data.status] || 'New',
        subtotal: Number(data.subtotal || 0),
        discount: Number(data.discount || 0),
        delivery: Number(data.delivery_fee || 0),
        cancellationReason: data.cancellation_reason || '',
        total: Number(data.total || 0),
        note: data.notes || '',
        riderName: data.rider_name || '',
        riderPhone: data.rider_phone || '',
        createdAt: data.created_at,
        items: (data.items || []).map((item, index) => ({
          id: `${data.order_number}-${index}`,
          name: item.item_name,
          qty: Number(item.quantity),
          price: Number(item.unit_price)
        })),
        events: (data.history || []).map(event => ({
          status: mapStatus[event.status] || event.status,
          time: event.changed_at
        }))
      });
      onLookup?.(cleanId, String(lookupPhone).trim());
    } catch (lookupError) {
      console.error('Order tracking lookup failed:', lookupError);
      setOrder(null);
      setError(lookupError.message || 'Unable to load tracking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId && (phone || account?.userId)) lookupOrder(orderId, phone);
  }, []);

  const steps = [
    { label: 'Order received', status: 'New', detail: 'We have received your order.' },
    { label: 'Order confirmed', status: 'Confirmed', detail: 'The restaurant has confirmed your order.' },
    { label: 'Preparing your food', status: 'Preparing', detail: 'Your food is being freshly prepared.' },
    { label: 'Ready', status: 'Ready', detail: 'Your order is ready.' },
    ...(order?.type === 'Delivery' ? [{ label: 'Out for delivery', status: 'Out for Delivery', detail: 'Your order is on its way.' }] : []),
    { label: order?.type === 'Pickup' ? 'Picked up' : 'Delivered', status: 'Delivered', detail: order?.type === 'Pickup' ? 'Your order has been picked up. Enjoy!' : 'Your order has been delivered. Enjoy!' }
  ];
  const current = order ? steps.findIndex(step => step.status === order.status) : -1;
  const isCancelled = order?.status === 'Cancelled';
  const currentStep = current >= 0 ? steps[current] : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="checkout-modal tracking-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><span className="eyebrow">ORDER TRACKING</span><h2>Track your order</h2></div>
          <button className="icon-btn" onClick={onClose}><X /></button>
        </div>
        <div className="checkout-scroll">
          <label>Order ID<input value={id} onChange={e => { setId(e.target.value.toUpperCase()); setOrder(null); }} placeholder="KP-1001" /></label>
          {!account?.userId && <label>Phone number<input value={ph} onChange={e => { setPh(e.target.value); setOrder(null); }} inputMode="tel" placeholder="Number used for order" /></label>}{account?.userId && <p className="signed-tracking-note">You're signed in. Your orders are verified securely through your account — no phone number needed.</p>}
          <button className="btn-primary full" onClick={() => lookupOrder()} disabled={loading} style={{ marginTop: 12 }}>
            {loading ? 'Checking order…' : order ? 'Refresh order status' : 'Track order'}
          </button>
          {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}

          {order && (
            <div className="tracking-result" style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div><span className="eyebrow">ORDER NUMBER</span><h3 style={{ margin: '4px 0 0' }}>{order.id}</h3></div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999,
                  padding: '9px 14px', fontWeight: 700, fontSize: 13,
                  color: isCancelled ? '#b42318' : current === steps.length - 1 ? '#067647' : '#175cd3',
                  background: isCancelled ? '#fef3f2' : current === steps.length - 1 ? '#ecfdf3' : '#eff8ff'
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
                  {isCancelled ? 'Cancelled' : order.status === 'Ready' && order.type === 'Pickup' ? 'Ready for pickup' : order.status}
                </span>
              </div>
              <p style={{ margin: '12px 0 18px', color: '#667085', lineHeight: 1.5 }}>
                {isCancelled ? 'This order has been cancelled.' : currentStep?.detail || `Your order status is ${order.status}.`}
              </p>
              {order.riderName && !isCancelled && <div className="tracking-rider-card"><div><strong>🚴 Your delivery rider</strong><span>{order.riderName}</span></div>{order.riderPhone && <a href={`tel:${order.riderPhone}`}>Call rider · {order.riderPhone}</a>}</div>}
              {isCancelled && order.cancellationReason && <div style={{ margin: '0 0 16px', padding: 12, borderRadius: 10, background: '#fef3f2', color: '#b42318' }}><strong>Reason for cancellation</strong><p style={{ margin: '5px 0 0' }}>{order.cancellationReason}</p></div>}
              {!isCancelled && (
                <div style={{ border: '1px solid #eaecf0', borderRadius: 14, padding: '18px 16px', background: '#fff' }}>
                  <h4 style={{ margin: '0 0 18px', fontSize: 15 }}>Order progress</h4>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {steps.map((step, index) => {
                      const done = current >= index;
                      const active = current === index;
                      return (
                        <div key={step.status} style={{ display: 'grid', gridTemplateColumns: '30px 1fr', columnGap: 12, minHeight: index === steps.length - 1 ? 30 : 62 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{
                              width: 27, height: 27, flex: '0 0 27px', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxSizing: 'border-box', fontWeight: 800, fontSize: 13,
                              color: done ? '#fff' : '#98a2b3',
                              background: done ? '#16a34a' : '#fff',
                              border: done ? '2px solid #16a34a' : '2px solid #d0d5dd'
                            }}>{done ? '✓' : index + 1}</span>
                            {index !== steps.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 28, background: current > index ? '#16a34a' : '#e4e7ec' }} />}
                          </div>
                          <div style={{ padding: '3px 0 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: 14, color: done ? '#101828' : '#667085' }}>{step.label}</strong>
                              {active && <span style={{ fontSize: 11, fontWeight: 700, color: '#175cd3', background: '#eff8ff', padding: '3px 8px', borderRadius: 999 }}>CURRENT STATUS</span>}
                            </div>
                            <small style={{ display: 'block', color: '#98a2b3', marginTop: 3 }}>{done ? (active ? 'In progress now' : 'Completed') : 'Waiting'}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 18 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Your items</h4>
                {order.items.map(item => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #eaecf0', fontSize: 13 }}>
                  <span>{item.qty} × {item.name}</span><strong>{currency(item.qty * item.price)}</strong>
                </div>)}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #eaecf0', display: 'grid', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><strong>{currency(order.subtotal)}</strong></div>
                  {order.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><strong>−{currency(order.discount)}</strong></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Delivery charge</span><strong>{currency(order.delivery)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 9, borderTop: '1px solid #eaecf0', fontSize: 16 }}><strong>Grand total</strong><strong>{currency(order.total)}</strong></div>
                </div>
              </div>
              {(order.events || []).length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Status updates</h4>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {(order.events || []).slice().reverse().map((ev, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 11px', background: '#f9fafb', borderRadius: 9 }}>
                        <strong style={{ fontSize: 13 }}>{ev.status}</strong><small style={{ color: '#667085', textAlign: 'right' }}>{new Date(ev.time).toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function AdminLogin({
  email, setEmail, password, setPassword, onLogin, onBack, loading,
  error, setError, forgotMode, setForgotMode, forgotLoading, forgotMessage,
  setForgotMessage, onForgot
}) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark large">KP</div>
        <span className="eyebrow">STAFF ONLY</span>
        <h1>Admin <em>{forgotMode ? 'recovery' : 'login'}</em></h1>
        <p>{forgotMode ? 'We will send a password reset link to your admin email.' : 'Sign in to manage orders, kitchen, inventory and sales.'}</p>
        <label>Email<input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); setForgotMessage(''); }} placeholder="Admin email" /></label>
        {!forgotMode && <label>Password<input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && onLogin()} placeholder="Enter your password" /></label>}
        {error && <p className="form-error">{error}</p>}
        {forgotMessage && <p className={forgotMessage.toLowerCase().includes('sent') ? 'form-success' : 'form-error'}>{forgotMessage}</p>}
        {forgotMode ? (
          <>
            <button className="btn-primary full" onClick={onForgot} disabled={forgotLoading}>{forgotLoading ? 'Sending request...' : 'Send password reset link'}</button>
            <button className="text-link" onClick={() => { setForgotMode(false); setForgotMessage(''); setError(''); }}>Back to Admin login</button>
          </>
        ) : (
          <>
            <button className="btn-primary full" onClick={onLogin} disabled={loading}>{loading ? 'Signing in...' : 'Sign in'} {!loading && <ChevronRight />}</button>
            <button className="text-link" onClick={() => { setForgotMode(true); setError(''); setForgotMessage(''); }}>Forgot password?</button>
          </>
        )}
        <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to customer website</button>
      </div>
    </div>
  );
}
const adminNav = [['Dashboard', LayoutDashboard], ['Orders', ClipboardList], ['Cancelled Orders', ClipboardList], ['Kitchen Display', ChefHat], ['POS', Store], ['Menu & Stock', Package], ['Riders', Bike], ['Vouchers', Tag], ['Reports', TrendingUp], ['Settings', Settings2]];
function AdminShell({ section, setSection, orders, ordersLoading, ordersError, refreshOrders, products, setProducts, riders, setRiders, vouchers, setVouchers, stats, newOrder, changeStatus, assignRider, cancelOrder, changePaymentStatus, paymentMethods, setPaymentMethods, deliveryFee, setDeliveryFee, storeHours, setStoreHours, storeManualStatus, setStoreManualStatus, storeOpen, setStoreOpen, notifications = [], notificationsOpen = false, setNotificationsOpen = () => {}, onClearNotifications = () => {}, newOrderAlert = null, onDismissNewOrderAlert = () => {}, onCustomer, onLogout, brandLogo, setBrandLogo }) { return <div className="admin-layout"><aside className="admin-sidebar"><div className="admin-brand">{brandLogo ? <img className="kp-brand-logo" src={brandLogo} alt="Khante Pinte" /> : <span className="brand-mark">KP</span>}<div><strong>KHANTE PINTE</strong><small>Management</small></div></div><div className="sidebar-label">WORKSPACE</div>{adminNav.map(([name, Icon]) => <button key={name} className={`nav-item ${section === name ? 'nav-active' : ''}`} onClick={() => setSection(name)}><Icon size={18} />{name}</button>)}<div className="sidebar-bottom"><button className="nav-item" onClick={onCustomer}><Store size={18} />Customer website</button><span className="prototype-pill">SUPABASE CONNECTED</span></div></aside><main className="admin-main"><header className="admin-topbar"><div><span className="eyebrow">KHANTE PINTE / {section.toUpperCase()}</span><h1>{section}</h1></div><div className="topbar-right"><span className="shift-chip"><span className="dot-live" /> Night shift</span><div style={{ position:'relative' }}>
  <button className="icon-btn" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)} style={{ position:'relative' }}>
    <Bell />
    {notifications.length > 0 && <span style={{ position:'absolute', top:-4, right:-4, minWidth:18, height:18, padding:'0 4px', borderRadius:99, background:'#dc2626', color:'#fff', fontSize:10, display:'grid', placeItems:'center', fontWeight:700 }}>{notifications.length > 9 ? '9+' : notifications.length}</span>}
  </button>
  {notificationsOpen && <div style={{ position:'absolute', right:0, top:48, width:320, maxWidth:'85vw', background:'#fff', border:'1px solid #e4e7ec', borderRadius:14, boxShadow:'0 12px 35px rgba(16,24,40,.16)', zIndex:1000, padding:14 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
      <strong>Notifications</strong>
      <button className="btn-outline" style={{ padding:'5px 8px', fontSize:11 }} onClick={onClearNotifications}>Clear all</button>
    </div>
    {notifications.length ? <div style={{ maxHeight:330, overflowY:'auto', display:'grid', gap:10 }}>
      {notifications.map(n => <div key={n.id} style={{ padding:'9px 0', borderBottom:'1px solid #f0f0f0' }}>
        <strong style={{ display:'block', fontSize:13 }}>{n.title}</strong>
        <small style={{ color:'#667085' }}>{n.message}</small>
        <small style={{ display:'block', color:'#98a2b3', marginTop:3 }}>{new Date(n.time).toLocaleTimeString()}</small>
      </div>)}
    </div> : <p style={{ color:'#667085', fontSize:13, margin:'12px 0' }}>No new notifications. New orders will appear here automatically.</p>}
  </div>}
</div><div className="admin-avatar">KP</div><button className="btn-outline admin-logout" onClick={onLogout}>Logout</button></div></header><div className="admin-content">
{newOrderAlert && <div role="alert" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'16px 20px', marginBottom:18, borderRadius:14, background:'#fff4d6', border:'2px solid #f2b84b', boxShadow:'0 4px 16px rgba(0,0,0,.08)' }}>
  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
    <span style={{ fontSize:28 }}>🔔</span>
    <div><strong style={{ display:'block', fontSize:16, color:'#7a3e00' }}>NEW ORDER RECEIVED · KP-{newOrderAlert.orderNumber}</strong><span style={{ color:'#7a3e00', fontSize:13 }}>{newOrderAlert.customer} · {currency(newOrderAlert.amount)}</span></div>
  </div>
  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
    <button className="btn-primary" onClick={() => { setSection('Orders'); onDismissNewOrderAlert(); }}>View order</button>
    <button className="btn-outline" aria-label="Dismiss new order alert" onClick={onDismissNewOrderAlert}>×</button>
  </div>
</div>}
{section === 'Dashboard' && <Dashboard orders={orders} stats={stats} products={products} setSection={setSection} />}{section === 'Orders' && <Orders orders={orders} loading={ordersLoading} error={ordersError} onRefresh={refreshOrders} changeStatus={changeStatus} assignRider={assignRider} riders={riders} cancelOrder={cancelOrder} changePaymentStatus={changePaymentStatus} />}{section === 'Cancelled Orders' && <CancelledOrders orders={orders} loading={ordersLoading} error={ordersError} onRefresh={refreshOrders} />}{section === 'Kitchen Display' && <><div className="toolbar" style={{ justifyContent: 'space-between' }}><span>{ordersLoading ? 'Loading orders…' : `${orders.length} orders loaded`}</span><button className="btn-outline" onClick={refreshOrders}><RefreshCw size={15} /> Refresh orders</button></div>{ordersError && <div className="form-error" style={{ padding: 12, marginBottom: 12 }}>Could not load orders: {ordersError}</div>}<KDS orders={orders} changeStatus={changeStatus} /></>}{section === 'POS' && <POS products={products} newOrder={newOrder} riders={riders} paymentMethods={paymentMethods} deliveryFee={deliveryFee} />}{section === 'Menu & Stock' && <MenuStock products={products} setProducts={setProducts} />}{section === 'Riders' && <RiderManager riders={riders} setRiders={setRiders} orders={orders} />}{section === 'Vouchers' && <VoucherManager vouchers={vouchers} setVouchers={setVouchers} />}{section === 'Reports' && <Reports orders={orders} />}{section === 'Settings' && <BusinessSettings paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} deliveryFee={deliveryFee} setDeliveryFee={setDeliveryFee} storeHours={storeHours} setStoreHours={setStoreHours} storeManualStatus={storeManualStatus} setStoreManualStatus={setStoreManualStatus} storeOpen={storeOpen} setStoreOpen={setStoreOpen} brandLogo={brandLogo} setBrandLogo={setBrandLogo} />}</div></main></div> }
function Dashboard({ orders, stats, products, setSection }) { const pending = orders.filter(o => ['New', 'Confirmed', 'Preparing', 'Ready'].includes(o.status)); const recent = orders.slice(0, 6); return <><div className="welcome-row"><div><h2>Good evening, Owner 👋</h2><p>Here is your business snapshot for the current business day.</p></div><button className="btn-primary" onClick={() => setSection('POS')}><Plus size={16} /> New phone order</button></div><div className="stat-grid"><Stat icon={CircleDollarSign} label="Today's sales" value={currency(stats.sales)} hint="Current business day" /><Stat icon={ClipboardList} label="Orders today" value={stats.dayOrders.length} hint="Non-cancelled orders" /><Stat icon={TrendingUp} label="Average order" value={currency(stats.avg)} hint="Sales ÷ orders" /><Stat icon={Bell} label="Active orders" value={pending.length} hint="Needs attention" /></div><div className="dashboard-grid"><section className="panel"><div className="panel-head"><h3>Recent orders</h3><button className="text-link" onClick={() => setSection('Orders')}>View all <ChevronRight size={14} /></button></div>{recent.length ? recent.map(o => <OrderRow key={o.id} order={o} />) : <Empty icon={ClipboardList} text="Orders will appear here when customers order." />}</section><section className="panel"><div className="panel-head"><h3>Quick overview</h3></div><div className="quick-list"><div><span>Menu items</span><b>{products.length}</b></div><div><span>Out of stock</span><b>{products.filter(p => p.outOfStock).length}</b></div><div><span>Total orders stored</span><b>{orders.length}</b></div><div><span>Orders from website</span><b>{orders.filter(o => o.source === 'Website').length}</b></div><div><span>Phone/POS orders</span><b>{orders.filter(o => o.source === 'Phone').length}</b></div></div><div className="tip-card"><AlertCircle size={17} /><p>Orders and order status are stored in Supabase and sync to the admin workspace.</p></div></section></div></> }
function Stat({ icon: Icon, label, value, hint }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><small>{hint}</small></div> }
function OrderRow({ order: o }) { return <div className="order-row"><div className="order-number"><strong>{o.id}</strong><small>{o.customer} · {o.source}</small></div><div className="order-row-items">{o.items.map(x => `${x.qty}× ${x.name}`).join(', ')}</div><strong>{currency(o.total)}</strong><StatusBadge status={o.status} /></div> }
function StatusBadge({ status }) { const cls = status.toLowerCase().replace(/\s/g, '-'); return <span className={`status-badge status-${cls}`}>{status}</span> }
function Orders({ orders, loading, error, onRefresh, changeStatus, assignRider, riders, cancelOrder, changePaymentStatus }) {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const activeOrders = orders.filter(o => o.status !== 'Cancelled');
  const list = activeOrders.filter(o => (filter === 'All' || o.status === filter) && (`${o.id} ${o.customer} ${o.phone}`.toLowerCase().includes(query.toLowerCase())));
  return <>
    <div className="toolbar">
      {error && <p className="form-error">{error}</p>}
      <button className="btn-outline" onClick={onRefresh} disabled={loading}>{loading ? 'Loading...' : 'Refresh orders'}</button>
      <div className="search-box"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search order, customer or phone" /></div>
      <select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option>{['New', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'].map(status => <option key={status}>{status}</option>)}</select>
    </div>
    <div className="panel order-list-panel">
      {loading ? <Empty icon={RefreshCw} text="Loading orders from Supabase..." /> : list.length ? list.map(order => <OrderDetail key={order.id} order={order} changeStatus={changeStatus} assignRider={assignRider} riders={riders} cancelOrder={cancelOrder} changePaymentStatus={changePaymentStatus} />) : <Empty icon={ClipboardList} text="No active matching orders." />}
    </div>
  </>;
}
function CancelledOrders({ orders, loading, error, onRefresh }) {
  const [query, setQuery] = useState('');
  const list = orders.filter(o => o.status === 'Cancelled' && (`${o.id} ${o.customer} ${o.phone}`.toLowerCase().includes(query.toLowerCase())));
  return <>
    <div className="toolbar"><button className="btn-outline" onClick={onRefresh} disabled={loading}>{loading ? 'Loading...' : 'Refresh orders'}</button><div className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search cancelled orders"/></div><span>{list.length} cancelled orders</span></div>
    {error && <p className="form-error">{error}</p>}
    <div className="panel order-list-panel">{loading ? <Empty icon={RefreshCw} text="Loading cancelled orders..."/> : list.length ? list.map(o => <div className="order-detail" key={o.id}><div className="order-detail-top"><div><strong>{o.id}</strong><small>{new Date(o.createdAt).toLocaleString()}</small></div><StatusBadge status={o.status}/></div><div className="order-detail-body"><div><strong>{o.customer}</strong><small>{o.phone}</small><small>{o.type}</small></div><div className="items-mini">{o.items.map(i => <div key={i.id}>{i.qty} × {i.name}<span>{currency(i.price*i.qty)}</span></div>)}</div><div className="order-money"><small>Subtotal {currency(o.subtotal)}</small><small>Delivery {currency(o.delivery)}</small><strong>Total {currency(o.total)}</strong></div></div>{o.cancellationReason && <div style={{margin: '0 18px 16px', padding: 12, background:'#fef3f2', color:'#b42318', borderRadius:8}}><strong>Cancellation reason</strong><p style={{margin:'4px 0 0'}}>{o.cancellationReason}</p></div>}</div>) : <Empty icon={ClipboardList} text="No cancelled orders."/>}</div>
  </>;
}
function OrderDetail({ order: o, changeStatus, assignRider, riders, cancelOrder, changePaymentStatus }) {
  const [proofUrl, setProofUrl] = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const openProof = async () => {
    if (!o.paymentProofPath) return;
    setProofLoading(true);
    const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(o.paymentProofPath, 300);
    setProofLoading(false);
    if (error) { alert(`Could not open payment proof: ${error.message}`); return; }
    setProofUrl(data.signedUrl);
  };
  return <div className="order-detail">
    <div className="order-detail-top"><div><strong>{o.id}</strong><small>{new Date(o.createdAt).toLocaleString()} · {o.source}</small></div><StatusBadge status={o.status} /></div>
    <div className="order-detail-body">
      <div>{/GIFT ORDER/i.test(o.note || '') && <span className="gift-order-flag">🎁 GIFT ORDER</span>}<strong>{o.customer}</strong><small>{o.phone}</small>{o.address && <small><MapPin size={13} /> {o.address}</small>}<small>{o.type}</small>{/CUSTOMER CALLBACK NUMBER:/i.test(o.note || '') && <small><b>Callback:</b> {((o.note.match(/CUSTOMER CALLBACK NUMBER:\s*([0-9]+)/i)||[])[1]||'')}</small>}{/GIFT ORDER/i.test(o.note || '') && <small className="gift-recipient-admin">{(o.note.match(/GIFT ORDER — Recipient: ([^;]+)/i)||[])[1] || 'Gift recipient details'} · {(o.note.match(/recipient phone: ([^;]+)/i)||[])[1] || ''}</small>}{o.rider && <small className="assigned-rider-admin">🚴 Rider: {o.rider}{o.riderPhone ? ` · ${o.riderPhone}` : ''}</small>}</div>
      <div className="items-mini">{o.items.map(item => <div key={item.id}>{item.qty} × {item.name} <span>{currency(item.price * item.qty)}</span></div>)}</div>
      <div className="order-money"><small>Subtotal {currency(o.subtotal)}</small><small>Discount −{currency(o.discount)}</small><small>Delivery {currency(o.delivery)}</small><small>Payment: {(o.payment || 'cash').replaceAll('_',' ')}</small><strong>Total {currency(o.total)}</strong></div>
    </div>
    <div className="order-controls">
      <select value={o.status} onChange={e => changeStatus(o.id, e.target.value)}>{['New', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered'].map(status => <option key={status}>{status}</option>)}</select>
      <select value={o.paymentStatus || 'unpaid'} onChange={e => changePaymentStatus(o.id, e.target.value)}><option value="unpaid">Payment: Unpaid</option><option value="paid">Payment: Paid</option></select>
      {o.paymentProofPath && <><button className="btn-outline" onClick={openProof} disabled={proofLoading}>{proofLoading ? 'Opening…' : 'View payment proof'}</button>{proofUrl && <a href={proofUrl} target="_blank" rel="noreferrer">Open screenshot</a>}</>}
      {o.type === 'Delivery' && <select value={o.rider || ''} onChange={e => assignRider(o.id, e.target.value)}><option value="">Assign rider</option>{riders.map(rider => <option key={rider}>{rider}</option>)}</select>}
      {o.status !== 'Cancelled' && o.status !== 'Delivered' && o.status !== 'Served' && <button className="danger-btn" onClick={() => cancelOrder(o.id)}>Cancel</button>}
    </div>
  </div>;
}
function KDS({ orders, changeStatus }) { const columns = [['New', 'New'], ['Confirmed', 'Confirmed'], ['Preparing', 'Preparing'], ['Ready', 'Ready']]; return <div className="kds"><div className="kds-heading"><div><h2>Kitchen board</h2><p>Live order workflow · {orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length} active tickets</p></div><span className="shift-chip"><RefreshCw size={14} /> Live order board</span></div><div className="kds-columns">{columns.map(([status, label]) => <section className="kds-column" key={status}><div className="kds-column-head"><h3>{label}</h3><span>{orders.filter(o => o.status === status).length}</span></div>{orders.filter(o => o.status === status).map(o => <div className="kds-ticket" key={o.id}><div className="ticket-top"><strong>{o.id}</strong><small>{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div><div className="ticket-customer">{o.customer} · {o.source}</div>{o.items.map(i => <div className="ticket-item" key={i.id}><b>{i.qty}×</b>{i.name}</div>)}{o.note && <div className="ticket-note">Note: {o.note}</div>}<div className="ticket-total">{currency(o.total)}</div><button className="btn-primary full" onClick={() => changeStatus(o.id, status === 'New' ? 'Confirmed' : status === 'Confirmed' ? 'Preparing' : status === 'Preparing' ? 'Ready' : 'Out for Delivery')}>{status === 'New' ? 'Confirm order' : status === 'Confirmed' ? 'Start preparing' : status === 'Preparing' ? 'Mark ready' : 'Send for delivery'} <ChevronRight size={16} /></button></div>)}{!orders.some(o => o.status === status) && <div className="empty-column">No tickets</div>}</section>)}</div></div> }
function POS({ products, newOrder, riders, paymentMethods, deliveryFee }) { const [cart, setCart] = useState([]); const [customer, setCustomer] = useState(''); const [phone, setPhone] = useState(''); const [address, setAddress] = useState(''); const [type, setType] = useState('Delivery'); const [manualDiscount, setManualDiscount] = useState(0); const [rider, setRider] = useState(''); const [paymentMethod, setPaymentMethod] = useState('cash'); const [paymentStatus, setPaymentStatus] = useState('unpaid'); const [search, setSearch] = useState(''); const available = products.filter(p => !p.outOfStock && p.name.toLowerCase().includes(search.toLowerCase())); const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0); const total = Math.max(0, subtotal - Number(manualDiscount) + (type === 'Delivery' ? deliveryFee : 0)); const add = p => setCart(c => { const old = c.find(x => x.id === p.id); return old ? c.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...p, qty: 1 }] }); return <div className="pos-layout"><section className="pos-products panel"><div className="panel-head"><h3>Products</h3></div><div className="search-box"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu" /></div><div className="pos-grid">{available.map(p => <button key={p.id} className="pos-product" onClick={() => add(p)}><span>{p.emoji}</span><strong>{p.name}</strong><small>{currency(p.price)}</small></button>)}</div></section><section className="pos-cart panel"><div className="panel-head"><h3>New phone order</h3></div><label>Customer<input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Name / Walk-in" /></label><label>Phone<input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit phone number" inputMode="numeric" maxLength={10} /></label><label>Order type<select value={type} onChange={e => setType(e.target.value)}><option>Delivery</option><option>Pickup</option></select></label>{type === 'Delivery' && <label>Address<textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Delivery address" /></label>}<div className="pos-cart-items">{cart.map(i => <div className="pos-line" key={i.id}><div><strong>{i.name}</strong><small>{currency(i.price)}</small></div><div className="qty-control"><button onClick={() => setCart(c => c.map(x => x.id === i.id ? { ...x, qty: x.qty - 1 } : x).filter(x => x.qty > 0))}><Minus size={14} /></button><b>{i.qty}</b><button onClick={() => add(i)}><Plus size={14} /></button></div></div>)}</div><label>Manual discount (Rs.)<input type="number" min="0" value={manualDiscount} onChange={e => setManualDiscount(e.target.value)} /></label><label>Rider<select value={rider} onChange={e => setRider(e.target.value)}><option value="">Unassigned</option>{riders.map(r => <option key={r} value={r}>{r}</option>)}</select></label><label>Payment method<select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>{(paymentMethods || []).filter(method => method.enabled).map(method => <option key={method.code} value={method.code}>{method.name}</option>)}</select></label><label>Payment status<select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label><div className="checkout-summary"><div><span>Subtotal</span><b>{currency(subtotal)}</b></div><div><span>Discount</span><b>−{currency(manualDiscount)}</b></div><div><span>Delivery</span><b>{currency(type === 'Delivery' ? deliveryFee : 0)}</b></div><div className="summary-total"><span>Total</span><strong>{currency(total)}</strong></div></div><button className="btn-primary full" disabled={!cart.length} onClick={async () => { try { await newOrder({ customer: customer || 'Phone customer', phone, address, type, items: cart, subtotal, discount: Number(manualDiscount), delivery: type === 'Delivery' ? deliveryFee : 0, total, paymentMethod, paymentStatus, rider }, 'Phone'); setCart([]); setCustomer(''); setPhone(''); setAddress(''); setManualDiscount(0); setRider(''); setPaymentMethod('cash'); setPaymentStatus('unpaid'); } catch {} }}>Create order <ChevronRight /></button></section></div> }


function MenuStock({ products, setProducts }) {
  const [categoriesList, setCategoriesList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [busyIds, setBusyIds] = useState([]);
  const [addForm, setAddForm] = useState({ name: '', price: '', description: '', categoryId: '', image_url: '' });
  const [uploadingImage, setUploadingImage] = useState('');
  const uploadMenuImage = async (file, setter, key) => { if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) { alert('Choose a JPG, PNG or WEBP image smaller than 5 MB.'); return; } setUploadingImage(key); try { const ext = file.type.split('/')[1].replace('jpeg','jpg'); const path = `menu/${crypto.randomUUID()}.${ext}`; const { error } = await supabase.storage.from('kp-menu-images').upload(path,file,{upsert:false,contentType:file.type}); if(error) throw error; const { data } = supabase.storage.from('kp-menu-images').getPublicUrl(path); setter(v => ({...v,image_url:data.publicUrl})); } catch(e) { alert(`Image upload failed: ${e.message}`); } finally { setUploadingImage(''); } };

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase.from('menu_categories')
        .select('id, name, active, display_order').eq('active', true)
        .order('display_order', { ascending: true });
      if (error) { console.error('Categories loading failed:', error); alert('Could not load categories.'); return; }
      setCategoriesList(data || []);
    };
    loadCategories();
  }, []);

  const formatProduct = item => ({
    id: item.id, name: item.name, category: item.menu_categories?.name || 'Other',
    categoryId: item.category_id, price: Number(item.price), description: item.description || '',
    tag: '', emoji: '🍽️', image_url: item.image_url,
    outOfStock: !item.available || Number(item.stock_quantity) === 0
  });

  const startEdit = product => {
    setEditingId(product.id);
    setEditForm({ name: product.name, price: String(product.price), description: product.description || '', categoryId: product.categoryId || '', image_url: product.image_url || '' });
  };

  const saveItem = async (product, form, isNew = false) => {
    if (!form.name?.trim() || form.price === '' || !Number.isFinite(Number(form.price)) || Number(form.price) < 0 || !form.categoryId) {
      alert('Please enter a valid name, price and category.'); return;
    }
    const key = isNew ? 'new' : product.id;
    setSavingId(key);
    try {
      const payload = { name: form.name.trim(), price: Number(form.price), description: (form.description || '').trim(), category_id: form.categoryId, image_url: (form.image_url || '').trim() || null };
      const result = isNew
        ? await supabase.from('menu_items').insert({ ...payload, available: true, stock_quantity: 1 }).select('id, category_id, name, description, price, image_url, available, stock_quantity, menu_categories(name)').single()
        : await supabase.from('menu_items').update(payload).eq('id', product.id).select('id, category_id, name, description, price, image_url, available, stock_quantity, menu_categories(name)').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new Error('No item was returned. Check database permissions.');
      const formatted = formatProduct(result.data);
      setProducts(current => isNew ? [...current, formatted] : current.map(p => p.id === product.id ? formatted : p));
      if (isNew) setAddForm({ name: '', price: '', description: '', categoryId: '', image_url: '' });
      else setEditingId(null);
    } catch (error) {
      console.error('Menu item save failed:', error); alert(`Could not save menu item: ${error.message}`);
    } finally { setSavingId(null); }
  };

  const handleDelete = async product => {
    if (!confirm(`Delete "${product.name}" permanently?`)) return;
    setBusyIds(current => [...current, product.id]);
    try {
      const { data, error } = await supabase.from('menu_items').delete().eq('id', product.id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('No row was deleted. Check the DELETE policy.');
      setProducts(current => current.filter(p => p.id !== product.id));
      if (editingId === product.id) setEditingId(null);
    } catch (error) { alert(`Delete failed: ${error.message}`); }
    finally { setBusyIds(current => current.filter(id => id !== product.id)); }
  };

  const toggle = async product => {
    if (busyIds.includes(product.id)) return;
    const unavailable = !product.outOfStock;
    setBusyIds(current => [...current, product.id]);
    try {
      const { data, error } = await supabase.from('menu_items').update({ available: !unavailable, stock_quantity: unavailable ? 0 : 1 })
        .eq('id', product.id).select('id, available, stock_quantity').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('No item was updated. Check the UPDATE policy.');
      setProducts(current => current.map(p => p.id === product.id ? { ...p, outOfStock: !data.available || Number(data.stock_quantity) === 0 } : p));
    } catch (error) { alert(`Availability update failed: ${error.message}`); }
    finally { setBusyIds(current => current.filter(id => id !== product.id)); }
  };

  const fieldStyle = { minWidth: 0, width: '100%' };
  const renderFields = (form, setter, compact = false) => <>
    <input style={fieldStyle} value={form.name || ''} onChange={e => setter(v => ({ ...v, name: e.target.value }))} placeholder="Food item name" />
    <input style={fieldStyle} type="number" min="0" value={form.price ?? ''} onChange={e => setter(v => ({ ...v, price: e.target.value }))} placeholder="Price (Rs.)" />
    <select style={fieldStyle} value={form.categoryId || ''} onChange={e => setter(v => ({ ...v, categoryId: e.target.value }))}>
      <option value="">Select category</option>{categoriesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
    {!compact && <>
      <input style={fieldStyle} value={form.description || ''} onChange={e => setter(v => ({ ...v, description: e.target.value }))} placeholder="Description" />
      <input style={fieldStyle} value={form.image_url || ''} onChange={e => setter(v => ({ ...v, image_url: e.target.value }))} placeholder="Image URL (optional)" /><label className="admin-file-label">{uploadingImage === 'add' ? 'Uploading image…' : 'Upload food photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => uploadMenuImage(e.target.files?.[0],setter,'add')} /></label>
    </>}
  </>;

  return <section className="panel">
    <div className="panel-head"><div><h3>Menu Management</h3><small>Add, edit, delete food items and manage availability.</small></div></div>
    <div className="panel" style={{ padding: 16, marginBottom: 20 }}>
      <h3>Add New Menu Item</h3>
      <div className="add-product-row">{renderFields(addForm, setAddForm)}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="btn-primary" onClick={() => saveItem(null, addForm, true)} disabled={savingId === 'new'}>{savingId === 'new' ? 'Adding…' : 'Add Menu Item'}</button>
      </div>
    </div>
    <div className="inventory-list">
      {products.map(p => <div className="inventory-row" key={p.id} style={editingId === p.id ? { alignItems: 'center', flexWrap: 'wrap' } : undefined}>
        <span className="inventory-emoji">{p.image_url ? <img src={p.image_url} alt={p.name} style={{width:54,height:54,objectFit:"cover",borderRadius:12}} /> : (p.emoji || '🍽️')}</span>
        {editingId === p.id ? <>
          <div style={{ flex: '1 1 100%', minWidth: 0 }}>
            <div className="menu-edit-primary-fields">
              {renderFields(editForm, setEditForm, true)}
            </div>
            <div className="menu-edit-fields">
              <label className="menu-edit-field menu-edit-description">Description
                <textarea rows={3} value={editForm.description || ''} onChange={e => setEditForm(v => ({ ...v, description: e.target.value }))} placeholder="Describe the food item…" />
              </label>
              <label className="menu-edit-field">Photo URL (optional)
                <input style={fieldStyle} value={editForm.image_url || ''} onChange={e => setEditForm(v => ({ ...v, image_url: e.target.value }))} placeholder="Paste an image URL if you are not uploading a photo" />
              </label>
              <div className="menu-edit-actions">
                <label className="admin-file-label">{uploadingImage === p.id ? 'Uploading image…' : 'Choose / replace food photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => uploadMenuImage(e.target.files?.[0],setEditForm,p.id)} /></label>
                <div className="menu-edit-buttons">
                  <button className="btn-primary" onClick={() => saveItem(p, editForm)} disabled={savingId === p.id}>{savingId === p.id ? 'Saving…' : 'Save changes'}</button>
                  <button className="btn-outline" onClick={() => setEditingId(null)} disabled={savingId === p.id}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </> : <>
          <div className="inventory-name"><strong>{p.name}</strong><small>{p.category}</small></div>
          <b>{currency(p.price)}</b>
          <span className={p.outOfStock ? 'stock-off' : 'stock-on'}>{p.outOfStock ? 'Out of stock' : 'Available'}</span>
          <button className="btn-outline" onClick={() => startEdit(p)}>Edit</button>
          <button className={p.outOfStock ? 'btn-outline' : 'danger-soft'} onClick={() => toggle(p)} disabled={busyIds.includes(p.id)}>{busyIds.includes(p.id) ? 'Please wait…' : p.outOfStock ? 'Mark available' : 'Out of stock'}</button>
          <button className="danger-soft" onClick={() => handleDelete(p)} disabled={busyIds.includes(p.id)}>{busyIds.includes(p.id) ? 'Please wait…' : 'Delete'}</button>
        </>}
      </div>)}
    </div>
  </section>;
}


function BusinessSettings({ paymentMethods, setPaymentMethods, deliveryFee, setDeliveryFee, storeHours, setStoreHours, storeManualStatus, setStoreManualStatus, storeOpen, setStoreOpen, brandLogo, setBrandLogo }) {
  const [feeInput, setFeeInput] = useState(String(deliveryFee));
  const [savingFee, setSavingFee] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [savingMethod, setSavingMethod] = useState(false);
  const [uploadingCode, setUploadingCode] = useState('');
  const [message, setMessage] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const uploadBrandLogo = async file => { if (!file) return; if (!['image/jpeg','image/png','image/webp','image/svg+xml'].includes(file.type) || file.size > 5*1024*1024) { setMessage('Choose a JPG, PNG, WEBP or SVG logo smaller than 5 MB.'); return; } setUploadingLogo(true); try { const ext = file.type.split('/')[1].replace('svg+xml','svg').replace('jpeg','jpg'); const path = `brand/logo-${Date.now()}.${ext}`; const { error: upError } = await supabase.storage.from('kp-brand-assets').upload(path,file,{upsert:true,contentType:file.type}); if(upError) throw upError; const { data } = supabase.storage.from('kp-brand-assets').getPublicUrl(path); const { error: saveError } = await supabase.from('business_settings').upsert({setting_key:'brand_logo_url',setting_value:JSON.stringify(data.publicUrl),updated_at:new Date().toISOString()},{onConflict:'setting_key'}); if(saveError) throw saveError; setBrandLogo(`${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}v=${Date.now()}`); setMessage('Khante Pinte logo updated across the customer website.'); } catch(e) { setMessage(`Logo upload failed: ${e.message}`); } finally { setUploadingLogo(false); } };
  const [hoursInput, setHoursInput] = useState({ open_time: formatTime12(storeHours?.open_time || '21:00'), close_time: formatTime12(storeHours?.close_time || '04:00') });
  useEffect(() => setHoursInput({ open_time: formatTime12(storeHours?.open_time || '21:00'), close_time: formatTime12(storeHours?.close_time || '04:00') }), [storeHours]);
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => setFeeInput(String(deliveryFee)), [deliveryFee]);

  const saveFee = async () => {
    const amount = Number(feeInput);
    if (!Number.isFinite(amount) || amount < 0) { setMessage('Enter a valid delivery charge.'); return; }
    setSavingFee(true); setMessage('');
    const { error } = await supabase.from('business_settings').upsert({
      setting_key: 'delivery_fee', setting_value: amount, updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' });
    setSavingFee(false);
    if (error) { setMessage(`Could not save delivery fee: ${error.message}`); return; }
    setDeliveryFee(amount);
    setMessage('Delivery charge saved successfully.');
  };

  const addMethod = async () => {
    const code = newCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!newName.trim() || !code) { setMessage('Enter a payment method name and code.'); return; }
    setSavingMethod(true); setMessage('');
    const { data, error } = await supabase.from('payment_methods').insert({
      code, name: newName.trim(), instructions: newInstructions.trim(), enabled: true, requires_proof: true,
      display_order: (paymentMethods?.length || 0) + 1
    }).select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof').single();
    setSavingMethod(false);
    if (error) { setMessage(`Could not add payment method: ${error.message}`); return; }
    setPaymentMethods(current => [...current, data]);
    setNewName(''); setNewCode(''); setNewInstructions('');
    setMessage('Payment method added. You can now upload its QR code.');
  };

  const uploadQr = async (method, file) => {
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { setMessage('Use PNG, JPG or WebP images.'); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage('QR image must be smaller than 5 MB.'); return; }
    setUploadingCode(method.code); setMessage('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${method.code}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('payment-qr-codes').upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('payment-qr-codes').getPublicUrl(path);
      const { data, error } = await supabase.from('payment_methods').update({ qr_image_url: urlData.publicUrl, updated_at: new Date().toISOString() }).eq('code', method.code).select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof').single();
      if (error) throw error;
      setPaymentMethods(current => current.map(item => item.code === method.code ? data : item));
      setMessage(`${method.name} QR uploaded successfully.`);
    } catch (error) { setMessage(`QR upload failed: ${error.message}`); }
    finally { setUploadingCode(''); }
  };

  const toggleMethod = async method => {
    const { data, error } = await supabase.from('payment_methods').update({ enabled: !method.enabled, updated_at: new Date().toISOString() }).eq('code', method.code).select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof').single();
    if (error) { setMessage(`Could not update method: ${error.message}`); return; }
    setPaymentMethods(current => current.map(item => item.code === method.code ? data : item));
  };

  const updateInstructions = async (method, instructions) => {
    const { data, error } = await supabase.from('payment_methods').update({ instructions, updated_at: new Date().toISOString() }).eq('code', method.code).select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof').single();
    if (error) { setMessage(`Could not save instructions: ${error.message}`); return; }
    setPaymentMethods(current => current.map(item => item.code === method.code ? data : item));
  };

  const saveHours = async () => {
    const openTime = parseTime12(hoursInput.open_time); const closeTime = parseTime12(hoursInput.close_time);
    if (!openTime || !closeTime || openTime === closeTime) { setMessage('Enter times like 09:00 PM and 04:00 AM, and make sure they are different.'); return; }
    const normalizedHours = { open_time: openTime, close_time: closeTime };
    setSavingHours(true); setMessage('');
    const { error } = await supabase.from('business_settings').upsert({ setting_key: 'store_hours', setting_value: normalizedHours, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });
    setSavingHours(false);
    if (error) { setMessage(`Could not save business hours: ${error.message}`); return; }
    setStoreHours(normalizedHours); setHoursInput({ open_time: formatTime12(openTime), close_time: formatTime12(closeTime) }); setMessage('Business hours saved successfully.');
    const { data, error: statusError } = await supabase.rpc('is_store_open'); if (!statusError) setStoreOpen(!!data);
  };
  const setManualStatus = async status => {
    const { error } = await supabase.from('business_settings').upsert({ setting_key: 'store_manual_status', setting_value: status, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });
    if (error) { setMessage(`Could not update store status: ${error.message}`); return; }
    setStoreManualStatus(status);
    const { data, error: statusError } = await supabase.rpc('is_store_open'); if (!statusError) setStoreOpen(!!data);
    setMessage(status === 'auto' ? 'Automatic opening hours restored.' : `Store manually set to ${status}.`);
  };

  return <div style={{ display: 'grid', gap: 20 }}>
    <section className="panel" style={{ padding: 20 }}><div className="panel-head"><div><h3>Khante Pinte branding</h3><small>Upload or replace the logo. It appears in the customer header, footer and admin workspace.</small></div></div>{brandLogo && <img src={brandLogo} alt="Current Khante Pinte logo" style={{width:180,maxHeight:90,objectFit:'contain',marginBottom:12}}/>}<label className="admin-file-label">{uploadingLogo ? 'Uploading logo…' : 'Upload / replace logo (JPG, PNG, WEBP or SVG)'}<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" disabled={uploadingLogo} onChange={e => uploadBrandLogo(e.target.files?.[0])}/></label>{message && <p className={message.includes('updated') ? 'success-note' : 'form-error'}>{message}</p>}</section>
    <section className="panel" style={{ padding: 20 }}>
      <div className="panel-head"><div><h3>Store availability & business hours</h3><small>Set your regular hours or manually open/close the customer website.</small></div><strong style={{ color: storeOpen ? '#15803d' : '#dc2626' }}>{storeOpen ? 'OPEN NOW' : 'CLOSED NOW'}</strong></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, maxWidth: 560 }}>
        <label>Opening time (12-hour format)<input type="text" inputMode="text" placeholder="09:00 PM" value={hoursInput.open_time} onChange={e => setHoursInput(v => ({ ...v, open_time: e.target.value }))} /></label>
        <label>Closing time (12-hour format)<input type="text" inputMode="text" placeholder="04:00 AM" value={hoursInput.close_time} onChange={e => setHoursInput(v => ({ ...v, close_time: e.target.value }))} /></label>
      </div>
      <button className="btn-primary" style={{ marginTop: 12 }} onClick={saveHours} disabled={savingHours}>{savingHours ? 'Saving…' : 'Save business hours'}</button>
      <div style={{ borderTop: '1px solid #eaecf0', marginTop: 18, paddingTop: 16 }}>
        <strong>Store control</strong><p style={{ color: '#667085', margin: '6px 0 12px' }}>Automatic follows the schedule. Manual open/closed overrides the schedule until you switch back to Automatic.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={storeManualStatus === 'auto' ? 'btn-primary' : 'btn-outline'} onClick={() => setManualStatus('auto')}>Automatic</button>
          <button className={storeManualStatus === 'open' ? 'btn-primary' : 'btn-outline'} onClick={() => setManualStatus('open')}>Open store</button>
          <button className={storeManualStatus === 'closed' ? 'btn-primary' : 'btn-outline'} onClick={() => setManualStatus('closed')}>Close store</button>
        </div>
      </div>
    </section>
    <section className="panel" style={{ padding: 20 }}>
      <div className="panel-head"><div><h3>Delivery charge</h3><small>Customers are charged this amount for delivery. Pickup orders are free of delivery charge.</small></div></div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 420 }}>
        <span>Rs.</span><input type="number" min="0" step="1" value={feeInput} onChange={e => setFeeInput(e.target.value)} />
        <button className="btn-primary" onClick={saveFee} disabled={savingFee}>{savingFee ? 'Saving…' : 'Save charge'}</button>
      </div>
    </section>
    <section className="panel" style={{ padding: 20 }}>
      <div className="panel-head"><div><h3>Payment methods</h3><small>Add your own payment options, upload QR codes and choose which ones customers can use.</small></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 12 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Method name (e.g. IME Pay)" />
        <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Unique code (e.g. ime_pay)" />
        <input value={newInstructions} onChange={e => setNewInstructions(e.target.value)} placeholder="Payment instructions (optional)" />
        <button className="btn-primary" onClick={addMethod} disabled={savingMethod}>{savingMethod ? 'Adding…' : 'Add payment option'}</button>
      </div>
      {paymentMethods.map(method => <div key={method.code} style={{ borderTop: '1px solid #eaecf0', padding: '14px 0', display: 'grid', gridTemplateColumns: 'minmax(140px,1fr) minmax(180px,2fr) auto', gap: 12, alignItems: 'center' }}>
        <div><strong>{method.name}</strong><small style={{ display: 'block', color: '#667085' }}>{method.code}</small>{method.qr_image_url && <img src={method.qr_image_url} alt={`${method.name} QR`} style={{ width: 90, height: 90, objectFit: 'contain', marginTop: 8 }} />}</div>
        <div><input defaultValue={method.instructions || ''} placeholder="Customer instructions" onBlur={e => { if (e.target.value !== (method.instructions || '')) updateInstructions(method, e.target.value); }} /><label style={{ display: 'block', marginTop: 8, fontSize: 12 }}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => uploadQr(method, e.target.files?.[0])} /> {uploadingCode === method.code ? 'Uploading QR…' : 'Upload / replace QR (max 5 MB)'}</label>{method.code === 'cash' ? <small style={{ display: 'block', marginTop: 8, color: '#667085' }}>🔒 Protected: Cash on Delivery cannot be deleted and never requires a screenshot.</small> : <label style={{ display: 'block', marginTop: 8, fontSize: 12 }}><input type="checkbox" checked={!!method.requires_proof} onChange={async e => { const value = e.target.checked; const { data, error } = await supabase.from('payment_methods').update({ requires_proof: value }).eq('code', method.code).select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof').single(); if (error) { setMessage(`Could not update proof requirement: ${error.message}`); return; } setPaymentMethods(current => current.map(item => item.code === method.code ? data : item)); }} /> Require payment screenshot from customer</label>}</div>
        <button className={method.enabled ? 'btn-outline' : 'danger-soft'} onClick={() => toggleMethod(method)}>{method.enabled ? 'Enabled' : 'Disabled'}</button>
      </div>)}
      {message && <p className={message.includes('successfully') || message.startsWith('Payment method added') ? 'success-note' : 'form-error'}>{message}</p>}
    </section>
  </div>;
}

function RiderManager({ riders, setRiders, orders }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const addRider = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('riders')
      .insert({ name: name.trim(), phone: phone.trim() || null, active: true })
      .select('id,name,phone').single();
    setSaving(false);
    if (error) { alert(`Could not add rider: ${error.message}`); return; }
    setRiders(current => [...current, data.name]);
    setName(''); setPhone('');
  };
  const removeRider = async riderName => {
    if (!confirm(`Deactivate ${riderName}? Existing order history will be preserved.`)) return;
    const { error } = await supabase.from('riders').update({ active: false }).eq('name', riderName);
    if (error) { alert(`Could not deactivate rider: ${error.message}`); return; }
    setRiders(current => current.filter(r => r !== riderName));
  };
  return <section className="panel">
    <div className="panel-head"><div><h3>Delivery riders</h3><small>Assign who is taking each order. No location tracking.</small></div></div>
    <div className="add-product-row">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Rider name" />
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number (optional)" />
      <button className="btn-primary" onClick={addRider} disabled={saving || !name.trim()}><Plus size={16} /> {saving ? 'Adding…' : 'Add rider'}</button>
    </div>
    {riders.map(r => <div className="rider-row" key={r}>
      <div className="rider-avatar"><Bike /></div>
      <div><strong>{r}</strong><small>{orders.filter(o => o.rider === r).length} orders assigned</small></div>
      <button className="danger-soft" onClick={() => removeRider(r)}>Deactivate</button>
    </div>)}
  </section>;
}
function VoucherManager({ vouchers, setVouchers }) {
  const [code,setCode]=useState(''), [type,setType]=useState('percentage'), [value,setValue]=useState(''), [min,setMin]=useState(''), [max,setMax]=useState(''), [saving,setSaving]=useState(false), [message,setMessage]=useState('');
  const mapVoucher=v=>({id:v.id,code:v.code,type:v.discount_type === 'percentage' ? 'percent' : 'fixed',value:Number(v.discount_value),min:Number(v.minimum_order||0),max:Number(v.maximum_discount||0),active:v.active,expiresAt:v.expires_at});
  const addVoucher=async()=>{
    const clean=code.trim().toUpperCase(), amount=Number(value);
    if(!clean||!Number.isFinite(amount)||amount<=0){setMessage('Enter a voucher code and a discount greater than zero.');return;}
    if(type==='percentage'&&amount>100){setMessage('Percentage discount cannot exceed 100%.');return;}
    setSaving(true);setMessage('');
    const {data,error}=await supabase.from('vouchers').insert({code:clean,discount_type:type,discount_value:amount,minimum_order:Number(min||0),maximum_discount:max?Number(max):null,active:true}).select('id,code,discount_type,discount_value,minimum_order,maximum_discount,active,expires_at').single();
    setSaving(false);
    if(error){setMessage(`Could not create voucher: ${error.message}`);return;}
    setVouchers(current=>[mapVoucher(data),...current]);setCode('');setValue('');setMin('');setMax('');setMessage('Voucher saved to Supabase.');
  };
  const toggle=async v=>{
    const {data,error}=await supabase.from('vouchers').update({active:!v.active}).eq('id',v.id).select('id,active').single();
    if(error){setMessage(`Could not update voucher: ${error.message}`);return;}
    setVouchers(current=>current.map(x=>x.id===v.id?{...x,active:data.active}:x));
  };
  const remove=async v=>{
    if(!confirm(`Delete voucher ${v.code}?`))return;
    const {error}=await supabase.from('vouchers').delete().eq('id',v.id);
    if(error){setMessage(`Could not delete voucher: ${error.message}`);return;}
    setVouchers(current=>current.filter(x=>x.id!==v.id));
  };
  return <section className="panel">
    <div className="panel-head"><div><h3>Discount vouchers</h3><small>Vouchers are saved in Supabase and validated again during checkout.</small></div></div>
    <div className="voucher-create">
      <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Voucher code"/>
      <select value={type} onChange={e=>setType(e.target.value)}><option value="percentage">Percentage</option><option value="fixed">Fixed Rs.</option></select>
      <input type="number" min="0" value={value} onChange={e=>setValue(e.target.value)} placeholder="Discount value"/>
      <input type="number" min="0" value={min} onChange={e=>setMin(e.target.value)} placeholder="Minimum order"/>
      <input type="number" min="0" value={max} onChange={e=>setMax(e.target.value)} placeholder="Maximum discount (optional)"/>
      <button className="btn-primary" onClick={addVoucher} disabled={saving}>{saving?'Saving…':<><Plus size={16}/> Create voucher</>}</button>
    </div>
    {message&&<p className={message.includes('saved')?'success-note':'form-error'}>{message}</p>}
    {vouchers.map(v=><div className="voucher-item" key={v.id||v.code}>
      <div><strong>{v.code}</strong><small>{v.type==='percent'?`${v.value}% off`:`${currency(v.value)} off`} · Minimum {currency(v.min||0)} · Max {v.max?currency(v.max):'none'}</small></div>
      <button className={v.active?'stock-on':'stock-off'} onClick={()=>toggle(v)}>{v.active?'Active':'Inactive'}</button>
      <button className="danger-soft" onClick={()=>remove(v)}>Delete</button>
    </div>)}
    {!vouchers.length&&<p className="muted">No vouchers created yet.</p>}
  </section>;
}
function Reports({ orders }) {
  const today = businessDate();
  const [range, setRange] = useState('today');
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const dates = useMemo(() => {
    const end = new Date(`${today}T12:00:00`);
    const start = new Date(end);
    if (range === '7days') start.setDate(start.getDate() - 6);
    if (range === '30days') start.setDate(start.getDate() - 29);
    if (range === 'month') start.setDate(1);
    const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return range === 'custom' ? { from: fromDate, to: toDate } : { from: range === 'all' ? '0000-01-01' : iso(start), to: today };
  }, [range, today, fromDate, toDate]);

  const filtered = orders.filter(o => o.businessDate >= dates.from && o.businessDate <= dates.to);
  const valid = filtered.filter(o => o.status !== 'Cancelled');
  const sales = valid.reduce((sum,o)=>sum+Number(o.total||0),0);
  const subtotal = valid.reduce((sum,o)=>sum+Number(o.subtotal||0),0);
  const discounts = valid.reduce((sum,o)=>sum+Number(o.discount||0),0);
  const delivery = valid.reduce((sum,o)=>sum+Number(o.delivery||0),0);
  const cancelled = filtered.filter(o=>o.status==='Cancelled');
  const avg = valid.length ? sales/valid.length : 0;
  const groupSum = (key, valueKey='total') => filtered.reduce((acc,o)=>{const k=o[key]||'Unknown';acc[k]=(acc[k]||0)+Number(o[valueKey]||0);return acc;},{});
  const sourceTotals = groupSum('source');
  const paymentTotals = groupSum('payment');
  const statusCounts = filtered.reduce((acc,o)=>{acc[o.status]=(acc[o.status]||0)+1;return acc;},{});
  const itemSales = {};
  valid.forEach(o=>(o.items||[]).forEach(i=>{itemSales[i.name]=(itemSales[i.name]||0)+Number(i.qty||0)}));
  const topItems = Object.entries(itemSales).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const downloadCsv = () => {
    const rows = [
      ['Order','Business date','Created','Source','Customer','Phone','Type','Status','Payment method','Payment status','Subtotal','Discount','Delivery fee','Total','Rider','Cancellation reason','Items'],
      ...filtered.map(o=>[o.id,o.businessDate,o.createdAt,o.source,o.customer,o.phone,o.type,o.status,o.payment,o.paymentStatus,o.subtotal,o.discount,o.delivery,o.total,o.rider,o.cancellationReason,(o.items||[]).map(i=>`${i.name} x${i.qty}`).join('; ')])
    ];
    const csv = rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob); const link=document.createElement('a');
    link.href=url;link.download=`khante-pinte-report-${dates.from}-to-${dates.to}.csv`;link.click();URL.revokeObjectURL(url);
  };
  const moneyLine = (label,value) => <div className="report-line" key={label}><span>{label}</span><strong>{currency(value)}</strong></div>;
  return <div className="reports-grid">
    <section className="panel">
      <div className="panel-head"><div><h3>Reports & analytics</h3><small>Based on orders saved in Supabase · Business date</small></div><button className="btn-primary" onClick={downloadCsv}><Receipt size={16}/> Export CSV</button></div>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <select value={range} onChange={e=>setRange(e.target.value)} style={{padding:10,border:'1px solid #ddd',borderRadius:8}}>
          <option value="today">Today</option><option value="7days">Last 7 days</option><option value="30days">Last 30 days</option><option value="month">This month</option><option value="all">All time</option><option value="custom">Custom range</option>
        </select>
        {range==='custom'&&<><label>From <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label><label>To <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></label></>}
        <small style={{color:'#667085'}}>Showing {dates.from} to {dates.to}</small>
      </div>
    </section>
    <div className="stat-grid">
      <Stat icon={CircleDollarSign} label="Net sales" value={currency(sales)} hint={`${valid.length} non-cancelled orders`}/>
      <Stat icon={ClipboardList} label="Total orders" value={filtered.length} hint={`${cancelled.length} cancelled`}/>
      <Stat icon={TrendingUp} label="Average order value" value={currency(avg)} hint="Net sales ÷ non-cancelled orders"/>
      <Stat icon={Receipt} label="Cancellation rate" value={`${filtered.length?Math.round(cancelled.length/filtered.length*100):0}%`} hint={`${cancelled.length} cancelled orders`}/>
    </div>
    <section className="panel"><div className="panel-head"><h3>Sales breakdown</h3></div>
      {moneyLine('Food subtotal',subtotal)}{moneyLine('Discounts',discounts)}{moneyLine('Delivery charges collected',delivery)}{moneyLine('Net sales',sales)}
    </section>
    <section className="panel"><div className="panel-head"><h3>Sales by order source</h3></div>
      {Object.entries(sourceTotals).length?Object.entries(sourceTotals).map(([k,v])=>moneyLine(k,v)):<Empty icon={Wallet} text="No orders in this period."/>}
    </section>
    <section className="panel"><div className="panel-head"><h3>Payment method breakdown</h3></div>
      {Object.entries(paymentTotals).length?Object.entries(paymentTotals).map(([k,v])=>moneyLine(k,v)):<Empty icon={Wallet} text="No payment data."/>}
    </section>
    <section className="panel"><div className="panel-head"><h3>Order status breakdown</h3></div>
      {Object.entries(statusCounts).map(([k,v])=><div className="report-line" key={k}><span>{k}</span><strong>{v}</strong></div>)}
    </section>
    <section className="panel"><div className="panel-head"><h3>Top-selling items</h3></div>
      {topItems.length?topItems.map(([name,qty])=><div className="report-line" key={name}><span>{name}</span><strong>{qty} sold</strong></div>):<Empty icon={ClipboardList} text="No item sales in this period."/>}
    </section>
    <section className="panel"><div className="panel-head"><h3>Cancelled orders</h3></div>
      {cancelled.length?cancelled.map(o=><div className="report-line" key={o.id}><span>{o.id} · {o.cancellationReason||'No reason provided'}</span><strong>{currency(o.total)}</strong></div>):<Empty icon={ClipboardList} text="No cancelled orders in this period."/>}
    </section>
  </div>;
}
function Empty({ icon: Icon, text }) { return <div className="empty-state"><Icon size={30} /><p>{text}</p></div> }

createRoot(document.getElementById('root')).render(<App />);
