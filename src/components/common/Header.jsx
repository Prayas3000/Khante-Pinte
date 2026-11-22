import React from 'react';
import { LogIn, ShoppingBag, Menu as MenuIcon, X, Instagram, Facebook, ChevronRight, Package, Clock, Moon, Sun, Search, Tag } from 'lucide-react';

export function Header({
  brandLogo,
  customerAccount,
  onOpenAccount,
  onLogoutCustomer,
  onOpenAuth,
  onOpenTracking,
  onOpenCart,
  cartCount,
  menuOpen,
  setMenuOpen,
  theme = 'light',
  toggleTheme,
  onGoToRider,
  onOpenOffers
}) {
  const handleSearchClick = () => {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
      searchInput.focus();
      document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top">
          {brandLogo ? (
            <img className="kp-header-logo" src={brandLogo} alt="Khante Pinte" />
          ) : (
            <span className="brand-mark">KP</span>
          )}
          <span className="brand-text-block">
            <strong className="brand-name">Khante Pinte</strong>
            <small className="brand-tagline">Biratnagar's Late Night Food Hub</small>
          </span>
        </a>
        <nav className="main-nav">
          <a href="#top" className="nav-pill-home">Home</a>
          <a href="#menu" className="nav-link-item">Menu</a>
          {onOpenOffers && (
            <button
              type="button"
              className="nav-link-item nav-link-btn"
              onClick={onOpenOffers}
            >
              Offers
            </button>
          )}
          <button
            type="button"
            className="nav-link-item nav-link-btn"
            onClick={onOpenTracking}
          >
            Track Order
          </button>
          <a href="#about" className="nav-link-item">About</a>
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="icon-btn header-search-trigger"
            onClick={handleSearchClick}
            aria-label="Search Menu"
            title="Search Menu"
          >
            <Search size={18} />
          </button>

          <button className="header-cart-btn" onClick={onOpenCart} aria-label={`View cart, ${cartCount} items`}>
            <ShoppingBag size={19} />
            {cartCount > 0 && <span className="header-cart-badge">{cartCount}</span>}
          </button>

          {customerAccount ? (
            <div className="header-user-wrapper">
              <button className="customer-account-trigger" onClick={onOpenAccount} title="My Account & Orders">
                <span className="customer-avatar-mini">
                  {customerAccount.avatarUrl ? (
                    <img src={customerAccount.avatarUrl} alt="" />
                  ) : (
                    (customerAccount.name || 'K').slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="customer-welcome">
                  <small>WELCOME BACK</small>
                  <strong>
                    {customerAccount.name && !String(customerAccount.name).includes('@')
                      ? customerAccount.name
                      : 'Food lover'}
                  </strong>
                </span>
                <span className="account-chevron">⌄</span>
              </button>
            </div>
          ) : (
            <button className="header-login-pill" onClick={onOpenAuth} title="Customer Login / Sign Up">
              <LogIn size={16} /> <span>Login</span>
            </button>
          )}

          {/* One-click Dark / Light Mode Toggle */}
          <button
            type="button"
            className="theme-toggle-btn icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun size={18} className="theme-icon sun" />
            ) : (
              <Moon size={18} className="theme-icon moon" />
            )}
          </button>

          <button
            className={`icon-btn mobile-menu ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </header>

      {/* Responsive Full-Featured Mobile Drawer */}
      {menuOpen && (
        <div className="mobile-nav-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="mobile-nav" onClick={e => e.stopPropagation()}>
            {/* Customer Account / Login Card */}
            {customerAccount ? (
              <div className="mobile-auth-card logged-in">
                <div className="mobile-user-row">
                  <span className="customer-avatar-mini large">
                    {customerAccount.avatarUrl ? (
                      <img src={customerAccount.avatarUrl} alt="" />
                    ) : (
                      (customerAccount.name || 'K').slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div className="mobile-user-info">
                    <span className="mobile-auth-eyebrow">SIGNED IN</span>
                    <strong>{customerAccount.name || 'Food lover'}</strong>
                    <small>{customerAccount.email || customerAccount.phone || ''}</small>
                  </div>
                </div>
                <div className="mobile-auth-actions">
                  <button
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px 14px', fontSize: 13 }}
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAccount();
                    }}
                  >
                    My Account & Orders
                  </button>
                  <button
                    className="btn-outline"
                    style={{ padding: '10px 14px', fontSize: 13, color: '#b42318' }}
                    onClick={() => {
                      setMenuOpen(false);
                      onLogoutCustomer();
                    }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="mobile-auth-card">
                <div className="mobile-auth-copy">
                  <span className="mobile-auth-badge">WELCOME TO KHANTE PINTE 🍲</span>
                  <strong>Login or Sign Up</strong>
                  <p>Track your orders, view order history, and save delivery addresses in Biratnagar.</p>
                </div>
                <button
                  className="btn-primary full"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAuth();
                  }}
                >
                  <LogIn size={16} /> Login / Create Account
                </button>
              </div>
            )}

            {/* Quick Navigation Items */}
            <div className="mobile-nav-links">
              <button
                className="mobile-nav-link-btn"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenTracking();
                }}
              >
                <span className="mobile-nav-icon">📦</span>
                <div>
                  <strong>Track Your Order</strong>
                  <small>Check live kitchen and rider status</small>
                </div>
                <ChevronRight size={18} className="mobile-link-chevron" />
              </button>

              <button
                className="mobile-nav-link-btn"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenCart();
                }}
              >
                <span className="mobile-nav-icon">🛒</span>
                <div>
                  <strong>Your Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})</strong>
                  <small>Review items and proceed to checkout</small>
                </div>
                <ChevronRight size={18} className="mobile-link-chevron" />
              </button>

              <a
                href="#menu"
                className="mobile-nav-link-btn"
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-nav-icon">🍽️</span>
                <div>
                  <strong>Explore Full Menu (176+ Items)</strong>
                  <small>Momo, Biryani, Chowmein, Curries, Pizza & more</small>
                </div>
                <ChevronRight size={18} className="mobile-link-chevron" />
              </a>

              <a
                href="#about"
                className="mobile-nav-link-btn"
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-nav-icon">🌙</span>
                <div>
                  <strong>About Khante Pinte</strong>
                  <small>Buspark, Biratnagar · Night delivery</small>
                </div>
                <ChevronRight size={18} className="mobile-link-chevron" />
              </a>

              <a
                href="#contact"
                className="mobile-nav-link-btn"
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-nav-icon">📞</span>
                <div>
                  <strong>Contact & Phone Support</strong>
                  <small>Direct phone & WhatsApp hotline</small>
                </div>
                <ChevronRight size={18} className="mobile-link-chevron" />
              </a>

              {/* Mobile Drawer Dark Mode Toggle */}
              <button
                type="button"
                className="mobile-nav-link-btn theme-mobile-row"
                onClick={() => {
                  if (toggleTheme) toggleTheme();
                }}
              >
                <span className="mobile-nav-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
                <div>
                  <strong>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</strong>
                  <small>{theme === 'dark' ? 'Comfortable light display' : 'Late-night dark theme'}</small>
                </div>
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    background: theme === 'dark' ? '#b9ed75' : '#191916',
                    color: theme === 'dark' ? '#12180c' : '#ffffff'
                  }}
                >
                  {theme === 'dark' ? 'DARK ON' : 'LIGHT ON'}
                </span>
              </button>

              {onGoToRider && (
                <button
                  type="button"
                  className="mobile-nav-link-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onGoToRider();
                  }}
                >
                  <span className="mobile-nav-icon">🚴</span>
                  <div>
                    <strong>Rider Delivery Portal</strong>
                    <small>Rider login, active tasks & earnings</small>
                  </div>
                  <ChevronRight size={18} className="mobile-link-chevron" />
                </button>
              )}
            </div>

            {/* Social Links */}
            <div className="mobile-social-pills">
              <a
                href="https://www.instagram.com/khantepinte.biratnagar?utm_source=ig_web_button_share_sheet&dmpr=ZDNlZDc0MzIxNw=="
                target="_blank"
                rel="noreferrer"
                className="mobile-social-pill insta"
              >
                <Instagram size={17} /> Instagram
              </a>
              <a
                href="https://www.facebook.com/KhantePinte.biratnagar/"
                target="_blank"
                rel="noreferrer"
                className="mobile-social-pill fb"
              >
                <Facebook size={17} /> Facebook
              </a>
            </div>

            {/* Store Hours Badge */}
            <div className="mobile-store-status">
              <Clock size={15} style={{ color: '#16a34a' }} />
              <span>Night delivery daily: <strong>9:00 PM – 4:00 AM (NPT)</strong></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
