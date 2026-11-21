import React from 'react';
import { Plus } from 'lucide-react';
import { currency } from '@/utils/formatters';

export function FoodCard({ product: p, onAdd, onOpen, cartQty }) {
  return (
    <article className={`food-card menu-reveal ${p.outOfStock ? 'sold-out' : ''}`}>
      <button
        type="button"
        className="food-card-open"
        onClick={onOpen}
        aria-label={`View ${p.name} details`}
      >
        <div className="food-photo">
          {p.image_url ? (
            <img className="food-image" src={p.image_url} alt={p.name} loading="lazy" />
          ) : (
            <span className="food-emoji">{p.emoji || '🍽️'}</span>
          )}
          {p.tag && <span className="food-tag">{p.tag}</span>}
          {p.outOfStock && <span className="sold-label">SOLD OUT</span>}
          <span className="food-category">{p.category}</span>
        </div>
        <div className="food-info">
          <div className="food-title-row">
            <h3>{p.name}</h3>
            <span className="food-price">{currency(p.price)}</span>
          </div>
          <p>{p.description || 'Tap to see item details, photos and customer reviews.'}</p>
          <span className="food-view-hint">View details & reviews ↗</span>
        </div>
      </button>
      <div className="food-add-wrap">
        <button
          className={`add-btn ${cartQty ? 'added' : ''}`}
          disabled={p.outOfStock}
          onClick={onAdd}
          aria-label={`Add ${p.name} to order`}
        >
          <span className="add-btn-text">
            {p.outOfStock
              ? 'Unavailable'
              : cartQty
              ? `${cartQty} in cart +`
              : 'Add to order'}
          </span>
          <Plus size={15} className="add-btn-icon" />
        </button>
      </div>
    </article>
  );
}
