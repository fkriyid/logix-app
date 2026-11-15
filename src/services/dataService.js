import Papa from 'papaparse';

const CSV_URL = '/logix_shipments.csv';
const LS_KEY = 'logix_overrides';

let _baseData = null;

export async function loadBaseData() {
  if (_baseData) return _baseData;
  return new Promise((resolve, reject) => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        _baseData = results.data.map(parseRow);
        resolve(_baseData);
      },
      error: reject,
    });
  });
}

function parseRow(row) {
  return {
    shipment_id: row.shipment_id?.trim() || '',
    shipment_date: row.shipment_date?.trim() || '',
    origin_city: row.origin_city?.trim() || '',
    destination_city: row.destination_city?.trim() || '',
    carrier_name: row.carrier_name?.trim() || '',
    vehicle_type: row.vehicle_type?.trim() || '',
    shipment_type: row.shipment_type?.trim() || '',
    cargo_weight_kg: parseFloat(row.cargo_weight_kg) || 0,
    distance_km: parseFloat(row.distance_km) || 0,
    planned_delivery_date: row.planned_delivery_date?.trim() || '',
    actual_delivery_date: row.actual_delivery_date?.trim() || '',
    shipment_status: row.shipment_status?.trim() || '',
    delivery_outcome: row.delivery_outcome?.trim() || '',
    base_transportation_cost: parseFloat(row.base_transportation_cost) || 0,
    fuel_cost: parseFloat(row.fuel_cost) || 0,
    toll_cost: parseFloat(row.toll_cost) || 0,
    handling_cost: parseFloat(row.handling_cost) || 0,
    other_cost: parseFloat(row.other_cost) || 0,
    total_logistics_cost: parseFloat(row.total_logistics_cost) || 0,
  };
}

// Merge base data with localStorage overrides (creates, edits, deletes)
export function getOverrides() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : { created: [], edited: {}, deleted: [] };
  } catch {
    return { created: [], edited: {}, deleted: [] };
  }
}

export function saveOverrides(overrides) {
  localStorage.setItem(LS_KEY, JSON.stringify(overrides));
}

export function resetOverrides() {
  localStorage.removeItem(LS_KEY);
}

// Return merged dataset: base + created, applying edits, excluding deleted
export function getMergedData(baseData) {
  const overrides = getOverrides();
  const deleted = new Set(overrides.deleted || []);
  const edited = overrides.edited || {};
  const created = overrides.created || [];

  const merged = baseData
    .filter(r => !deleted.has(r.shipment_id))
    .map(r => edited[r.shipment_id] ? { ...r, ...edited[r.shipment_id] } : r);

  return [...merged, ...created];
}

export function createShipment(baseData, record) {
  const overrides = getOverrides();
  overrides.created = [...(overrides.created || []), record];
  saveOverrides(overrides);
  return getMergedData(baseData);
}

export function updateShipment(baseData, shipment_id, changes) {
  const overrides = getOverrides();
  const existing = overrides.edited[shipment_id] || {};
  overrides.edited[shipment_id] = { ...existing, ...changes };
  saveOverrides(overrides);
  return getMergedData(baseData);
}

export function deleteShipment(baseData, shipment_id) {
  const overrides = getOverrides();
  // If it was a created row, remove from created
  overrides.created = (overrides.created || []).filter(r => r.shipment_id !== shipment_id);
  // If it was a base row, add to deleted
  const isBase = baseData.some(r => r.shipment_id === shipment_id);
  if (isBase) {
    overrides.deleted = [...new Set([...(overrides.deleted || []), shipment_id])];
  }
  // Remove any edits
  delete overrides.edited[shipment_id];
  saveOverrides(overrides);
  return getMergedData(baseData);
}
