import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '@/lib/supabase';
import { testConnection } from '@/lib/testConnection';
import './style.css';

import {
  Search,
  Clock3,
  MapPin,
  Phone,
  ChevronRight,
  Bike,
  Wallet,
  X
} from 'lucide-react';

import {
  currency,
  formatTime12,
  getStore,
  saveStore,
  businessDate,
  formatDbOrder
} from '@/utils/formatters';

// Common Components
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';

// Customer Components
import { FoodCard } from '@/components/customer/FoodCard';
import { ProductDetailModal } from '@/components/customer/ProductDetailModal';
import { Checkout } from '@/components/customer/Checkout';
import { CustomerAuth } from '@/components/customer/CustomerAuth';
import { CustomerAccountPanel } from '@/components/customer/CustomerAccountPanel';
import { OrderTracking } from '@/components/customer/OrderTracking';

// Admin Components
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminShell } from '@/components/admin/AdminShell';

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

      if (menuError) {
        console.error('Menu loading failed:', menuError);
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
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeStatusLoaded, setStoreStatusLoaded] = useState(false);

  useEffect(() => {
    const loadPublicVouchers = async () => {
      const { data, error } = await supabase
        .from('vouchers')
        .select('id,code,discount_type,discount_value,minimum_order,maximum_discount,active,expires_at')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (!error) {
        setVouchers(
          (data || []).map(v => ({
            id: v.id,
            code: v.code,
            type: v.discount_type,
            value: Number(v.discount_value),
            min: Number(v.minimum_order || 0),
            max: Number(v.maximum_discount || 0),
            active: v.active,
            expiresAt: v.expires_at
          }))
        );
      } else {
        console.error('Vouchers loading failed:', error);
      }
    };
    loadPublicVouchers();
  }, []);

  useEffect(() => {
    const loadBusinessSettings = async () => {
      const [
        { data: methods, error: methodsError },
        { data: feeRow, error: feeError },
        { data: hoursRow },
        { data: manualRow },
        { data: openNow, error: openError }
      ] = await Promise.all([
        supabase
          .from('payment_methods')
          .select('code,name,instructions,qr_image_url,enabled,display_order,requires_proof')
          .order('display_order'),
        supabase
          .from('business_settings')
          .select('setting_value')
          .eq('setting_key', 'delivery_fee')
          .maybeSingle(),
        supabase
          .from('business_settings')
          .select('setting_value')
          .eq('setting_key', 'store_hours')
          .maybeSingle(),
        supabase
          .from('business_settings')
          .select('setting_value')
          .eq('setting_key', 'store_manual_status')
          .maybeSingle(),
        supabase.rpc('is_store_open')
      ]);

      if (methodsError) console.error('Payment methods loading failed:', methodsError);
      else setPaymentMethods(methods || []);

      if (feeError) console.error('Delivery fee loading failed:', feeError);
      else if (feeRow?.setting_value !== undefined) setDeliveryFee(Number(feeRow.setting_value) || 0);

      if (hoursRow?.setting_value) setStoreHours(hoursRow.setting_value);
      if (manualRow?.setting_value) {
        setStoreManualStatus(String(manualRow.setting_value).replaceAll('"', ''));
      }
      if (!openError) {
        setStoreOpen(!!openNow);
        setStoreStatusLoaded(true);
      } else {
        console.error('Store status check failed:', openError);
      }
    };

    loadBusinessSettings();
    const statusTimer = setInterval(async () => {
      const { data, error } = await supabase.rpc('is_store_open');
      if (!error) {
        setStoreOpen(!!data);
        setStoreStatusLoaded(true);
      }
    }, 60000);
    return () => clearInterval(statusTimer);
  }, []);

  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const [view, setView] = useState(() =>
    window.location.hostname.startsWith('admin.') ||
    (['localhost', '127.0.0.1'].includes(window.location.hostname) &&
      window.location.pathname.startsWith('/admin'))
      ? 'admin'
      : 'customer'
  );

  useEffect(() => {
    const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!localHost && !window.location.hostname.startsWith('admin.') && window.location.pathname.startsWith('/admin')) {
      window.location.replace('https://admin.khantepinte.com.np/');
    }
  }, []);

  const [brandLogo, setBrandLogo] = useState('');
  useEffect(() => {
    let live = true;
    supabase
      .from('business_settings')
      .select('setting_value')
      .eq('setting_key', 'brand_logo_url')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        if (!error && data?.setting_value) {
          let value = data.setting_value;
          if (typeof value !== 'string') value = String(value);
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed === 'string') value = parsed;
          } catch {}
          setBrandLogo(value);
        }
      });
    return () => {
      live = false;
    };
  }, []);

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

    const verifyAdmin = async session => {
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

    const syncCustomerSession = async session => {
      if (!session?.user) {
        if (active) setCustomerAccount(null);
        saveStore('kp_customer_session', null);
        return;
      }

      const { data: adminRow, error: adminLookupError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!active) return;
      if (adminLookupError || adminRow) {
        setCustomerAccount(null);
        saveStore('kp_customer_session', null);
        return;
      }

      const metadata = session.user.user_metadata || {};
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

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerAuthOpen, setCustomerAuthOpen] = useState(false);
  const [customerAuthMode, setCustomerAuthMode] = useState('login');
  const [customerAccount, setCustomerAccount] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState(() => getStore('kp_last_order_id', ''));
  const [trackingPhone, setTrackingPhone] = useState('');
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(() => getStore('kp_last_order_id', ''));
  const [notice, setNotice] = useState('');
  const [closedNoticeDismissed, setClosedNoticeDismissed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (storeOpen) setClosedNoticeDismissed(false);
  }, [storeOpen]);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => saveStore('kp_vouchers', vouchers), [vouchers]);
  useEffect(() => saveStore('kp_riders', riders), [riders]);

  const filtered = products.filter(
    p =>
      (category === 'All' || p.category === category) &&
      `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  );
  const cartSubtotal = cart.reduce((s, x) => s + x.price * x.qty, 0);
  const delivery = cart.length ? deliveryFee : 0;
  const voucherDiscount = appliedVoucher ? Number(appliedVoucher.serverDiscount || 0) : 0;
  const cartCount = cart.reduce((s, x) => s + x.qty, 0);

  const add = p => {
    if (p.outOfStock) {
      setNotice('This item is currently out of stock.');
      return;
    }
    setCart(c => {
      const old = c.find(x => x.id === p.id);
      return old
        ? c.map(x => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x))
        : [...c, { ...p, qty: 1 }];
    });
  };

  const changeQty = (id, d) => {
    setCart(current =>
      current
        .map(item => (item.id === id ? { ...item, qty: item.qty + d } : item))
        .filter(item => item.qty > 0)
    );
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
        .select(
          'id, order_number, customer_name, customer_phone, delivery_address, order_type, order_source, status, subtotal, discount, delivery_fee, total, notes, tracking_token, business_date, created_at, payment_method, payment_status, payment_proof_path, cancellation_reason, rider_id, order_items(id, menu_item_id, item_name, quantity, unit_price, line_total), order_status_history(id, status, changed_at), rider:riders(id,name,phone)'
        )
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

  // Single Consolidated Realtime Channel for Admin
  useEffect(() => {
    if (!adminLogged) return;

    const loadRiders = async () => {
      const { data, error } = await supabase
        .from('riders')
        .select('id,name,phone,active')
        .eq('active', true)
        .order('name');
      if (error) {
        console.error('Riders loading failed:', error);
        return;
      }
      setRiders((data || []).map(r => r.name));
      setRiderIds(Object.fromEntries((data || []).map(r => [r.name, r.id])));
    };
    loadRiders();

    const loadVouchers = async () => {
      const { data, error } = await supabase
        .from('vouchers')
        .select('id,code,discount_type,discount_value,minimum_order,maximum_discount,active,expires_at')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Vouchers loading failed:', error);
        setNotice(`Could not load vouchers: ${error.message}`);
        return;
      }
      setVouchers(
        (data || []).map(v => ({
          id: v.id,
          code: v.code,
          type: v.discount_type,
          value: Number(v.discount_value),
          min: Number(v.minimum_order || 0),
          max: Number(v.maximum_discount || 0),
          active: v.active,
          expiresAt: v.expires_at
        }))
      );
    };
    loadVouchers();

    loadOrders(true);

    const channel = supabase
      .channel('admin-orders-unified-channel')
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
          setNotice(
            `NEW ORDER: KP-${row.order_number || ''} · ${row.customer_name || 'Customer'} · ${currency(
              Number(row.total || 0)
            )}`
          );
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        loadOrders(false);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_history' }, () => {
        loadOrders(false);
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime channel status:', status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
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
          const { data: riderRow, error: riderLookupError } = await supabase
            .from('riders')
            .select('id')
            .eq('name', details.rider)
            .eq('active', true)
            .maybeSingle();
          if (riderLookupError) throw riderLookupError;
          riderId = riderRow?.id || null;
        }
        payload.rider_id = riderId;
      }
      const { data: saved, error } = await supabase
        .from('orders')
        .insert(payload)
        .select('id, order_number')
        .single();
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
    if (!voucherInput.trim()) {
      setNotice('Enter a voucher code.');
      return;
    }
    const { data, error } = await supabase.rpc('validate_website_voucher', {
      p_code: voucherInput.trim().toUpperCase(),
      p_subtotal: cartSubtotal
    });
    if (error) {
      setNotice(`Could not validate voucher: ${error.message}`);
      return;
    }
    if (!data?.valid) {
      setAppliedVoucher(null);
      setNotice(data?.message || 'Voucher is invalid.');
      return;
    }
    const voucher = vouchers.find(v => v.code.toUpperCase() === data.code.toUpperCase()) || {
      code: data.code,
      active: true
    };
    setAppliedVoucher({ ...voucher, serverDiscount: Number(data.discount) });
    setNotice(`Voucher applied! You save ${currency(data.discount)}.`);
  };

  const submitCheckout = async form => {
    if (!cart.length) return;

    try {
      let paymentProofPath = null;
      if (form.paymentProof) {
        const extension = form.paymentProof.name.split('.').pop()?.toLowerCase() || 'jpg';
        paymentProofPath = `proofs/${crypto.randomUUID()}.${extension}`;
        const { error: proofUploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(paymentProofPath, form.paymentProof, {
            contentType: form.paymentProof.type,
            upsert: false
          });
        if (proofUploadError) throw proofUploadError;
      }
      const { data, error } = await supabase.rpc('create_website_order', {
        p_customer_name: form.name.trim(),
        p_customer_phone: form.phone.trim(),
        p_delivery_address: form.address.trim() || null,
        p_order_type: form.type.toLowerCase(),
        p_items: cart.map(item => ({
          id: item.id,
          qty: item.qty
        })),
        p_notes: [
          form.gift
            ? `GIFT ORDER — Recipient: ${form.recipientName}; recipient phone: ${form.recipientPhone}; delivery address: ${form.address}`
            : '',
          form.contactPhone ? `CUSTOMER CALLBACK NUMBER: ${form.contactPhone}` : '',
          form.note ? `Customer note: ${form.note}` : ''
        ]
          .filter(Boolean)
          .join(' | '),
        p_payment_method: form.paymentMethod || 'cash',
        p_payment_proof_path: paymentProofPath,
        p_voucher_code: appliedVoucher?.code || null
      });

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
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: status })
      .eq('id', order.dbId);
    if (error) {
      setNotice(`Could not update payment status: ${error.message}`);
      return;
    }
    await loadOrders(false);
    setNotice(`${id} payment marked ${status}.`);
  };

  const assignRider = async (id, rider) => {
    const order = orders.find(o => o.id === id);
    if (!order?.dbId) return;
    let riderId = rider ? riderIds[rider] : null;
    if (rider && !riderId) {
      const { data: riderRow, error: lookupError } = await supabase
        .from('riders')
        .select('id')
        .eq('name', rider)
        .eq('active', true)
        .maybeSingle();
      if (lookupError) {
        setNotice(`Could not find rider: ${lookupError.message}`);
        return;
      }
      riderId = riderRow?.id || null;
    }
    const { error } = await supabase.from('orders').update({ rider_id: riderId }).eq('id', order.dbId);
    if (error) {
      setNotice(`Could not assign rider: ${error.message}`);
      return;
    }
    await loadOrders(false);
    setNotice(rider ? `${rider} assigned to ${id}.` : `Rider removed from ${id}.`);
  };

  const cancelOrder = id => {
    const order = orders.find(item => item.id === id);
    if (!order?.dbId) {
      setNotice('This order is not saved in Supabase. Refresh orders and try again.');
      return;
    }
    setCancelTarget(order);
    setCancelReasonInput('');
  };

  const confirmCancelOrder = async () => {
    if (!cancelTarget?.dbId || cancelSaving) return;
    setCancelSaving(true);
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancellation_reason: cancelReasonInput.trim() || null })
      .eq('id', cancelTarget.dbId)
      .select('id,status,cancellation_reason')
      .single();
    setCancelSaving(false);
    if (error) {
      setNotice(`Could not cancel order: ${error.message}`);
      return;
    }
    if (!data || data.status !== 'cancelled') {
      setNotice('Order was not cancelled. Please refresh and try again.');
      return;
    }
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
      setAdminError(
        message.toLowerCase().includes('invalid login credentials')
          ? 'Incorrect email or password.'
          : message
      );
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
      setForgotMessage(
        'If this email belongs to an account, a password reset link has been sent. Check your inbox and spam folder.'
      );
    } catch (error) {
      setForgotMessage(
        error.message || 'Could not send the password reset email. Please try again later.'
      );
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
      setView(
        window.location.hostname.startsWith('admin.') ||
          (['localhost', '127.0.0.1'].includes(window.location.hostname) &&
            window.location.pathname.startsWith('/admin'))
          ? 'admin'
          : 'customer'
      );
    } catch (error) {
      setRecoveryError(error.message || 'Could not update password. The reset link may have expired.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const stats = useMemo(() => {
    const day = businessDate();
    const dayOrders = orders.filter(o => o.businessDate === day && o.status !== 'Cancelled');
    const sales = dayOrders.reduce((s, o) => s + o.total, 0);
    return {
      dayOrders,
      sales,
      avg: dayOrders.length ? sales / dayOrders.length : 0,
      all: orders.length
    };
  }, [orders]);

  if (recoveryMode) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="brand-mark large">KP</div>
          <span className="eyebrow">ACCOUNT RECOVERY</span>
          <h1>
            Set new <em>password</em>
          </h1>
          <p>Choose a new password for your Khante Pinte account.</p>
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmNewPassword}
              onChange={e => setConfirmNewPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveNewPassword()}
              placeholder="Enter the password again"
            />
          </label>
          {recoveryError && <p className="form-error">{recoveryError}</p>}
          <button
            className="btn-primary full"
            onClick={saveNewPassword}
            disabled={recoveryLoading}
          >
            {recoveryLoading ? 'Updating password...' : 'Update password'}
          </button>
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
        onBack={() => {
          window.location.href = window.location.hostname.startsWith('admin.')
            ? 'https://khantepinte.com.np/'
            : '/';
        }}
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

  return (
    <div className="app-shell">
      {view === 'customer' ? (
        <>
          <Header
            brandLogo={brandLogo}
            customerAccount={customerAccount}
            onOpenAccount={() => setAccountOpen(true)}
            onLogoutCustomer={async () => {
              await supabase.auth.signOut();
              setCustomerAccount(null);
              saveStore('kp_customer_session', null);
              setNotice('You have been logged out.');
            }}
            onOpenAuth={() => setCustomerAuthOpen(true)}
            onOpenTracking={() => {
              setTrackingOrderId(lastOrderId || trackingOrderId || getStore('kp_last_order_id', ''));
              setTrackingPhone('');
              setTrackingOpen(true);
            }}
            onOpenCart={() =>
              storeOpen
                ? setCheckoutOpen(true)
                : setNotice(
                    'Khante Pinte is currently closed. Please order during our business hours.'
                  )
            }
            cartCount={cartCount}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
          />

          <main id="top">
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span
                    className="dot-live"
                    style={{ background: storeOpen ? '#16a34a' : '#dc2626' }}
                  />{' '}
                  {storeOpen ? 'WE ARE OPEN' : 'CURRENTLY CLOSED'} ·{' '}
                  {formatTime12(storeHours.open_time)} — {formatTime12(storeHours.close_time)}
                </div>
                <h1>
                  Late night.
                  <br />
                  <em>Great bites.</em>
                </h1>
                <p>
                  When hunger doesn't sleep, neither do we. Fresh food, bold flavours, delivered to
                  your door in Biratnagar.
                </p>
                <div className="hero-cta">
                  <a className="btn-primary" href="#menu">
                    Explore menu <ChevronRight />
                  </a>
                  <span>
                    <Clock3 size={16} /> Night delivery
                  </span>
                </div>
                <div className="hero-meta">
                  <span>
                    <MapPin size={15} /> Biratnagar
                  </span>
                  <span>
                    <Phone size={15} /> 9849073408
                  </span>
                </div>
              </div>
              <div className="hero-art">
                <div className="hero-orbit orbit-1" />
                <div className="hero-orbit orbit-2" />
                <div className="hero-food">🍜</div>
                <div className="hero-sticker sticker-top">
                  OPEN
                  <br />
                  <b>{formatTime12(storeHours.open_time)}</b>
                </div>
                <div className="hero-sticker sticker-bottom">
                  <b>{formatTime12(storeHours.close_time)}</b>
                  <br />
                  CLOSING
                </div>
                <div className="hero-art-caption">
                  NIGHT CRAVINGS
                  <br />
                  <strong>MADE RIGHT.</strong>
                </div>
              </div>
            </section>

            <section className="benefits">
              <div>
                <Clock3 />
                <span>
                  <strong>Night service</strong>
                  <small>
                    {formatTime12(storeHours.open_time)} – {formatTime12(storeHours.close_time)}
                  </small>
                </span>
              </div>
              <div>
                <Bike />
                <span>
                  <strong>Delivery</strong>
                  <small>Biratnagar</small>
                </span>
              </div>
              <div>
                <Wallet />
                <span>
                  <strong>Easy payment</strong>
                  <small>Cash on delivery</small>
                </span>
              </div>
              <div>
                <Phone />
                <span>
                  <strong>Call to order</strong>
                  <small>9849073408</small>
                </span>
              </div>
            </section>

            <section id="menu" className="menu-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">THE MENU</span>
                  <h2>
                    What are you <em>craving?</em>
                  </h2>
                  <p>Find your favourites and let the night get delicious.</p>
                  <div className="menu-count-badge">
                    <span className="menu-count-icon">✦</span>
                    <span className="menu-count-number">{products.length}</span>
                    <span className="menu-count-copy">
                      <strong>delicious choices</strong>
                      <small>and counting on your cravings</small>
                    </span>
                    <span className="menu-count-sparkle">✧</span>
                  </div>
                </div>
                <div className="search-box">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search the menu..."
                  />
                </div>
              </div>
              <div className="category-row">
                {dbCategories.map(c => (
                  <button
                    key={c}
                    className={category === c ? 'category-active' : ''}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="food-grid">
                {filtered.map(p => (
                  <FoodCard
                    key={p.id}
                    product={p}
                    onAdd={() => add(p)}
                    onOpen={() => setSelectedProduct(p)}
                    cartQty={cart.find(x => x.id === p.id)?.qty || 0}
                  />
                ))}
              </div>
              {!filtered.length && (
                <div className="empty-state">No menu items found. Try another search.</div>
              )}
            </section>

            <section
              id="about"
              className={`about-strip ${brandLogo ? 'about-strip-branded' : ''}`}
            >
              {brandLogo && (
                <img className="kp-about-logo" src={brandLogo} alt="Khante Pinte logo" />
              )}
              <div>
                <span className="eyebrow">OUR PROMISE</span>
                <h2>
                  Good food.
                  <br />
                  No <em>compromise.</em>
                </h2>
              </div>
              <p>
                Khante Pinte is here for those late-night moments. Whether it's a quick snack, a
                full meal or something to share with friends, we're bringing flavour to your night.
              </p>
              <div className="about-icon">🌙</div>
            </section>

            <Footer brandLogo={brandLogo} storeHours={storeHours} />
          </main>

          {storeStatusLoaded && !storeOpen && !closedNoticeDismissed && (
            <div
              className="modal-backdrop"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 12000,
                background: 'rgba(12,18,28,.72)',
                backdropFilter: 'blur(5px)',
                display: 'grid',
                placeItems: 'center',
                padding: 20
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="closed-store-title"
                style={{
                  width: 'min(470px,100%)',
                  background: '#fff',
                  borderRadius: 24,
                  padding: '32px 28px',
                  textAlign: 'center',
                  boxShadow: '0 28px 90px rgba(0,0,0,.3)'
                }}
              >
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 24,
                    margin: '0 auto 18px',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#fff1e8',
                    fontSize: 38
                  }}
                >
                  🌙
                </div>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: 2,
                    fontWeight: 800,
                    color: '#d97706',
                    marginBottom: 10
                  }}
                >
                  A LITTLE BREAK BEFORE THE NEXT BITE
                </div>
                <h2
                  id="closed-store-title"
                  style={{
                    fontSize: 28,
                    lineHeight: 1.15,
                    margin: '0 0 12px',
                    color: '#182230'
                  }}
                >
                  We’re closed for now.
                </h2>
                <p style={{ color: '#667085', lineHeight: 1.65, margin: '0 0 18px' }}>
                  Our kitchen is taking a short rest, but the cravings don’t have to wait too
                  long. We’ll be back and cooking fresh for you at{' '}
                  <strong>{formatTime12(storeHours.open_time)}</strong>.
                </p>
                <div
                  style={{
                    border: '1px solid #f0e2d5',
                    background: '#fffaf5',
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 20
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1.2,
                      color: '#98a2b3'
                    }}
                  >
                    OUR DAILY HOURS
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#202939',
                      marginTop: 5
                    }}
                  >
                    {formatTime12(storeHours.open_time)} – {formatTime12(storeHours.close_time)}
                  </div>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 5 }}>
                    Nepal time (NPT)
                  </div>
                </div>
                <p style={{ color: '#667085', fontSize: 13, margin: '0 0 20px' }}>
                  Feel free to explore the menu while we get ready. Online ordering will open
                  right on time. Thanks for keeping your late-night cravings with Khante Pinte!
                  ❤️
                </p>
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: 14 }}
                  onClick={() => {
                    setClosedNoticeDismissed(true);
                    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Explore the menu
                </button>
                <button
                  className="btn-outline"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                  onClick={() => setClosedNoticeDismissed(true)}
                >
                  Got it
                </button>
              </div>
            </div>
          )}

          {selectedProduct && (
            <ProductDetailModal
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onAdd={() => add(selectedProduct)}
              account={customerAccount}
              onSignUp={() => {
                setSelectedProduct(null);
                setCustomerAuthMode('signup');
                setCustomerAuthOpen(true);
              }}
            />
          )}

          {customerAuthOpen && (
            <CustomerAuth
              onGoogle={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: window.location.origin }
                });
                if (error) setNotice(`Google sign-in failed: ${error.message}`);
              }}
              mode={customerAuthMode}
              setMode={setCustomerAuthMode}
              onClose={() => setCustomerAuthOpen(false)}
              onAuth={account => {
                setCustomerAccount(account);
                saveStore('kp_customer_session', account);
                setCustomerAuthOpen(false);
                setNotice(`Welcome to Khante Pinte, ${account.name}! Your account is ready.`);
              }}
            />
          )}

          {accountOpen && customerAccount && (
            <CustomerAccountPanel
              account={customerAccount}
              onClose={() => setAccountOpen(false)}
              onUpdated={updates =>
                setCustomerAccount(current => ({ ...current, ...updates }))
              }
            />
          )}

          {trackingOpen && (
            <OrderTracking
              orderId={trackingOrderId}
              phone={trackingPhone}
              account={customerAccount}
              onClose={() => setTrackingOpen(false)}
              onLookup={(id, ph) => {
                setTrackingOrderId(id);
                setTrackingPhone(ph);
              }}
            />
          )}

          {checkoutOpen && (
            <Checkout
              account={customerAccount}
              cart={cart}
              subtotal={cartSubtotal}
              delivery={delivery}
              paymentMethods={paymentMethods}
              discount={voucherDiscount}
              total={total}
              voucher={voucherInput}
              setVoucher={setVoucherInput}
              applyVoucher={applyVoucher}
              applied={appliedVoucher}
              onChangeQty={changeQty}
              onRemoveItem={removeCartItem}
              onClose={() => setCheckoutOpen(false)}
              onSubmit={submitCheckout}
            />
          )}
        </>
      ) : (
        <AdminShell
          section={adminSection}
          setSection={setAdminSection}
          orders={orders}
          ordersLoading={ordersLoading}
          ordersError={ordersError}
          refreshOrders={() => loadOrders(true)}
          products={products}
          setProducts={setProducts}
          riders={riders}
          setRiders={setRiders}
          vouchers={vouchers}
          setVouchers={setVouchers}
          stats={stats}
          newOrder={newOrder}
          changeStatus={changeStatus}
          assignRider={assignRider}
          cancelOrder={cancelOrder}
          changePaymentStatus={changePaymentStatus}
          paymentMethods={paymentMethods}
          setPaymentMethods={setPaymentMethods}
          deliveryFee={deliveryFee}
          setDeliveryFee={setDeliveryFee}
          storeHours={storeHours}
          setStoreHours={setStoreHours}
          storeManualStatus={storeManualStatus}
          setStoreManualStatus={setStoreManualStatus}
          storeOpen={storeOpen}
          setStoreOpen={setStoreOpen}
          notifications={notifications}
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          onClearNotifications={() => setNotifications([])}
          newOrderAlert={newOrderAlert}
          onDismissNewOrderAlert={() => setNewOrderAlert(null)}
          onCustomer={() => {
            window.location.href = window.location.hostname.startsWith('admin.')
              ? 'https://khantepinte.com.np/'
              : '/';
          }}
          onLogout={logoutAdmin}
          brandLogo={brandLogo}
          setBrandLogo={setBrandLogo}
        />
      )}

      {cancelTarget && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,.48)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
        >
          <div
            className="panel"
            style={{
              width: 'min(480px,100%)',
              padding: 24,
              background: '#fff',
              boxShadow: '0 20px 60px rgba(0,0,0,.2)'
            }}
          >
            <h2 style={{ marginTop: 0 }}>Cancel order {cancelTarget.id}?</h2>
            <p style={{ color: '#667085' }}>
              This order will be moved to the Cancelled Orders page. You can optionally tell the
              customer why it was cancelled.
            </p>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>
              Cancellation reason (optional)
            </label>
            <textarea
              rows={4}
              value={cancelReasonInput}
              onChange={e => setCancelReasonInput(e.target.value)}
              placeholder="e.g. Item unavailable, customer requested cancellation…"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 10,
                resize: 'vertical'
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 18
              }}
            >
              <button
                className="btn-outline"
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReasonInput('');
                }}
                disabled={cancelSaving}
              >
                Keep order
              </button>
              <button
                className="danger-btn"
                onClick={confirmCancelOrder}
                disabled={cancelSaving}
              >
                {cancelSaving ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div className="toast">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss notice">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
