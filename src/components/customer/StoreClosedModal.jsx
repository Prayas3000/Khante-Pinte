import React from 'react';
import { X, Calendar, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

export function StoreClosedModal({ closure, storeHours, onClose }) {
  if (!closure || !closure.active) return null;

  const reopenDateObj = closure.reopen_at ? new Date(closure.reopen_at) : null;
  const isPast = reopenDateObj && reopenDateObj <= new Date();
  if (isPast) return null;

  const formattedReopen = reopenDateObj
    ? reopenDateObj.toLocaleString('en-NP', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'our next scheduled business hours';

  const daysCount = closure.days || 1;

  return (
    <div className="modal-backdrop offer-modal-backdrop" onClick={onClose}>
      <div
        className="offer-modal-card store-closed-modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Store Closed Notice"
      >
        <button
          className="offer-modal-close"
          onClick={onClose}
          aria-label="Close closure notice"
        >
          <X size={20} />
        </button>

        {/* Header Banner */}
        <div className="store-closed-header">
          <div className="store-closed-icon-badge">
            <Calendar size={28} />
          </div>
          <span className="store-closed-eyebrow">NOTICE FOR OUR FOOD LOVERS</span>
          <h2 className="store-closed-title">
            We are closed for {daysCount} {daysCount === 1 ? 'day' : 'days'}
          </h2>
        </div>

        {/* Body content */}
        <div className="store-closed-body">
          {closure.reason && (
            <div className="store-closed-reason-box">
              <span className="reason-label">REASON</span>
              <p className="reason-text">{closure.reason}</p>
            </div>
          )}

          <div className="store-closed-reopen-box">
            <Clock size={18} className="reopen-clock-icon" />
            <div>
              <small>SCHEDULED REOPENING TIME</small>
              <strong>{formattedReopen}</strong>
            </div>
          </div>

          <p className="store-closed-friendly-msg">
            Our kitchen is taking a scheduled break. You can still browse our entire menu, but
            ordering is temporarily paused until we reopen. Thank you for your love and understanding!
          </p>
        </div>

        {/* Footer */}
        <div className="offer-modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-primary offer-action-btn"
            onClick={onClose}
          >
            Browse Menu Anyway <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
