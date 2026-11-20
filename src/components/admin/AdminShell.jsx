import React, { useState } from 'react';
import {
  Bell,
  LayoutDashboard,
  ClipboardList,
  ChefHat,
  Store,
  Package,
  Bike,
  Tag,
  TrendingUp,
  Settings2,
  RefreshCw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { currency } from '@/utils/formatters';
import { isSoundEnabled, setSoundEnabled, playNewOrderChime } from '@/utils/audioChime';
import { Dashboard } from '@/components/admin/Dashboard';
import { Orders } from '@/components/admin/Orders';
import { CancelledOrders } from '@/components/admin/CancelledOrders';
import { KDS } from '@/components/admin/KDS';
import { POS } from '@/components/admin/POS';
import { MenuStock } from '@/components/admin/MenuStock';
import { RiderManager } from '@/components/admin/RiderManager';
import { VoucherManager } from '@/components/admin/VoucherManager';
import { Reports } from '@/components/admin/Reports';
import { BusinessSettings } from '@/components/admin/BusinessSettings';

const adminNav = [
  ['Dashboard', LayoutDashboard],
  ['Orders', ClipboardList],
  ['Cancelled Orders', ClipboardList],
  ['Kitchen Display', ChefHat],
  ['POS', Store],
  ['Menu & Stock', Package],
  ['Riders', Bike],
  ['Vouchers', Tag],
  ['Reports', TrendingUp],
  ['Settings', Settings2]
];

export function AdminShell({
  section,
  setSection,
  orders,
  ordersLoading,
  ordersError,
  refreshOrders,
  products,
  setProducts,
  riders,
  setRiders,
  vouchers,
  setVouchers,
  stats,
  newOrder,
  changeStatus,
  assignRider,
  cancelOrder,
  changePaymentStatus,
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
  notifications = [],
  notificationsOpen = false,
  setNotificationsOpen = () => {},
  onClearNotifications = () => {},
  newOrderAlert = null,
  onDismissNewOrderAlert = () => {},
  onCustomer,
  onLogout,
  brandLogo,
  setBrandLogo
}) {
  const [soundActive, setSoundActive] = useState(() => isSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) {
      playNewOrderChime();
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          {brandLogo ? (
            <img className="kp-brand-logo" src={brandLogo} alt="Khante Pinte" />
          ) : (
            <span className="brand-mark">KP</span>
          )}
          <div>
            <strong>KHANTE PINTE</strong>
            <small>Management</small>
          </div>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        {adminNav.map(([name, Icon]) => (
          <button
            key={name}
            className={`nav-item ${section === name ? 'nav-active' : ''}`}
            onClick={() => setSection(name)}
          >
            <Icon size={18} />
            {name}
          </button>
        ))}
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={onCustomer}>
            <Store size={18} />
            Customer website
          </button>
          <span className="prototype-pill">SUPABASE CONNECTED</span>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">KHANTE PINTE / {section.toUpperCase()}</span>
            <h1>{section}</h1>
          </div>
          <div className="topbar-right">
            <button
              className="icon-btn"
              title={soundActive ? 'Order audio chime enabled (Click to mute)' : 'Order audio chime muted (Click to enable)'}
              aria-label="Toggle Order Alert Sound"
              onClick={handleToggleSound}
              style={{
                color: soundActive ? '#16a34a' : '#98a2b3',
                borderColor: soundActive ? '#bbf7d0' : '#e4e7ec'
              }}
            >
              {soundActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <span className="shift-chip">
              <span className="dot-live" /> Night shift
            </span>
            <div style={{ position: 'relative' }}>
              <button
                className="icon-btn"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{ position: 'relative' }}
              >
                <Bell />
                {notifications.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 18,
                      height: 18,
                      padding: '0 4px',
                      borderRadius: 99,
                      background: '#dc2626',
                      color: '#fff',
                      fontSize: 10,
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700
                    }}
                  >
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 48,
                    width: 320,
                    maxWidth: '85vw',
                    background: '#fff',
                    border: '1px solid #e4e7ec',
                    borderRadius: 14,
                    boxShadow: '0 12px 35px rgba(16,24,40,.16)',
                    zIndex: 1000,
                    padding: 14
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10
                    }}
                  >
                    <strong>Notifications</strong>
                    <button
                      className="btn-outline"
                      style={{ padding: '5px 8px', fontSize: 11 }}
                      onClick={onClearNotifications}
                    >
                      Clear all
                    </button>
                  </div>
                  {notifications.length ? (
                    <div style={{ maxHeight: 330, overflowY: 'auto', display: 'grid', gap: 10 }}>
                      {notifications.map(n => (
                        <div key={n.id} style={{ padding: '9px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <strong style={{ display: 'block', fontSize: 13 }}>{n.title}</strong>
                          <small style={{ color: '#667085' }}>{n.message}</small>
                          <small style={{ display: 'block', color: '#98a2b3', marginTop: 3 }}>
                            {new Date(n.time).toLocaleTimeString()}
                          </small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#667085', fontSize: 13, margin: '12px 0' }}>
                      No new notifications. New orders will appear here automatically.
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="admin-avatar">KP</div>
            <button className="btn-outline admin-logout" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="admin-content">
          {newOrderAlert && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '16px 20px',
                marginBottom: 18,
                borderRadius: 14,
                background: '#fff4d6',
                border: '2px solid #f2b84b',
                boxShadow: '0 4px 16px rgba(0,0,0,.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>🔔</span>
                <div>
                  <strong style={{ display: 'block', fontSize: 16, color: '#7a3e00' }}>
                    NEW ORDER RECEIVED · KP-{newOrderAlert.orderNumber}
                  </strong>
                  <span style={{ color: '#7a3e00', fontSize: 13 }}>
                    {newOrderAlert.customer} · {currency(newOrderAlert.amount)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setSection('Orders');
                    onDismissNewOrderAlert();
                  }}
                >
                  View order
                </button>
                <button
                  className="btn-outline"
                  aria-label="Dismiss new order alert"
                  onClick={onDismissNewOrderAlert}
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {section === 'Dashboard' && (
            <Dashboard
              orders={orders}
              stats={stats}
              products={products}
              setSection={setSection}
            />
          )}

          {section === 'Orders' && (
            <Orders
              orders={orders}
              loading={ordersLoading}
              error={ordersError}
              onRefresh={refreshOrders}
              changeStatus={changeStatus}
              assignRider={assignRider}
              riders={riders}
              cancelOrder={cancelOrder}
              changePaymentStatus={changePaymentStatus}
            />
          )}

          {section === 'Cancelled Orders' && (
            <CancelledOrders
              orders={orders}
              loading={ordersLoading}
              error={ordersError}
              onRefresh={refreshOrders}
            />
          )}

          {section === 'Kitchen Display' && (
            <>
              <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                <span>
                  {ordersLoading ? 'Loading orders…' : `${orders.length} orders loaded`}
                </span>
                <button className="btn-outline" onClick={refreshOrders}>
                  <RefreshCw size={15} /> Refresh orders
                </button>
              </div>
              {ordersError && (
                <div className="form-error" style={{ padding: 12, marginBottom: 12 }}>
                  Could not load orders: {ordersError}
                </div>
              )}
              <KDS orders={orders} changeStatus={changeStatus} />
            </>
          )}

          {section === 'POS' && (
            <POS
              products={products}
              newOrder={newOrder}
              riders={riders}
              paymentMethods={paymentMethods}
              deliveryFee={deliveryFee}
            />
          )}

          {section === 'Menu & Stock' && (
            <MenuStock products={products} setProducts={setProducts} />
          )}

          {section === 'Riders' && (
            <RiderManager
              riders={riders}
              setRiders={setRiders}
              orders={orders}
            />
          )}

          {section === 'Vouchers' && (
            <VoucherManager
              vouchers={vouchers}
              setVouchers={setVouchers}
            />
          )}

          {section === 'Reports' && <Reports orders={orders} />}

          {section === 'Settings' && (
            <BusinessSettings
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
              brandLogo={brandLogo}
              setBrandLogo={setBrandLogo}
            />
          )}
        </div>
      </main>
    </div>
  );
}
