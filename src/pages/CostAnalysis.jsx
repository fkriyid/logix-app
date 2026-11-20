import React, { useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useData } from '../context/DataContext';
import ChartCard from '../components/ChartCard';
import KpiCard from '../components/KpiCard';
import {
  kpiTotalCost, kpiAvgCostPerShipment, kpiCostPerKm,
  getCostBreakdown, getShipmentsByCarrier, getTopRoutes, getCostPerKmByVehicle,
  filterByDateRange,
} from '../utils/kpi';
import { formatIDRCompact, formatIDR } from '../utils/format';
import { AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';

const COLORS = ['#2563eb', '#0f766e', '#059669', '#b45309', '#dc2626', '#6366f1'];

const TOOLTIP = {
  contentStyle: { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(147,197,253,0.55)', borderRadius: 14, boxShadow: '0 12px 30px rgba(37,99,235,0.16)', backdropFilter: 'blur(14px)' },
  labelStyle: { color: '#0f172a', fontWeight: 700 },
};

export default function CostAnalysis() {
  const { data } = useData();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Simulator state
  const [simVolume, setSimVolume] = useState('');
  const [simBudget, setSimBudget] = useState('');

  const filtered = useMemo(() => filterByDateRange(data, startDate, endDate), [data, startDate, endDate]);

  const totalCost = useMemo(() => kpiTotalCost(filtered), [filtered]);
  const avgCost = useMemo(() => kpiAvgCostPerShipment(filtered), [filtered]);
  const costKm = useMemo(() => kpiCostPerKm(filtered), [filtered]);
  const highest = useMemo(() => filtered.reduce((a, b) => (a.total_logistics_cost || 0) > (b.total_logistics_cost || 0) ? a : b, filtered[0] || {}), [filtered]);
  const breakdown = useMemo(() => getCostBreakdown(filtered), [filtered]);
  const byCarrier = useMemo(() => getShipmentsByCarrier(filtered).sort((a, b) => b.totalCost - a.totalCost), [filtered]);
  const byRoute = useMemo(() => getTopRoutes(filtered, 10).sort((a, b) => b.totalCost - a.totalCost), [filtered]);
  const byVehicle = useMemo(() => getCostPerKmByVehicle(filtered), [filtered]);

  // Simulator calculation
  const simResult = useMemo(() => {
    const vol = parseInt(simVolume);
    const budget = parseFloat(simBudget);
    if (!vol || isNaN(vol) || vol <= 0 || !budget || isNaN(budget) || budget <= 0 || avgCost === 0) return null;
    const projected = vol * avgCost;
    const utilization = (projected / budget) * 100;
    const surplus = budget - projected;
    return { projected, utilization, surplus };
  }, [simVolume, simBudget, avgCost]);

  return (
    <div>
      {/* Date Filter */}
      <div className="card mb-20">
        <div className="filter-bar">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>DATE RANGE</span>
          <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-muted">to</span>
          <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          {(startDate || endDate) && <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid mb-20">
        <KpiCard label="Total Cost" value={formatIDRCompact(totalCost)} icon={<DollarSign size={18} />} color="var(--accent-orange)" />
        <KpiCard label="Avg Cost / Shipment" value={formatIDRCompact(avgCost)} color="var(--accent-blue)" />
        <KpiCard label="Avg Cost / km" value={formatIDRCompact(costKm)} color="var(--accent-teal)" />
        <KpiCard label="Highest-Cost Shipment" value={highest?.shipment_id || '—'} sub={formatIDRCompact(highest?.total_logistics_cost)} color="var(--accent-red)" />
      </div>

      <div className="grid-2 mb-20">
        {/* Cost Breakdown Pie */}
        <ChartCard title="Cost Breakdown by Category">
          <PieChart>
            <Pie data={breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip {...TOOLTIP} formatter={v => [formatIDRCompact(v), 'Cost']} />
          </PieChart>
        </ChartCard>

        {/* By Carrier */}
        <ChartCard title="Total Cost by Carrier">
          <BarChart data={byCarrier} layout="vertical" margin={{ left: 110, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
            <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `${(v / 1e9).toFixed(1)}B`} />
            <YAxis type="category" dataKey="carrier" tick={{ fill: '#475569', fontSize: 10 }} width={110} />
            <Tooltip {...TOOLTIP} formatter={v => [formatIDRCompact(v), 'Cost']} />
            <Bar dataKey="totalCost" fill="#2563eb" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="grid-2 mb-20">
        {/* By Route */}
        <ChartCard title="Cost by Top Route" height={260}>
          <BarChart data={byRoute} layout="vertical" margin={{ left: 150, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
            <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `${(v / 1e9).toFixed(1)}B`} />
            <YAxis type="category" dataKey="route" tick={{ fill: '#475569', fontSize: 9 }} width={150} />
            <Tooltip {...TOOLTIP} formatter={v => [formatIDRCompact(v), 'Cost']} />
            <Bar dataKey="totalCost" fill="#6366f1" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartCard>

        {/* Cost/km by vehicle */}
        <ChartCard title="Cost per km by Vehicle Type">
          <BarChart data={byVehicle} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
            <XAxis dataKey="vehicle" tick={{ fill: '#475569', fontSize: 11 }} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip {...TOOLTIP} formatter={v => [formatIDRCompact(v), 'Cost/km']} />
            <Bar dataKey="costPerKm" fill="#059669" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {/* What-If Simulator */}
      <div className="simulator-box">
        <div className="simulator-label"><AlertTriangle size={13} /> Simulated — What-If Cost Projector</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Uses dataset average cost (Rp {Math.round(avgCost).toLocaleString('id-ID')}/shipment). Results are projections only.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label>Projected Volume (shipments)</label>
            <input className="input" type="number" min="1" value={simVolume} onChange={e => setSimVolume(e.target.value)} placeholder="e.g. 250" />
          </div>
          <div className="form-group" style={{ minWidth: 200 }}>
            <label>Budget (IDR)</label>
            <input className="input" type="number" min="1" value={simBudget} onChange={e => setSimBudget(e.target.value)} placeholder="e.g. 5000000000" />
          </div>
        </div>
        {simResult && (
          <div className="detail-grid" style={{ marginTop: 14 }}>
            <div className="detail-item">
              <div className="detail-label">Projected Cost (Simulated)</div>
              <div className="detail-value text-warning">{formatIDRCompact(simResult.projected)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Budget Utilization (Simulated)</div>
              <div className="detail-value" style={{ color: simResult.utilization > 100 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                {simResult.utilization.toFixed(1)}%
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Surplus / Deficit (Simulated)</div>
              <div className="detail-value" style={{ color: simResult.surplus >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {simResult.surplus >= 0 ? '+' : ''}{formatIDRCompact(simResult.surplus)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
