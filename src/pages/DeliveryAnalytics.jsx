import React, { useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { useData } from '../context/DataContext';
import ChartCard from '../components/ChartCard';
import KpiCard from '../components/KpiCard';
import {
  kpiOTDPercent, kpiDelayPercent, kpiAvgLeadTime, kpiSuccessRate,
  getMonthlyOTD, getShipmentsByCarrier, getPerformanceByDestination,
  getLeadTimeDistribution, getDelayByCarrier, getPlannedVsActual,
  filterByDateRange, isCompleted, daysBetween,
} from '../utils/kpi';
import { formatPct, formatDays } from '../utils/format';
import { TrendingUp, TrendingDown, Clock, CheckCircle } from 'lucide-react';

const TOOLTIP = {
  contentStyle: { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(147,197,253,0.55)', borderRadius: 14, boxShadow: '0 12px 30px rgba(37,99,235,0.16)', backdropFilter: 'blur(14px)' },
  labelStyle: { color: '#0f172a', fontWeight: 700 },
  itemStyle: { color: '#475569' },
};

export default function DeliveryAnalytics() {
  const { data } = useData();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filtered = useMemo(() => filterByDateRange(data, startDate, endDate), [data, startDate, endDate]);
  const completed = useMemo(() => filtered.filter(isCompleted), [filtered]);

  const kpis = useMemo(() => ({
    otd: kpiOTDPercent(filtered),
    delayRate: kpiDelayPercent(filtered),
    avgLead: kpiAvgLeadTime(filtered),
    success: kpiSuccessRate(filtered),
  }), [filtered]);

  const monthlyOTD = useMemo(() => getMonthlyOTD(filtered), [filtered]);
  const byCarrier = useMemo(() => getShipmentsByCarrier(filtered), [filtered]);
  const byDest = useMemo(() => getPerformanceByDestination(filtered, 10), [filtered]);
  const leadDist = useMemo(() => getLeadTimeDistribution(filtered), [filtered]);
  const delayByCarrier = useMemo(() => getDelayByCarrier(filtered), [filtered]);

  // Planned vs actual scatter (sample max 100 for performance)
  const pvA = useMemo(() => {
    const pts = getPlannedVsActual(filtered);
    return pts.slice(0, 100).map(p => ({ x: p.planned, y: p.actual, id: p.id }));
  }, [filtered]);

  // Insights
  const insights = useMemo(() => {
    const ins = [];
    const best = byCarrier.reduce((a, b) => a.otdPct > b.otdPct ? a : b, { carrier: '—', otdPct: 0 });
    const worst = byCarrier.reduce((a, b) => a.otdPct < b.otdPct ? a : b, { carrier: '—', otdPct: 100 });
    ins.push(`Best OTD carrier: <strong>${best.carrier}</strong> at ${formatPct(best.otdPct)}.`);
    ins.push(`Highest delay rate: <strong>${worst.carrier}</strong> at ${formatPct(100 - worst.otdPct)} delay.`);
    if (kpis.avgLead > 0) ins.push(`Average lead time is <strong>${formatDays(kpis.avgLead)}</strong> across ${completed.length} completed shipments.`);
    const lateCount = completed.filter(s => {
      const d = daysBetween(s.planned_delivery_date, s.actual_delivery_date);
      return d !== null && d > 0;
    }).length;
    ins.push(`<strong>${lateCount}</strong> completed shipment(s) arrived after planned date (${formatPct(kpis.delayRate)} delay rate).`);
    return ins;
  }, [byCarrier, kpis, completed]);

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
        <KpiCard label="OTD Rate" value={formatPct(kpis.otd)} sub="Completed on time" icon={<TrendingUp size={18} />} color="var(--accent-green)" />
        <KpiCard label="Delay Rate" value={formatPct(kpis.delayRate)} sub="Completed late" icon={<TrendingDown size={18} />} color="var(--accent-red)" />
        <KpiCard label="Avg Lead Time" value={formatDays(kpis.avgLead)} sub="Completed shipments" icon={<Clock size={18} />} color="var(--accent-teal)" />
        <KpiCard label="Success Rate" value={formatPct(kpis.success)} sub="Successful outcome" icon={<CheckCircle size={18} />} color="var(--accent-green)" />
      </div>

      {/* Insights */}
      <div className="card mb-20">
        <div className="card-title">Data Insights</div>
        {insights.map((i, idx) => (
          <div key={idx} className="insight-box" dangerouslySetInnerHTML={{ __html: i }} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid-2 mb-20">
        <ChartCard title="Monthly OTD Trend">
          <LineChart data={monthlyOTD} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10 }} angle={-30} textAnchor="end" />
            <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <Tooltip {...TOOLTIP} formatter={v => [`${v.toFixed(1)}%`, 'OTD']} />
            <Line type="monotone" dataKey="otdPct" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} name="OTD %" />
          </LineChart>
        </ChartCard>

        <ChartCard title="Lead Time Distribution">
          <BarChart data={leadDist} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
            <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
            <Tooltip {...TOOLTIP} />
            <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} name="Shipments" />
          </BarChart>
        </ChartCard>
      </div>

      <div className="grid-2 mb-20">
        <ChartCard title="OTD % by Carrier">
          <BarChart data={byCarrier} layout="vertical" margin={{ left: 110, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="carrier" tick={{ fill: '#475569', fontSize: 10 }} width={110} />
            <Tooltip {...TOOLTIP} formatter={v => [`${v.toFixed(1)}%`, 'OTD']} />
            <Bar dataKey="otdPct" fill="#2563eb" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="OTD % by Destination (Top 10)">
          <BarChart data={byDest} layout="vertical" margin={{ left: 90, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="dest" tick={{ fill: '#475569', fontSize: 10 }} width={90} />
            <Tooltip {...TOOLTIP} formatter={v => [`${v.toFixed(1)}%`, 'OTD']} />
            <Bar dataKey="otdPct" fill="#6366f1" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="grid-2 mb-20">
        <ChartCard title="Delay Rate by Carrier">
          <BarChart data={delayByCarrier} layout="vertical" margin={{ left: 110, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="carrier" tick={{ fill: '#475569', fontSize: 10 }} width={110} />
            <Tooltip {...TOOLTIP} formatter={v => [`${v.toFixed(1)}%`, 'Delay Rate']} />
            <Bar dataKey="delayPct" fill="#dc2626" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Planned vs Actual Lead Time (days) — sample">
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
            <XAxis type="number" dataKey="x" name="Planned" tick={{ fill: '#475569', fontSize: 11 }} label={{ value: 'Planned (days)', fill: '#475569', fontSize: 10, position: 'insideBottom', offset: -5 }} />
            <YAxis type="number" dataKey="y" name="Actual" tick={{ fill: '#475569', fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} {...TOOLTIP} formatter={(v, n) => [v, n === 'x' ? 'Planned days' : 'Actual days']} />
            <Scatter data={pvA} fill="#0f766e" fillOpacity={0.7} />
          </ScatterChart>
        </ChartCard>
      </div>
    </div>
  );
}
