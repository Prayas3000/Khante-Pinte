import React from 'react';

export function StatusBadge({ status }) {
  const cls = (status || '').toLowerCase().replace(/\s/g, '-');
  return <span className={`status-badge status-${cls}`}>{status}</span>;
}
