import React, { useMemo, useState } from 'react';
import { Package, TrendingUp, Clock, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer
} from 'recharts';
import { useData } from '../context/DataContext';
import KpiCard from '../components/KpiCard';
import ChartCard from '../components/ChartCard';
import { StatusBadge, OutcomeBadge } from '../components/Badge';
import {
  kpiTotalShipments, kpiOTDPercent, kpiAvgLeadTime, kpiTotalCost,
  kpiDelayedShipmentsCount, kpiSuccessRate,
  getMonthlyVolume, getStatusDistribution, getMonthlyCost,
  getShipmentsByCarrier, getTopRoutes, filterByDateRange, getExceptions,
} from '../utils/kpi';
import { formatIDRCompact, formatPct, formatDays, formatDate } from '../utils/format';

const COLORS = ['#2f81f7', '#2dd4bf', '#3fb950', '#d29922', '#f85149', '#a371f7', '#e3b341', '#79c0ff'];

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1c2128', border: '1px solid #30363d', borderRadius: 6 },
  labelStyle: { color: '#e6edf3' },
  itemStyle: { color: '#8b949e' },
};

export default function Dashboard() {
  const { data } = useData();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filtered = useMemo(() => filterByDateRange(data, startDate, endDate), [data, startDate, endDate]);

  const kpis = useMemo(() => ({
    total: kpiTotalShipments(filtered),
    otd: kpiOTDPercent(filtered),
    leadTime: kpiAvgLeadTime(filtered),
    totalCost: kpiTotalCost(filtered),
    delayed: kpiDelayedShipmentsCount(filtered),
    successRate: kpiSuccessRate(filtered),
  }), [filtered]);

  const monthlyVolume = useMemo(() => getMonthlyVolume(filtered), [filtered]);
  const statusDist = useMemo(() => getStatusDistribution(filtered), [filtered]);
  const monthlyCost = useMemo(() => getMonthlyCost(filtered), [filtered]);
  const byCarrier = useMemo(() => getShipmentsByCarrier(filtered), [filtered]);
  const topRoutes = useMemo(() => getTopRoutes(filtered, 8), [filtered]);

  const recentShipments = useMemo(() =>
    [...filtered].sort((a, b) => new Date(b.shipment_date) - new Date(a.shipment_date)).slice(0, 10),
    [filtered]
  );

  const alerts = useMemo(() => getExceptions(filtered).slice(0, 5), [filtered]);

  return (
    <div>
      {/* Date Filter */}
      <div className="card mb-20">
        <div className="filter-bar">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>DATE RANGE</span>
          <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-muted">to</span>
          <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          {(startDate || endDate) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>
          )}
          <span className="text-muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
            Showing {filtered.length} of {data.length} shipments
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid mb-20">
        <KpiCard label="Total Shipments" value={kpis.total} icon={<Package size={18} />} color="var(--accent-blue)" />
        <KpiCard label="OTD Rate" value={formatPct(kpis.otd)} sub="On-Time Delivery" icon={<TrendingUp size={18} />} color="var(--accent-green)" />
        <KpiCard label="Avg Lead Time" value={formatDays(kpis.leadTime)} sub="Completed only" icon={<Clock size={18} />} color="var(--accent-teal)" />
        <KpiCard label="Total Logistics Cost" value={formatIDRCompact(kpis.totalCost)} icon={<DollarSign size={18} />} color="var(--accent-orange)" />
        <KpiCard label="Delayed Shipments" value={kpis.delayed} sub="Status: Delayed" icon={<AlertTriangle size={18} />} color="var(--accent-red)" />
        <KpiCard label="Success Rate" value={formatPct(kpis.successRate)} sub="Completed: Successful" icon={<CheckCircle size={18} />} color="var(--accent-green)" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2 mb-20">
        <ChartCard title="Monthly Shipment Volume">
          <BarChart data={monthlyVolume} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="month" tick={{ fill: '#8b949e', fontSize: 10 }} angle={-30} textAnchor="end" />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="#2f81f7" radius={[3, 3, 0, 0]} name="Shipments" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Status Distribution">
          <PieChart>
            <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} />
          </PieChart>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid-2 mb-20">
        <ChartCard title="Monthly Logistics Cost">
          <LineChart data={monthlyCost} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="month" tick={{ fill: '#8b949e', fontSize: 10 }} angle={-30} textAnchor="end" />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} tickFormatter={v => `${(v / 1e9).toFixed(1)}B`} />
            <Tooltip {...TOOLTIP_STYLE} formatter={v => [formatIDRCompact(v), 'Cost']} />
            <Line type="monotone" dataKey="cost" stroke="#2dd4bf" strokeWidth={2} dot={false} name="Cost" />
          </LineChart>
        </ChartCard>

        <ChartCard title="Shipments by Carrier">
          <BarChart data={byCarrier} layout="vertical" margin={{ top: 4, right: 8, left: 80, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 11 }} />
            <YAxis type="category" dataKey="carrier" tick={{ fill: '#8b949e', fontSize: 10 }} width={80} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="#a371f7" radius={[0, 3, 3, 0]} name="Shipments" />
          </BarChart>
        </ChartCard>
      </div>

      {/* Top Routes */}
      <div className="card mb-20">
        <div className="card-title">Top Routes by Volume</div>
        <ChartCard height={200}>
          <BarChart data={topRoutes} margin={{ top: 4, right: 8, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="route" tick={{ fill: '#8b949e', fontSize: 10 }} angle={-35} textAnchor="end" />
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="#3fb950" radius={[3, 3, 0, 0]} name="Shipments" />
          </BarChart>
        </ChartCard>
      </div>

      {/* Bottom row: Alerts + Recent Shipments */}
      <div className="grid-2">
        {/* Operational Alerts */}
        <div className="card">
          <div className="card-title">Operational Alerts ({alerts.length})</div>
          {alerts.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>No active alerts</div>}
          {alerts.map(s => (
            <div key={s.shipment_id} className={`alert ${s.shipment_status === 'Exception' ? 'alert-danger' : 'alert-warning'}`} style={{ marginBottom: 6 }}>
              <strong>{s.shipment_id}</strong> — {s.shipment_status} · {s.carrier_name} · {s.origin_city} → {s.destination_city}
            </div>
          ))}
        </div>

        {/* Recent Shipments */}
        <div className="card">
          <div className="card-title">Recent Shipments</div>
          <div className="table-scroll-wrap">
            <table>
              <thead><tr>
                <th>ID</th><th>Date</th><th>Route</th><th>Status</th><th>Outcome</th>
              </tr></thead>
              <tbody>
                {recentShipments.map(s => (
                  <tr key={s.shipment_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.shipment_id}</td>
                    <td>{formatDate(s.shipment_date)}</td>
                    <td style={{ fontSize: 12 }}>{s.origin_city} → {s.destination_city}</td>
                    <td><StatusBadge status={s.shipment_status} /></td>
                    <td><OutcomeBadge outcome={s.delivery_outcome} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
