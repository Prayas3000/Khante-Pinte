import React from 'react';
import { MapPin, Clock3, Phone, Instagram, Facebook } from 'lucide-react';
import { formatTime12 } from '@/utils/formatters';

export function Footer({ brandLogo, storeHours, onGoToRider }) {
  return (
    <footer id="contact" className="footer kp-footer">
      <div className="footer-brand">
        {brandLogo ? (
          <img className="kp-footer-logo" src={brandLogo} alt="Khante Pinte logo" />
        ) : (
          <span className="brand-mark">KP</span>
        )}
        <div>
          <strong>KHANTE PINTE</strong>
          <small>Late night cravings, sorted.</small>
          <p>
            Good food, comforting flavours and late-night happiness — serving Biratnagar with fresh,
            satisfying bites when cravings strike.
          </p>
        </div>
      </div>
      <div className="footer-column">
        <strong>ABOUT US</strong>
        <p>
          Khante Pinte is your neighbourhood food stop for delicious meals, snacks and late-night
          cravings. We believe good food brings people together, whether you are ordering for
          yourself, your family or someone special.
        </p>
      </div>
      <div className="footer-column">
        <strong>VISIT & CONTACT</strong>
        <p>
          <MapPin size={14} /> Buspark, Biratnagar, Nepal
        </p>
        <p>
          <Clock3 size={14} /> {formatTime12(storeHours.open_time)} – {formatTime12(storeHours.close_time)} (NPT)
        </p>
        
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary, #182230)' }}>Primary: </span>
            <a href="tel:9849073408" style={{ textDecoration: 'underline' }}>9849073408</a>
            {' · '}
            <a href="https://wa.me/9779849073408" target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 600 }}>WhatsApp</a>
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary, #182230)' }}>Alt 1: </span>
            <a href="tel:9822551213" style={{ textDecoration: 'underline' }}>9822551213</a>
            {' · '}
            <a href="https://wa.me/9779822551213" target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 600 }}>WhatsApp</a>
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary, #182230)' }}>Alt 2: </span>
            <a href="tel:9764463286" style={{ textDecoration: 'underline' }}>9764463286</a>
            {' · '}
            <a href="https://wa.me/9779764463286" target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 600 }}>WhatsApp</a>
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary, #182230)' }}>Alt 3: </span>
            <a href="tel:9709027043" style={{ textDecoration: 'underline' }}>9709027043</a>
            {' · '}
            <a href="https://wa.me/9779709027043" target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 600 }}>WhatsApp</a>
          </div>
        </div>
      </div>
      <div className="footer-column">
        <strong>FOLLOW OUR FOOD JOURNEY</strong>
        <a
          href="https://www.instagram.com/khantepinte.biratnagar?utm_source=ig_web_button_share_sheet&dmpr=ZDNlZDc0MzIxNw=="
          target="_blank"
          rel="noreferrer"
        >
          <Instagram size={16} aria-hidden="true" /> Instagram
        </a>
        <a
          href="https://www.facebook.com/KhantePinte.biratnagar/"
          target="_blank"
          rel="noreferrer"
        >
          <Facebook size={16} aria-hidden="true" /> Facebook
        </a>
        <small>Follow us for updates, offers and delicious moments.</small>
      </div>
      <div className="footer-bottom">
        <div>
          © {new Date().getFullYear()} Khante Pinte. All rights reserved.{' '}
          <span>Made for late-night cravings. ♥</span>
        </div>
        {onGoToRider && (
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={onGoToRider}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary, #94a3b8)',
                fontSize: 12,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px 8px'
              }}
            >
              🚴 Rider Portal
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
