import React from 'react';
import { X, Sparkles, Tag, Check, ArrowRight } from 'lucide-react';

export function OfferModal({ offer, onClose, onApplyVoucher }) {
  const [copied, setCopied] = React.useState(false);

  if (!offer || !offer.active || !offer.image_url) return null;

  const handleCopyVoucher = () => {
    if (offer.voucher_code) {
      navigator.clipboard?.writeText(offer.voucher_code);
      setCopied(true);
      if (onApplyVoucher) {
        onApplyVoucher(offer.voucher_code);
      }
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDismissToday = () => {
    try {
      localStorage.setItem('kp_offer_dismissed_until', String(Date.now() + 24 * 3600 * 1000));
    } catch {}
    onClose();
  };

  return (
    <div className="modal-backdrop offer-modal-backdrop" onClick={onClose}>
      <div
        className="offer-modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={offer.title || 'Special Offer'}
      >
        <button
          className="offer-modal-close"
          onClick={onClose}
          aria-label="Close offer announcement"
        >
          <X size={20} />
        </button>

        {/* High quality Image Container */}
        <div className="offer-image-container">
          <img
            src={offer.image_url}
            alt={offer.title || 'Khante Pinte Special Offer'}
            className="offer-image"
            loading="eager"
          />
        </div>

        {/* Text and Actions */}
        {(offer.title || offer.description || offer.voucher_code) && (
          <div className="offer-content-body">
            {offer.title && (
              <div className="offer-title-wrap">
                <span className="offer-sparkle-pill">
                  <Sparkles size={14} /> SPECIAL ANNOUNCEMENT
                </span>
                <h3 className="offer-title">{offer.title}</h3>
              </div>
            )}

            {offer.description && (
              <p className="offer-description">{offer.description}</p>
            )}

            {offer.voucher_code && (
              <div className="offer-voucher-box">
                <div className="offer-voucher-info">
                  <Tag size={16} />
                  <span>Use code at checkout:</span>
                  <strong className="offer-voucher-code">{offer.voucher_code}</strong>
                </div>
                <button
                  type="button"
                  className="btn-primary offer-copy-btn"
                  onClick={handleCopyVoucher}
                >
                  {copied ? (
                    <>
                      <Check size={15} /> Copied!
                    </>
                  ) : (
                    'Copy Code'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="offer-modal-footer">
          <button
            type="button"
            className="text-link offer-dismiss-link"
            onClick={handleDismissToday}
          >
            Don't show again today
          </button>

          <button
            type="button"
            className="btn-primary offer-action-btn"
            onClick={onClose}
          >
            {offer.button_text || 'View Menu & Order'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
