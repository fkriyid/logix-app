import React from 'react';

export default function KpiCard({ label, value, sub, icon, color }) {
  return (
    <div className="kpi-card">
      {icon && <div className="kpi-icon" style={{ color: color || 'var(--accent-blue)' }}>{icon}</div>}
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
