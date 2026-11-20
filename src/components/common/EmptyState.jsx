import React from 'react';

export function EmptyState({ icon: Icon, text }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={30} />}
      <p>{text}</p>
    </div>
  );
}
