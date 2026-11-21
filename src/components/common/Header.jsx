import React from 'react';
import { LogIn, ShoppingBag, Menu as MenuIcon, Instagram, Facebook } from 'lucide-react';

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
}) {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top">
          {brandLogo ? (
            <img className="kp-header-logo" src={brandLogo} alt="Khante Pinte" />
          ) : (
            <span className="brand-mark">KP</span>
          )}
          <span>
            <strong>KHANTE PINTE</strong>
            <small>Late night cravings, sorted.</small>
          </span>
        </a>
        <nav className="main-nav">
          <a href="#menu">Menu</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <div className="header-social-group">
            <a
              href="https://www.instagram.com/khantepinte.biratnagar?utm_source=ig_web_button_share_sheet&dmpr=ZDNlZDc0MzIxNw=="
              target="_blank"
              rel="noreferrer"
              className="social-nav-btn insta"
              aria-label="Instagram"
              title="Follow Khante Pinte on Instagram"
            >
              <Instagram size={17} />
            </a>
            <a
              href="https://www.facebook.com/KhantePinte.biratnagar/"
              target="_blank"
              rel="noreferrer"
              className="social-nav-btn fb"
              aria-label="Facebook"
              title="Follow Khante Pinte on Facebook"
            >
              <Facebook size={17} />
            </a>
          </div>
        </nav>
        <div className="header-actions">
          {customerAccount ? (
            <>
              <button className="customer-account-trigger" onClick={onOpenAccount}>
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
              <button className="btn-outline customer-logout" onClick={onLogoutCustomer}>
                <LogIn size={16} /> Logout
              </button>
            </>
          ) : (
            <button className="btn-outline" onClick={onOpenAuth}>
              <LogIn size={16} /> Login
            </button>
          )}
          <button className="btn-outline" onClick={onOpenTracking}>
            Track order
          </button>
          <button className="cart-button" onClick={onOpenCart}>
            <ShoppingBag size={18} /> <span>Cart</span>
            <b>{cartCount}</b>
          </button>
          <button
            className="icon-btn mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            <MenuIcon />
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="mobile-nav">
          <a href="#menu" onClick={() => setMenuOpen(false)}>
            Menu
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            About
          </a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>
            Contact
          </a>
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
        </div>
      )}
    </>
  );
}
