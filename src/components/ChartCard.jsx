import React from 'react';
import { ResponsiveContainer } from 'recharts';

export default function ChartCard({ title, height = 240, children }) {
  return (
    <div className="card">
      {title && <div className="card-title">{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
