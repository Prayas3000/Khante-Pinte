import React, { useEffect, useState } from 'react';
import { X, Plus, Check, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { currency, sanitizePlainText } from '@/utils/formatters';

export function ProductDetailModal({ product, onClose, onAdd, cartQty = 0, onViewCart, account, onSignUp }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState('');
  const [customerName, setCustomerName] = useState(account?.name || '');
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    onAdd();
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
    }, 2500);
  };

  const loadReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_item_reviews')
      .select('id,user_id,customer_name,rating,review,created_at')
      .eq('menu_item_id', product.id)
      .order('created_at', { ascending: false });

    if (error) setMessage(`Could not load reviews: ${error.message}`);
    else setReviews(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!live) return;
      setSignedIn(!!data.user);
      setUserId(data.user?.id || '');
    });
    loadReviews();
    return () => {
      live = false;
    };
  }, [product.id]);

  const submitReview = async () => {
    setMessage('');
    if (!signedIn) {
      setMessage('Create an account or log in to write a review.');
      return;
    }
    const cleanReview = sanitizePlainText(reviewText, 300);
    if (!cleanReview || cleanReview.length < 3) {
      setMessage('Please write at least 3 characters.');
      return;
    }
    if (cleanReview.length > 300) {
      setMessage('Review cannot exceed 300 characters.');
      return;
    }
    setSaving(true);
    const { data: profile } = await supabase
      .from('customers')
      .select('name')
      .eq('auth_user_id', userId)
      .maybeSingle();

    const { error } = await supabase.from('menu_item_reviews').upsert(
      {
        menu_item_id: product.id,
        user_id: userId,
        customer_name:
          profile?.name || account?.name || customerName || 'Khante Pinte customer',
        rating,
        review: cleanReview,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'menu_item_id,user_id' }
    );

    if (error) setMessage(error.message);
    else {
      setReviewText('');
      setMessage('Thank you! Your review has been saved.');
      await loadReviews();
    }
    setSaving(false);
  };

  const avg = reviews.length
    ? (reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div className="modal-backdrop product-detail-backdrop" onClick={onClose}>
      <section
        className="product-detail-modal"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <header className="product-detail-head">
          <strong>Food details</strong>
          <button className="icon-btn" onClick={onClose} aria-label="Close details">
            <X />
          </button>
        </header>
        <div className="product-detail-scroll">
          <div className="product-detail-photo">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} />
            ) : (
              <span>{product.emoji || '🍽️'}</span>
            )}
          </div>
          <div className="product-detail-info">
            <span className="eyebrow">{product.category}</span>
            <h2>{product.name}</h2>
            <strong className="product-detail-price">{currency(product.price)}</strong>
            <p>{product.description || 'Freshly prepared by Khante Pinte.'}</p>
            <div className="product-detail-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginTop: '14px' }}>
              <button
                type="button"
                className={`btn-primary product-detail-add-btn ${cartQty > 0 || justAdded ? 'added' : ''}`}
                disabled={product.outOfStock}
                onClick={handleAdd}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                  backgroundColor: (cartQty > 0 || justAdded) ? '#1f421a' : undefined,
                  color: (cartQty > 0 || justAdded) ? '#b9ed75' : undefined,
                  border: (cartQty > 0 || justAdded) ? '1px solid #4a7c2e' : undefined
                }}
              >
                {product.outOfStock ? (
                  'Currently unavailable'
                ) : justAdded ? (
                  <>
                    <Check size={18} /> Added to cart ({cartQty} in cart) +
                  </>
                ) : cartQty > 0 ? (
                  <>
                    <Check size={18} /> {cartQty} in cart · Add more +
                  </>
                ) : (
                  <>
                    <Plus size={18} /> Add to order
                  </>
                )}
              </button>

              {cartQty > 0 && onViewCart && (
                <button
                  type="button"
                  className="btn-outline product-detail-view-cart-btn"
                  onClick={onViewCart}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '11px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <ShoppingBag size={16} /> View Cart ({cartQty})
                </button>
              )}
            </div>

            {justAdded && (
              <div
                className="product-detail-toast-alert"
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#eef9e4',
                  color: '#26541b',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid #c7e8a9'
                }}
              >
                <span>✓</span> Added to your cart! You can continue browsing or tap View Cart.
              </div>
            )}
          </div>
          <section className="product-reviews">
            <div className="reviews-heading">
              <div>
                <span className="eyebrow">CUSTOMER FEEDBACK</span>
                <h3>Reviews & ratings</h3>
              </div>
              <strong>
                ★ {avg} <small>({reviews.length})</small>
              </strong>
            </div>
            {loading ? (
              <p>Loading reviews…</p>
            ) : reviews.length ? (
              reviews.map(r => (
                <article className="review-item" key={r.id}>
                  <div>
                    <strong>{r.customer_name}</strong>
                    <span>
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  <p>{r.review}</p>
                  <small>{new Date(r.created_at).toLocaleDateString('en-NP')}</small>
                </article>
              ))
            ) : (
              <p className="review-empty">
                No reviews yet. Be the first to share your experience.
              </p>
            )}
            <div className="write-review-box">
              <h4>Write your review</h4>
              {signedIn ? (
                <>
                  <label>
                    Rating
                    <select
                      value={rating}
                      onChange={e => setRating(Number(e.target.value))}
                    >
                      <option value={5}>★★★★★ — Excellent</option>
                      <option value={4}>★★★★☆ — Very good</option>
                      <option value={3}>★★★☆☆ — Good</option>
                      <option value={2}>★★☆☆☆ — Fair</option>
                      <option value={1}>★☆☆☆☆ — Poor</option>
                    </select>
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value.slice(0, 300))}
                    rows={4}
                    maxLength={300}
                    placeholder="Tell others what you thought (3-300 characters)…"
                  />
                  <small style={{ display: 'block', textAlign: 'right', color: '#667085', fontSize: 12, marginTop: 4 }}>
                    {reviewText.length}/300 characters
                  </small>
                  <button
                    className="btn-primary"
                    disabled={saving}
                    onClick={submitReview}
                  >
                    {saving ? 'Submitting…' : 'Submit review'}
                  </button>
                </>
              ) : (
                <>
                  <p>Reviews are open to everyone, but you need a customer account to write one.</p>
                  <button className="btn-primary" onClick={onSignUp}>
                    Sign up to write a review
                  </button>
                  <button className="btn-outline" onClick={onClose}>
                    Maybe later
                  </button>
                </>
              )}
              {message && <p className="review-message">{message}</p>}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
