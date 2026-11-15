import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { StatusBadge, OutcomeBadge } from '../components/Badge';
import { formatDate, formatIDRCompact } from '../utils/format';
import { getExceptions, filterByDateRange, getUniqueValues } from '../utils/kpi';
import { AlertTriangle } from 'lucide-react';

export default function Exceptions() {
  const { data } = useData();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const carriers = useMemo(() => getUniqueValues(data, 'carrier_name'), [data]);

  const exceptions = useMemo(() => {
    let d = filterByDateRange(data, startDate, endDate);
    if (filterCarrier) d = d.filter(s => s.carrier_name === filterCarrier);
    // Exceptions: status is Exception or Delayed, outcome Failed (completed), or overdue (no actual, planned past)
    const today = new Date();
    return d.filter(s => {
      if (s.shipment_status === 'Exception') return true;
      if (s.shipment_status === 'Delayed') return true;
      if (s.delivery_outcome === 'Failed') return true;
      if (!s.actual_delivery_date && s.planned_delivery_date && new Date(s.planned_delivery_date) < today) return true;
      return false;
    });
  }, [data, filterCarrier, startDate, endDate]);

  const statusFiltered = useMemo(() =>
    filterStatus ? exceptions.filter(s => s.shipment_status === filterStatus) : exceptions,
    [exceptions, filterStatus]
  );

  // Counts by type
  const counts = useMemo(() => ({
    exception: data.filter(s => s.shipment_status === 'Exception').length,
    delayed: data.filter(s => s.shipment_status === 'Delayed').length,
    failed: data.filter(s => s.delivery_outcome === 'Failed').length,
    overdue: data.filter(s => !s.actual_delivery_date && s.planned_delivery_date && new Date(s.planned_delivery_date) < new Date()).length,
  }), [data]);

  const exStatuses = useMemo(() => [...new Set(exceptions.map(s => s.shipment_status))].sort(), [exceptions]);

  // Classify each row for display
  const classify = (s) => {
    const tags = [];
    if (s.shipment_status === 'Exception') tags.push({ label: 'Exception Status', type: 'dataset' });
    if (s.shipment_status === 'Delayed') tags.push({ label: 'Delayed Status', type: 'dataset' });
    if (s.delivery_outcome === 'Failed') tags.push({ label: 'Failed Outcome', type: 'dataset' });
    if (!s.actual_delivery_date && s.planned_delivery_date && new Date(s.planned_delivery_date) < new Date())
      tags.push({ label: 'Overdue (Calculated)', type: 'calculated' });
    return tags;
  };

  return (
    <div>
      {/* Summary Counts */}
      <div className="kpi-grid mb-20">
        <div className="kpi-card">
          <div className="kpi-label"><AlertTriangle size={14} style={{ display: 'inline', marginRight: 4 }} />Exception Status</div>
          <div className="kpi-value text-danger">{counts.exception}</div>
          <div className="kpi-sub">Dataset field: shipment_status</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Delayed Status</div>
          <div className="kpi-value text-warning">{counts.delayed}</div>
          <div className="kpi-sub">Dataset field: shipment_status</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Failed Outcome</div>
          <div className="kpi-value text-danger">{counts.failed}</div>
          <div className="kpi-sub">Dataset field: delivery_outcome</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Overdue (no actual)</div>
          <div className="kpi-value text-warning">{counts.overdue}</div>
          <div className="kpi-sub">Calculated alert</div>
        </div>
      </div>

      {/* Alert: transparency note */}
      <div className="alert alert-info mb-20" style={{ marginBottom: 16 }}>
        <strong>Label transparency:</strong> "Dataset fields" = status/outcome directly from the data. "Calculated alerts" = derived from date logic (planned date past, no actual delivery). No exception reasons are inferred beyond what the dataset contains.
      </div>

      {/* Filters */}
      <div className="card mb-20">
        <div className="filter-bar">
          <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {exStatuses.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="select" value={filterCarrier} onChange={e => setFilterCarrier(e.target.value)}>
            <option value="">All Carriers</option>
            {carriers.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          {(startDate || endDate || filterCarrier || filterStatus) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); setFilterCarrier(''); setFilterStatus(''); }}>Clear</button>
          )}
        </div>
        <span className="text-muted" style={{ fontSize: 12 }}>{statusFiltered.length} exception(s)</span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-scroll-wrap">
          <table>
            <thead><tr>
              <th>ID</th><th>Date</th><th>Carrier</th><th>Route</th><th>Planned</th><th>Actual</th><th>Status</th><th>Outcome</th><th>Flags</th>
            </tr></thead>
            <tbody>
              {statusFiltered.map(s => {
                const tags = classify(s);
                return (
                  <tr key={s.shipment_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.shipment_id}</td>
                    <td>{formatDate(s.shipment_date)}</td>
                    <td>{s.carrier_name}</td>
                    <td style={{ fontSize: 12 }}>{s.origin_city} → {s.destination_city}</td>
                    <td>{formatDate(s.planned_delivery_date)}</td>
                    <td>{formatDate(s.actual_delivery_date)}</td>
                    <td><StatusBadge status={s.shipment_status} /></td>
                    <td><OutcomeBadge outcome={s.delivery_outcome} /></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {tags.map(t => (
                          <span key={t.label} className={`badge ${t.type === 'dataset' ? 'badge-exception' : 'badge-delayed'}`} style={{ fontSize: 10 }}>{t.label}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {statusFiltered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No exceptions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
