import React, { useMemo, useState, useCallback } from 'react';
import { Plus, Edit, Trash2, Eye, RotateCcw, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useData } from '../context/DataContext';
import { StatusBadge, OutcomeBadge } from '../components/Badge';
import { formatDate, formatIDRCompact } from '../utils/format';
import { getUniqueValues, filterByDateRange } from '../utils/kpi';

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  shipment_id: '', shipment_date: '', origin_city: '', destination_city: '',
  carrier_name: '', vehicle_type: '', shipment_type: 'FTL', cargo_weight_kg: '',
  distance_km: '', planned_delivery_date: '', actual_delivery_date: '',
  shipment_status: 'Planned', delivery_outcome: 'Pending',
  base_transportation_cost: '', fuel_cost: '', toll_cost: '', handling_cost: '', other_cost: '',
  total_logistics_cost: '',
};

const STATUSES = ['Planned', 'In Transit', 'Delivered', 'Delayed', 'Exception'];
const OUTCOMES = ['Pending', 'Successful', 'Failed'];
const VEHICLE_TYPES = ['Pickup', 'CDE', 'CDD', 'Box Truck', 'Fuso', 'Wingbox', 'Trailer'];
const SHIPMENT_TYPES = ['FTL', 'LTL'];

function validate(form, allIds, editId) {
  const errs = {};
  if (!form.shipment_id) errs.shipment_id = 'Required';
  else if (!editId && allIds.includes(form.shipment_id)) errs.shipment_id = 'ID already exists';
  if (!form.shipment_date) errs.shipment_date = 'Required';
  if (!form.origin_city) errs.origin_city = 'Required';
  if (!form.destination_city) errs.destination_city = 'Required';
  if (!form.carrier_name) errs.carrier_name = 'Required';
  if (!form.vehicle_type) errs.vehicle_type = 'Required';
  if (!form.planned_delivery_date) errs.planned_delivery_date = 'Required';
  if (form.actual_delivery_date && form.shipment_date && new Date(form.actual_delivery_date) < new Date(form.shipment_date))
    errs.actual_delivery_date = 'Cannot be before shipment date';
  if (form.actual_delivery_date && form.planned_delivery_date && form.shipment_status !== 'Delivered' && form.shipment_status !== 'Exception')
    errs.shipment_status = 'If actual date set, status should be Delivered or Exception';
  const dist = parseFloat(form.distance_km);
  if (!form.distance_km || isNaN(dist) || dist <= 0) errs.distance_km = 'Must be positive';
  const weight = parseFloat(form.cargo_weight_kg);
  if (!form.cargo_weight_kg || isNaN(weight) || weight <= 0) errs.cargo_weight_kg = 'Must be positive';
  const costs = ['base_transportation_cost', 'fuel_cost', 'toll_cost', 'handling_cost', 'other_cost'];
  let costSum = 0;
  costs.forEach(f => {
    const v = parseFloat(form[f]);
    if (isNaN(v) || v < 0) errs[f] = 'Must be ≥ 0';
    else costSum += v;
  });
  const total = parseFloat(form.total_logistics_cost);
  if (!isNaN(total) && Math.abs(total - costSum) > 1) errs.total_logistics_cost = `Should equal sum of cost parts (${costSum.toLocaleString()})`;
  return errs;
}

function ShipmentModal({ initial, allIds, onSave, onClose, title }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [errs, setErrs] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calculate total
  const autoTotal = useCallback(() => {
    const f = form;
    const sum = ['base_transportation_cost', 'fuel_cost', 'toll_cost', 'handling_cost', 'other_cost']
      .reduce((acc, k) => acc + (parseFloat(f[k]) || 0), 0);
    setForm(f => ({ ...f, total_logistics_cost: String(sum) }));
  }, [form]);

  const handleSave = () => {
    const e = validate(form, allIds, initial?.shipment_id);
    if (Object.keys(e).length > 0) { setErrs(e); return; }
    const record = {
      ...form,
      cargo_weight_kg: parseFloat(form.cargo_weight_kg) || 0,
      distance_km: parseFloat(form.distance_km) || 0,
      base_transportation_cost: parseFloat(form.base_transportation_cost) || 0,
      fuel_cost: parseFloat(form.fuel_cost) || 0,
      toll_cost: parseFloat(form.toll_cost) || 0,
      handling_cost: parseFloat(form.handling_cost) || 0,
      other_cost: parseFloat(form.other_cost) || 0,
      total_logistics_cost: parseFloat(form.total_logistics_cost) || 0,
    };
    onSave(record);
  };

  const field = (key, label, type = 'text', opts = null) => (
    <div className="form-group">
      <label>{label}</label>
      {opts ? (
        <select className="select" value={form[key]} onChange={e => set(key, e.target.value)}>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="input" type={type} value={form[key]} onChange={e => set(key, e.target.value)} />
      )}
      {errs[key] && <div className="form-error">{errs[key]}</div>}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{title}</div>
        <div className="form-grid">
          {field('shipment_id', 'Shipment ID')}
          {field('shipment_date', 'Shipment Date', 'date')}
          {field('origin_city', 'Origin City')}
          {field('destination_city', 'Destination City')}
          {field('carrier_name', 'Carrier')}
          {field('vehicle_type', 'Vehicle Type', 'text', VEHICLE_TYPES)}
          {field('shipment_type', 'Shipment Type', 'text', SHIPMENT_TYPES)}
          {field('cargo_weight_kg', 'Weight (kg)', 'number')}
          {field('distance_km', 'Distance (km)', 'number')}
          {field('planned_delivery_date', 'Planned Delivery', 'date')}
          {field('actual_delivery_date', 'Actual Delivery', 'date')}
          {field('shipment_status', 'Status', 'text', STATUSES)}
          {field('delivery_outcome', 'Outcome', 'text', OUTCOMES)}
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="card-title" style={{ marginBottom: 8 }}>Cost Breakdown (IDR)</div>
          <div className="form-grid">
            {field('base_transportation_cost', 'Base Transport', 'number')}
            {field('fuel_cost', 'Fuel Cost', 'number')}
            {field('toll_cost', 'Toll Cost', 'number')}
            {field('handling_cost', 'Handling Cost', 'number')}
            {field('other_cost', 'Other Cost', 'number')}
            <div className="form-group">
              <label>Total Logistics Cost</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" type="number" value={form.total_logistics_cost} onChange={e => set('total_logistics_cost', e.target.value)} style={{ flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={autoTotal} type="button">Auto</button>
              </div>
              {errs.total_logistics_cost && <div className="form-error">{errs.total_logistics_cost}</div>}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ shipment, onClose, onEdit }) {
  const s = shipment;
  const field = (label, value) => (
    <div className="detail-item">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value || '—'}</div>
    </div>
  );
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="modal-title" style={{ margin: 0 }}>{s.shipment_id}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <StatusBadge status={s.shipment_status} />
            <OutcomeBadge outcome={s.delivery_outcome} />
          </div>
        </div>
        <div className="detail-grid" style={{ marginBottom: 14 }}>
          {field('Shipment Date', formatDate(s.shipment_date))}
          {field('Origin', s.origin_city)}
          {field('Destination', s.destination_city)}
          {field('Carrier', s.carrier_name)}
          {field('Vehicle', s.vehicle_type)}
          {field('Type', s.shipment_type)}
          {field('Weight', `${s.cargo_weight_kg?.toLocaleString()} kg`)}
          {field('Distance', `${s.distance_km?.toLocaleString()} km`)}
          {field('Planned Delivery', formatDate(s.planned_delivery_date))}
          {field('Actual Delivery', formatDate(s.actual_delivery_date))}
        </div>
        <div className="card-title">Cost Breakdown</div>
        <div className="detail-grid">
          {field('Base Transport', formatIDRCompact(s.base_transportation_cost))}
          {field('Fuel', formatIDRCompact(s.fuel_cost))}
          {field('Toll', formatIDRCompact(s.toll_cost))}
          {field('Handling', formatIDRCompact(s.handling_cost))}
          {field('Other', formatIDRCompact(s.other_cost))}
          {field('Total', formatIDRCompact(s.total_logistics_cost))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => onEdit(s)}><Edit size={14} />Edit</button>
        </div>
      </div>
    </div>
  );
}

export default function Shipments() {
  const { data, addShipment, editShipment, removeShipment, resetData } = useData();
  const [search, setSearch] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDest, setFilterDest] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortKey, setSortKey] = useState('shipment_date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // 'create' | 'edit' | 'detail' | 'delete'
  const [selected, setSelected] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const carriers = useMemo(() => getUniqueValues(data, 'carrier_name'), [data]);
  const origins = useMemo(() => getUniqueValues(data, 'origin_city'), [data]);
  const dests = useMemo(() => getUniqueValues(data, 'destination_city'), [data]);
  const allIds = useMemo(() => data.map(d => d.shipment_id), [data]);

  const filtered = useMemo(() => {
    let d = filterByDateRange(data, startDate, endDate);
    if (search) d = d.filter(s => s.shipment_id.toLowerCase().includes(search.toLowerCase()) || s.origin_city.toLowerCase().includes(search.toLowerCase()) || s.destination_city.toLowerCase().includes(search.toLowerCase()));
    if (filterCarrier) d = d.filter(s => s.carrier_name === filterCarrier);
    if (filterOrigin) d = d.filter(s => s.origin_city === filterOrigin);
    if (filterDest) d = d.filter(s => s.destination_city === filterDest);
    if (filterStatus) d = d.filter(s => s.shipment_status === filterStatus);
    if (filterType) d = d.filter(s => s.shipment_type === filterType);
    return d;
  }, [data, search, filterCarrier, filterOrigin, filterDest, filterStatus, filterType, startDate, endDate]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };
  const SortIcon = ({ k }) => sortKey === k ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  const handleCreate = (record) => {
    addShipment(record);
    setModal(null);
  };
  const handleEdit = (record) => {
    editShipment(record.shipment_id, record);
    setModal(null);
    setSelected(null);
  };
  const handleDelete = (id) => {
    removeShipment(id);
    setDeleteConfirm(null);
    setModal(null);
    setSelected(null);
  };

  return (
    <div>
      {/* Filter Bar */}
      <div className="card mb-20">
        <div className="filter-bar">
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" style={{ paddingLeft: 26, width: 180 }} placeholder="Search ID / city..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="select" value={filterCarrier} onChange={e => { setFilterCarrier(e.target.value); setPage(1); }}>
            <option value="">All Carriers</option>
            {carriers.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="select" value={filterOrigin} onChange={e => { setFilterOrigin(e.target.value); setPage(1); }}>
            <option value="">All Origins</option>
            {origins.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="select" value={filterDest} onChange={e => { setFilterDest(e.target.value); setPage(1); }}>
            <option value="">All Destinations</option>
            {dests.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="select" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {SHIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input type="date" className="input" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
          <input type="date" className="input" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="text-muted" style={{ fontSize: 12 }}>{filtered.length} shipment(s)</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { if (window.confirm('Reset all CRUD changes to original CSV data?')) resetData(); }}><RotateCcw size={13} />Reset to Original</button>
            <button className="btn btn-primary btn-sm" onClick={() => setModal('create')}><Plus size={13} />New Shipment</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-scroll-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => sort('shipment_id')}>ID <SortIcon k="shipment_id" /></th>
                <th onClick={() => sort('shipment_date')}>Date <SortIcon k="shipment_date" /></th>
                <th onClick={() => sort('origin_city')}>Origin <SortIcon k="origin_city" /></th>
                <th onClick={() => sort('destination_city')}>Destination <SortIcon k="destination_city" /></th>
                <th onClick={() => sort('carrier_name')}>Carrier <SortIcon k="carrier_name" /></th>
                <th onClick={() => sort('vehicle_type')}>Vehicle <SortIcon k="vehicle_type" /></th>
                <th onClick={() => sort('shipment_status')}>Status <SortIcon k="shipment_status" /></th>
                <th onClick={() => sort('total_logistics_cost')}>Total Cost <SortIcon k="total_logistics_cost" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map(s => (
                <tr key={s.shipment_id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.shipment_id}</td>
                  <td>{formatDate(s.shipment_date)}</td>
                  <td>{s.origin_city}</td>
                  <td>{s.destination_city}</td>
                  <td>{s.carrier_name}</td>
                  <td>{s.vehicle_type}</td>
                  <td><StatusBadge status={s.shipment_status} /></td>
                  <td>{formatIDRCompact(s.total_logistics_cost)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-icon btn-sm" title="View" onClick={() => { setSelected(s); setModal('detail'); }}><Eye size={12} /></button>
                      <button className="btn btn-secondary btn-icon btn-sm" title="Edit" onClick={() => { setSelected(s); setModal('edit'); }}><Edit size={12} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => setDeleteConfirm(s.shipment_id)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No shipments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="pagination">
          <span>Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(1)}>«</button>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return p <= totalPages ? (
              <button key={p} className={`btn btn-secondary btn-sm ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ) : null;
          })}
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      </div>

      {/* Modals */}
      {modal === 'create' && (
        <ShipmentModal title="New Shipment" initial={EMPTY_FORM} allIds={allIds} onSave={handleCreate} onClose={() => setModal(null)} />
      )}
      {modal === 'edit' && selected && (
        <ShipmentModal title={`Edit ${selected.shipment_id}`} initial={selected} allIds={allIds} onSave={handleEdit} onClose={() => { setModal(null); setSelected(null); }} />
      )}
      {modal === 'detail' && selected && (
        <DetailModal shipment={selected} onClose={() => { setModal(null); setSelected(null); }} onEdit={(s) => { setSelected(s); setModal('edit'); }} />
      )}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-title">Confirm Delete</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Delete shipment <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm}</strong>? This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
