import React from 'react';

export function StatusBadge({ status }) {
  const map = {
    'Delivered': 'badge-delivered',
    'Delayed': 'badge-delayed',
    'Exception': 'badge-exception',
    'In Transit': 'badge-transit',
    'Planned': 'badge-planned',
  };
  return <span className={`badge ${map[status] || ''}`}>{status}</span>;
}

export function OutcomeBadge({ outcome }) {
  const map = {
    'Successful': 'badge-successful',
    'Failed': 'badge-failed',
    'Pending': 'badge-pending',
  };
  return <span className={`badge ${map[outcome] || ''}`}>{outcome}</span>;
}
