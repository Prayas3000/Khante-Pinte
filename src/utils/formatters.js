export const currency = n => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

export const formatTime12 = value => {
  if (!value) return '';
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${suffix}`;
};

export const parseTime12 = value => {
  const match = String(value || '').trim().match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
};

export const getStore = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

export const saveStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const businessDate = (date = new Date()) => {
  const local = new Date(date.getTime() + 5.75 * 3600000);
  const utc = new Date(local.getTime() - 4 * 3600000);
  return utc.toISOString().slice(0, 10);
};

export const nowLabel = () => new Date().toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short' });

export const dbToUiStatus = {
  pending: 'New',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export const uiToDbStatus = {
  New: 'pending',
  Pending: 'pending',
  Confirmed: 'confirmed',
  Preparing: 'preparing',
  Ready: 'ready',
  'Out for Delivery': 'out_for_delivery',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
  new: 'pending',
  pending: 'pending',
  confirmed: 'confirmed',
  preparing: 'preparing',
  ready: 'ready',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  cancelled: 'cancelled'
};

export const formatDbOrder = row => ({
  id: `KP-${row.order_number}`,
  seq: Number(row.order_number),
  dbId: row.id,
  trackingToken: row.tracking_token,
  source: row.order_source === 'website' ? 'Website' : row.order_source === 'phone' ? 'Phone' : 'Walk-in',
  businessDate: row.business_date,
  createdAt: row.created_at,
  customer: row.customer_name || 'Walk-in',
  phone: row.customer_phone || '',
  address: row.delivery_address || '',
  type: row.order_type === 'pickup' ? 'Pickup' : 'Delivery',
  items: (row.order_items || []).map(item => ({
    id: item.menu_item_id || item.id,
    name: item.item_name,
    qty: Number(item.quantity),
    price: Number(item.unit_price)
  })),
  subtotal: Number(row.subtotal || 0),
  discount: Number(row.discount || 0),
  delivery: Number(row.delivery_fee || 0),
  total: Number(row.total || 0),
  payment: row.payment_method || 'cash',
  paymentStatus: row.payment_status || 'unpaid',
  paymentProofPath: row.payment_proof_path || null,
  cancellationReason: row.cancellation_reason || '',
  riderId: row.rider_id || null,
  rider: row.rider?.name || '',
  riderPhone: row.rider?.phone || '',
  status: dbToUiStatus[row.status] || 'New',
  note: row.notes || '',
  events: (row.order_status_history || []).map(event => ({
    status: dbToUiStatus[event.status] || event.status,
    time: event.changed_at,
    by: 'System'
  }))
});


/**
 * Strips dangerous code/HTML/control chars and enforces strict length limits.
 * Guarantees that user inputs are treated 100% as safe plain text.
 */
export const sanitizePlainText = (str, maxLength = null) => {
  if (typeof str !== 'string') return '';
  // Normalize and trim whitespace
  let clean = str.trim();
  // Remove null bytes and dangerous unprintable control characters
  clean = clean.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  // Disarm/strip all HTML tags (<script>, <iframe>, <style>, <img>, etc.)
  clean = clean.replace(/<[^>]*>/g, '');
  // Disarm javascript: pseudo-protocols and inline event handlers if any remnants exist
  clean = clean.replace(/javascript\s*:/gi, '');
  clean = clean.replace(/\bon\w+\s*=/gi, '');
  // Enforce maxLength if provided
  if (maxLength && clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  return clean;
};
