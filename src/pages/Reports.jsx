import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { StatusBadge, OutcomeBadge } from '../components/Badge';
import { formatDate, formatIDRCompact, formatPct, formatDays, exportToCSV } from '../utils/format';
import {
  kpiTotalShipments, kpiOTDPercent, kpiDelayPercent, kpiAvgLeadTime,
  kpiSuccessRate, kpiTotalCost, kpiAvgCostPerShipment, kpiCostPerKm,
  kpiDelayedShipmentsCount, getShipmentsByCarrier, filterByDateRange,
  getUniqueValues, isCompleted, getExceptions,
} from '../utils/kpi';
import { Download } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'shipment', label: 'Shipment Report' },
  { id: 'carrier', label: 'Carrier Report' },
  { id: 'cost', label: 'Cost Report' },
  { id: 'delivery', label: 'Delivery Performance' },
  { id: 'exception', label: 'Exception Report' },
];

export default function Reports() {
  const { data } = useData();
  const [reportType, setReportType] = useState('shipment');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');
  const [filterDest, setFilterDest] = useState('');

  const carriers = useMemo(() => getUniqueValues(data, 'carrier_name'), [data]);
  const dests = useMemo(() => getUniqueValues(data, 'destination_city'), [data]);

  const baseFiltered = useMemo(() => {
    let d = filterByDateRange(data, startDate, endDate);
    if (filterCarrier) d = d.filter(s => s.carrier_name === filterCarrier);
    if (filterDest) d = d.filter(s => s.destination_city === filterDest);
    return d;
  }, [data, startDate, endDate, filterCarrier, filterDest]);

  // Report-specific data
  const reportData = useMemo(() => {
    switch (reportType) {
      case 'exception': {
        const today = new Date();
        return baseFiltered.filter(s =>
          s.shipment_status === 'Exception' || s.shipment_status === 'Delayed' ||
          s.delivery_outcome === 'Failed' ||
          (!s.actual_delivery_date && s.planned_delivery_date && new Date(s.planned_delivery_date) < today)
        );
      }
      case 'delivery': return baseFiltered.filter(isCompleted);
      default: return baseFiltered;
    }
  }, [baseFiltered, reportType]);

  // Summary metrics per report type
  const summary = useMemo(() => {
    switch (reportType) {
      case 'shipment':
        return [
          { label: 'Total Shipments', value: kpiTotalShipments(reportData) },
          { label: 'Completed', value: reportData.filter(isCompleted).length },
          { label: 'Success Rate', value: formatPct(kpiSuccessRate(reportData)) },
          { label: 'Total Cost', value: formatIDRCompact(kpiTotalCost(reportData)) },
        ];
      case 'carrier': {
        const c = getShipmentsByCarrier(reportData);
        const best = c.reduce((a, b) => a.otdPct > b.otdPct ? a : b, { carrier: '—', otdPct: 0 });
        return [
          { label: 'Carriers', value: c.length },
          { label: 'Best OTD Carrier', value: best.carrier },
          { label: 'OTD Rate', value: formatPct(kpiOTDPercent(reportData)) },
          { label: 'Avg Cost/Carrier', value: formatIDRCompact(c.length ? kpiTotalCost(reportData) / c.length : 0) },
        ];
      }
      case 'cost':
        return [
          { label: 'Total Cost', value: formatIDRCompact(kpiTotalCost(reportData)) },
          { label: 'Avg / Shipment', value: formatIDRCompact(kpiAvgCostPerShipment(reportData)) },
          { label: 'Avg / km', value: formatIDRCompact(kpiCostPerKm(reportData)) },
          { label: 'Shipments', value: kpiTotalShipments(reportData) },
        ];
      case 'delivery':
        return [
          { label: 'Completed', value: reportData.length },
          { label: 'OTD Rate', value: formatPct(kpiOTDPercent(reportData)) },
          { label: 'Delay Rate', value: formatPct(kpiDelayPercent(reportData)) },
          { label: 'Avg Lead Time', value: formatDays(kpiAvgLeadTime(reportData)) },
        ];
      case 'exception':
        return [
          { label: 'Total Exceptions', value: reportData.length },
          { label: 'Exception Status', value: reportData.filter(s => s.shipment_status === 'Exception').length },
          { label: 'Delayed Status', value: reportData.filter(s => s.shipment_status === 'Delayed').length },
          { label: 'Failed Outcome', value: reportData.filter(s => s.delivery_outcome === 'Failed').length },
        ];
      default: return [];
    }
  }, [reportType, reportData]);

  const handleExport = () => {
    const filename = `logix_${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCSV(reportData, filename);
  };

  // Table columns per report
  const renderTable = () => {
    if (reportType === 'carrier') {
      const rows = getShipmentsByCarrier(reportData).sort((a, b) => b.count - a.count);
      return (
        <table>
          <thead><tr>
            <th>Carrier</th><th>Shipments</th><th>Completed</th><th>OTD %</th><th>Total Cost</th><th>Avg Cost</th>
          </tr></thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.carrier}>
                <td>{c.carrier}</td><td>{c.count}</td><td>{c.completed}</td>
                <td>{formatPct(c.otdPct)}</td>
                <td>{formatIDRCompact(c.totalCost)}</td>
                <td>{formatIDRCompact(c.avgCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    // All other reports: show shipment rows
    return (
      <table>
        <thead><tr>
          <th>ID</th><th>Date</th><th>Carrier</th><th>Route</th><th>Status</th><th>Outcome</th>
          {reportType === 'delivery' && <><th>Lead Time</th><th>OTD</th></>}
          {reportType === 'cost' && <th>Total Cost</th>}
          {reportType !== 'delivery' && reportType !== 'cost' && <th>Total Cost</th>}
        </tr></thead>
        <tbody>
          {reportData.slice(0, 100).map(s => {
            const lead = isCompleted(s) ? Math.round((new Date(s.actual_delivery_date) - new Date(s.shipment_date)) / 86400000) : null;
            const onTime = isCompleted(s) && new Date(s.actual_delivery_date) <= new Date(s.planned_delivery_date);
            return (
              <tr key={s.shipment_id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.shipment_id}</td>
                <td>{formatDate(s.shipment_date)}</td>
                <td>{s.carrier_name}</td>
                <td style={{ fontSize: 12 }}>{s.origin_city} → {s.destination_city}</td>
                <td><StatusBadge status={s.shipment_status} /></td>
                <td><OutcomeBadge outcome={s.delivery_outcome} /></td>
                {reportType === 'delivery' && <>
                  <td>{lead !== null ? `${lead}d` : '—'}</td>
                  <td style={{ color: onTime ? 'var(--accent-green)' : 'var(--accent-red)' }}>{isCompleted(s) ? (onTime ? '✓' : '✗') : '—'}</td>
                </>}
                {(reportType === 'cost' || reportType !== 'delivery') && <td>{formatIDRCompact(s.total_logistics_cost)}</td>}
              </tr>
            );
          })}
          {reportData.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No data</td></tr>
          )}
        </tbody>
      </table>
    );
  };

  return (
    <div>
      {/* Controls */}
      <div className="card mb-20">
        <div className="filter-bar" style={{ marginBottom: 10 }}>
          {REPORT_TYPES.map(r => (
            <button key={r.id} className={`btn ${reportType === r.id ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setReportType(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="filter-bar">
          <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-muted">to</span>
          <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <select className="select" value={filterCarrier} onChange={e => setFilterCarrier(e.target.value)}>
            <option value="">All Carriers</option>
            {carriers.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="select" value={filterDest} onChange={e => setFilterDest(e.target.value)}>
            <option value="">All Destinations</option>
            {dests.map(d => <option key={d}>{d}</option>)}
          </select>
          {(startDate || endDate || filterCarrier || filterDest) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); setFilterCarrier(''); setFilterDest(''); }}>Clear</button>
          )}
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={handleExport}><Download size={13} />Export CSV</button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="kpi-grid mb-20">
        {summary.map(m => (
          <div key={m.label} className="kpi-card">
            <div className="kpi-label">{m.label}</div>
            <div className="kpi-value" style={{ fontSize: 20 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}>{REPORT_TYPES.find(r => r.id === reportType)?.label}</div>
          <span className="text-muted" style={{ fontSize: 12 }}>
            {reportData.length} row(s){reportType !== 'carrier' && reportData.length > 100 ? ' (showing first 100)' : ''}
          </span>
        </div>
        <div className="table-scroll-wrap">
          {renderTable()}
        </div>
      </div>
    </div>
  );
}
