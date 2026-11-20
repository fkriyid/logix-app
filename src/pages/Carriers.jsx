import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend } from 'recharts';
import { useData } from '../context/DataContext';
import ChartCard from '../components/ChartCard';
import KpiCard from '../components/KpiCard';
import { getShipmentsByCarrier, kpiTotalCost, kpiTotalShipments } from '../utils/kpi';
import { formatIDRCompact, formatPct, formatNumber } from '../utils/format';
import { Truck } from 'lucide-react';

const TOOLTIP = {
  contentStyle: { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(147,197,253,0.55)', borderRadius: 14, boxShadow: '0 12px 30px rgba(37,99,235,0.16)', backdropFilter: 'blur(14px)' },
  labelStyle: { color: '#0f172a', fontWeight: 700 },
};

export default function Carriers() {
  const { data } = useData();
  const [selected, setSelected] = useState(null);

  const carriers = useMemo(() => {
    const rows = getShipmentsByCarrier(data);
    return rows.sort((a, b) => b.count - a.count);
  }, [data]);

  const selectedData = selected ? carriers.find(c => c.carrier === selected) : null;

  // Per carrier: avg lead time, delay rate
  const enriched = useMemo(() => {
    return carriers.map(c => {
      const shipm = data.filter(s => s.carrier_name === c.carrier);
      const completed = shipm.filter(s => !!s.actual_delivery_date);
      const delayed = completed.filter(s => {
        const diff = (new Date(s.actual_delivery_date) - new Date(s.planned_delivery_date)) / 86400000;
        return diff > 0;
      });
      const leadDays = completed.map(s => {
        const diff = (new Date(s.actual_delivery_date) - new Date(s.shipment_date)) / 86400000;
        return isNaN(diff) ? null : Math.round(diff);
      }).filter(d => d !== null);
      const avgLead = leadDays.length ? leadDays.reduce((a, b) => a + b, 0) / leadDays.length : 0;
      return {
        ...c,
        delayRate: completed.length ? (delayed.length / completed.length) * 100 : 0,
        avgLeadTime: avgLead,
        completedCount: completed.length,
      };
    });
  }, [carriers, data]);

  const radarData = selectedData ? (() => {
    const c = enriched.find(e => e.carrier === selectedData.carrier);
    // Normalize for radar (0-100 scale)
    const maxCount = Math.max(...enriched.map(e => e.count));
    const maxCost = Math.max(...enriched.map(e => e.totalCost));
    return [
      { subject: 'Volume', value: (c.count / maxCount) * 100 },
      { subject: 'OTD %', value: c.otdPct },
      { subject: 'Success', value: c.completedCount > 0 ? (data.filter(s => s.carrier_name === c.carrier && s.delivery_outcome === 'Successful').length / c.completedCount) * 100 : 0 },
      { subject: 'Rel. Cost', value: maxCost > 0 ? (1 - c.totalCost / maxCost) * 100 : 50 },
      { subject: 'On-Time', value: 100 - c.delayRate },
    ];
  })() : [];

  return (
    <div>
      {/* Summary Cards */}
      <div className="kpi-grid mb-20">
        <KpiCard label="Total Carriers" value={carriers.length} icon={<Truck size={18} />} color="var(--accent-blue)" />
        <KpiCard label="Total Shipments" value={kpiTotalShipments(data)} />
        <KpiCard label="Total Cost" value={formatIDRCompact(kpiTotalCost(data))} />
        <KpiCard label="Best OTD Carrier" value={enriched.length ? enriched.reduce((a, b) => a.otdPct > b.otdPct ? a : b).carrier : '—'} color="var(--accent-green)" />
      </div>

      <div className="grid-2 mb-20">
        {/* Ranking Table */}
        <div className="card">
          <div className="card-title">Carrier Performance Ranking</div>
          <div className="table-scroll-wrap">
            <table>
              <thead><tr>
                <th>#</th><th>Carrier</th><th>Shipments</th><th>OTD %</th><th>Delay %</th><th>Avg Lead</th><th>Avg Cost</th>
              </tr></thead>
              <tbody>
                {enriched.map((c, i) => (
                  <tr key={c.carrier} style={{ cursor: 'pointer', background: selected === c.carrier ? 'var(--bg-hover)' : '' }} onClick={() => setSelected(c.carrier === selected ? null : c.carrier)}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{c.carrier}</td>
                    <td>{c.count}</td>
                    <td style={{ color: c.otdPct >= 80 ? 'var(--accent-green)' : c.otdPct >= 60 ? 'var(--accent-orange)' : 'var(--accent-red)' }}>{formatPct(c.otdPct)}</td>
                    <td style={{ color: c.delayRate > 20 ? 'var(--accent-red)' : 'var(--accent-orange)' }}>{formatPct(c.delayRate)}</td>
                    <td>{c.avgLeadTime.toFixed(1)}d</td>
                    <td>{formatIDRCompact(c.avgCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 8 }}>Click a row to see carrier detail</div>
        </div>

        {/* Comparison Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ChartCard title="OTD % by Carrier" height={180}>
            <BarChart data={enriched} layout="vertical" margin={{ left: 100, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="carrier" tick={{ fill: '#475569', fontSize: 10 }} width={100} />
              <Tooltip {...TOOLTIP} formatter={v => [`${v.toFixed(1)}%`, 'OTD']} />
              <Bar dataKey="otdPct" fill="#2563eb" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Total Cost by Carrier" height={180}>
            <BarChart data={enriched} layout="vertical" margin={{ left: 100, right: 8, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} tickFormatter={v => `${(v / 1e9).toFixed(1)}B`} />
              <YAxis type="category" dataKey="carrier" tick={{ fill: '#475569', fontSize: 10 }} width={100} />
              <Tooltip {...TOOLTIP} formatter={v => [formatIDRCompact(v), 'Cost']} />
              <Bar dataKey="totalCost" fill="#0f766e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      </div>

      {/* Carrier Detail View */}
      {selected && selectedData && (() => {
        const c = enriched.find(e => e.carrier === selected);
        return (
          <div className="card">
            <div className="card-title">Detail: {selected}</div>
            <div className="grid-2">
              <div>
                <div className="detail-grid" style={{ marginBottom: 14 }}>
                  {[
                    ['Total Shipments', c.count],
                    ['Completed', c.completedCount],
                    ['OTD Rate', formatPct(c.otdPct)],
                    ['Delay Rate', formatPct(c.delayRate)],
                    ['Avg Lead Time', `${c.avgLeadTime.toFixed(1)} days`],
                    ['Total Cost', formatIDRCompact(c.totalCost)],
                    ['Avg Cost/Shipment', formatIDRCompact(c.avgCost)],
                  ].map(([label, value]) => (
                    <div key={label} className="detail-item">
                      <div className="detail-label">{label}</div>
                      <div className="detail-value">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <ChartCard title="Performance Radar" height={220}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={80}>
                  <PolarGrid stroke="rgba(71,85,105,0.2)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#2563eb" fill="#60a5fa" fillOpacity={0.3} />
                </RadarChart>
              </ChartCard>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
