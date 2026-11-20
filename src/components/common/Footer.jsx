import React from 'react';
import { MapPin, Clock3, Phone, Instagram, Facebook } from 'lucide-react';
import { formatTime12 } from '@/utils/formatters';

export function Footer({ brandLogo, storeHours }) {
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
        <a href="tel:9849073408">
          <Phone size={14} /> 9849073408
        </a>
        <a href="https://wa.me/9849073408" target="_blank" rel="noreferrer">
          WhatsApp 9849073408 (Primary)
        </a>
        <a href="https://wa.me/9822551213" target="_blank" rel="noreferrer">
          WhatsApp 9822551213
        </a>
        <a href="https://wa.me/9764463286" target="_blank" rel="noreferrer">
          WhatsApp 9764463286
        </a>
        <a href="https://wa.me/9709027043" target="_blank" rel="noreferrer">
          WhatsApp 9709027043
        </a>
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
        © {new Date().getFullYear()} Khante Pinte. All rights reserved.{' '}
        <span>Made for late-night cravings. ♥</span>
      </div>
    </footer>
  );
}
