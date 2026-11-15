// Central KPI calculation functions — single source of truth for all pages

// A shipment is "completed" only if it has an actual_delivery_date
export function isCompleted(s) {
  return !!s.actual_delivery_date && s.actual_delivery_date.trim() !== '';
}

// Days between two date strings (positive = b after a)
export function daysBetween(a, b) {
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da) || isNaN(db)) return null;
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

// Is on-time: actual <= planned
export function isOnTime(s) {
  if (!isCompleted(s)) return false;
  const diff = daysBetween(s.planned_delivery_date, s.actual_delivery_date);
  return diff !== null && diff <= 0;
}

// Is late: actual > planned
export function isLate(s) {
  if (!isCompleted(s)) return false;
  const diff = daysBetween(s.planned_delivery_date, s.actual_delivery_date);
  return diff !== null && diff > 0;
}

// KPI: Total Shipments
export function kpiTotalShipments(data) {
  return data.length;
}

// KPI: OTD % — completed on-time / completed * 100
export function kpiOTDPercent(data) {
  const completed = data.filter(isCompleted);
  if (completed.length === 0) return 0;
  const onTime = completed.filter(isOnTime).length;
  return (onTime / completed.length) * 100;
}

// KPI: Delay % — completed late / completed * 100
export function kpiDelayPercent(data) {
  const completed = data.filter(isCompleted);
  if (completed.length === 0) return 0;
  const late = completed.filter(isLate).length;
  return (late / completed.length) * 100;
}

// KPI: Avg Lead Time (days) — avg(actual - shipment_date) for completed
export function kpiAvgLeadTime(data) {
  const completed = data.filter(isCompleted);
  if (completed.length === 0) return 0;
  const days = completed
    .map(s => daysBetween(s.shipment_date, s.actual_delivery_date))
    .filter(d => d !== null);
  if (days.length === 0) return 0;
  return days.reduce((a, b) => a + b, 0) / days.length;
}

// KPI: Success Rate — completed with outcome Successful / completed * 100
export function kpiSuccessRate(data) {
  const completed = data.filter(isCompleted);
  if (completed.length === 0) return 0;
  const successful = completed.filter(s => s.delivery_outcome === 'Successful').length;
  return (successful / completed.length) * 100;
}

// KPI: Total Cost
export function kpiTotalCost(data) {
  return data.reduce((sum, s) => sum + (s.total_logistics_cost || 0), 0);
}

// KPI: Avg Cost per Shipment
export function kpiAvgCostPerShipment(data) {
  if (data.length === 0) return 0;
  return kpiTotalCost(data) / data.length;
}

// KPI: Cost per KM
export function kpiCostPerKm(data) {
  const totalDist = data.reduce((sum, s) => sum + (s.distance_km || 0), 0);
  if (totalDist === 0) return 0;
  return kpiTotalCost(data) / totalDist;
}

// KPI: Delayed Shipments count (status is Delayed, not completed)
export function kpiDelayedShipmentsCount(data) {
  return data.filter(s => s.shipment_status === 'Delayed').length;
}

// Monthly volume: { month: 'Jan 2026', count: N }
export function getMonthlyVolume(data) {
  const map = {};
  data.forEach(s => {
    if (!s.shipment_date) return;
    const d = new Date(s.shipment_date);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, count]) => {
      const [yr, mo] = k.split('-');
      const label = new Date(parseInt(yr), parseInt(mo) - 1, 1)
        .toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { month: label, monthKey: k, count };
    });
}

// Monthly cost
export function getMonthlyCost(data) {
  const map = {};
  data.forEach(s => {
    if (!s.shipment_date) return;
    const d = new Date(s.shipment_date);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] || 0) + (s.total_logistics_cost || 0);
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, cost]) => {
      const [yr, mo] = k.split('-');
      const label = new Date(parseInt(yr), parseInt(mo) - 1, 1)
        .toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return { month: label, monthKey: k, cost };
    });
}

// Monthly OTD trend
export function getMonthlyOTD(data) {
  const map = {};
  data.forEach(s => {
    if (!s.shipment_date) return;
    const d = new Date(s.shipment_date);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { completed: 0, onTime: 0 };
    if (isCompleted(s)) {
      map[key].completed++;
      if (isOnTime(s)) map[key].onTime++;
    }
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      const [yr, mo] = k.split('-');
      const label = new Date(parseInt(yr), parseInt(mo) - 1, 1)
        .toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return {
        month: label,
        monthKey: k,
        otdPct: v.completed > 0 ? (v.onTime / v.completed) * 100 : 0,
        completed: v.completed,
      };
    });
}

// Status distribution
export function getStatusDistribution(data) {
  const map = {};
  data.forEach(s => {
    const st = s.shipment_status || 'Unknown';
    map[st] = (map[st] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

// Shipments by carrier
export function getShipmentsByCarrier(data) {
  const map = {};
  data.forEach(s => {
    const c = s.carrier_name || 'Unknown';
    if (!map[c]) map[c] = { carrier: c, count: 0, otdCount: 0, completed: 0, totalCost: 0 };
    map[c].count++;
    map[c].totalCost += s.total_logistics_cost || 0;
    if (isCompleted(s)) {
      map[c].completed++;
      if (isOnTime(s)) map[c].otdCount++;
    }
  });
  return Object.values(map).map(c => ({
    ...c,
    otdPct: c.completed > 0 ? (c.otdCount / c.completed) * 100 : 0,
    avgCost: c.count > 0 ? c.totalCost / c.count : 0,
  }));
}

// Top routes by shipment count
export function getTopRoutes(data, n = 10) {
  const map = {};
  data.forEach(s => {
    const key = `${s.origin_city} → ${s.destination_city}`;
    if (!map[key]) map[key] = { route: key, count: 0, totalCost: 0 };
    map[key].count++;
    map[key].totalCost += s.total_logistics_cost || 0;
  });
  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

// Cost breakdown (sum of parts)
export function getCostBreakdown(data) {
  const totals = { base_transportation_cost: 0, fuel_cost: 0, toll_cost: 0, handling_cost: 0, other_cost: 0 };
  data.forEach(s => {
    totals.base_transportation_cost += s.base_transportation_cost || 0;
    totals.fuel_cost += s.fuel_cost || 0;
    totals.toll_cost += s.toll_cost || 0;
    totals.handling_cost += s.handling_cost || 0;
    totals.other_cost += s.other_cost || 0;
  });
  return [
    { name: 'Base Transport', value: totals.base_transportation_cost },
    { name: 'Fuel', value: totals.fuel_cost },
    { name: 'Toll', value: totals.toll_cost },
    { name: 'Handling', value: totals.handling_cost },
    { name: 'Other', value: totals.other_cost },
  ];
}

// Cost per km by vehicle type
export function getCostPerKmByVehicle(data) {
  const map = {};
  data.forEach(s => {
    const v = s.vehicle_type || 'Unknown';
    if (!map[v]) map[v] = { vehicle: v, totalCost: 0, totalKm: 0 };
    map[v].totalCost += s.total_logistics_cost || 0;
    map[v].totalKm += s.distance_km || 0;
  });
  return Object.values(map).map(v => ({
    ...v,
    costPerKm: v.totalKm > 0 ? v.totalCost / v.totalKm : 0,
  }));
}

// Performance by destination
export function getPerformanceByDestination(data, n = 10) {
  const map = {};
  data.forEach(s => {
    const dest = s.destination_city || 'Unknown';
    if (!map[dest]) map[dest] = { dest, count: 0, completed: 0, onTime: 0 };
    map[dest].count++;
    if (isCompleted(s)) {
      map[dest].completed++;
      if (isOnTime(s)) map[dest].onTime++;
    }
  });
  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map(d => ({
      ...d,
      otdPct: d.completed > 0 ? (d.onTime / d.completed) * 100 : 0,
    }));
}

// Lead time distribution (histogram-like buckets)
export function getLeadTimeDistribution(data) {
  const completed = data.filter(isCompleted);
  const buckets = { '1 day': 0, '2-3 days': 0, '4-5 days': 0, '6-7 days': 0, '8-10 days': 0, '10+ days': 0 };
  completed.forEach(s => {
    const d = daysBetween(s.shipment_date, s.actual_delivery_date);
    if (d === null) return;
    if (d <= 1) buckets['1 day']++;
    else if (d <= 3) buckets['2-3 days']++;
    else if (d <= 5) buckets['4-5 days']++;
    else if (d <= 7) buckets['6-7 days']++;
    else if (d <= 10) buckets['8-10 days']++;
    else buckets['10+ days']++;
  });
  return Object.entries(buckets).map(([name, count]) => ({ name, count }));
}

// Delay distribution by carrier
export function getDelayByCarrier(data) {
  const map = {};
  data.forEach(s => {
    const c = s.carrier_name || 'Unknown';
    if (!map[c]) map[c] = { carrier: c, completed: 0, delayed: 0 };
    if (isCompleted(s)) {
      map[c].completed++;
      if (isLate(s)) map[c].delayed++;
    }
  });
  return Object.values(map).map(c => ({
    ...c,
    delayPct: c.completed > 0 ? (c.delayed / c.completed) * 100 : 0,
  }));
}

// Exception/at-risk shipments
export function getExceptions(data) {
  return data.filter(s =>
    s.shipment_status === 'Exception' ||
    s.shipment_status === 'Delayed' ||
    (s.delivery_outcome === 'Failed' && isCompleted(s)) ||
    // Overdue: planned date has passed, no actual date
    (!isCompleted(s) && s.planned_delivery_date && new Date(s.planned_delivery_date) < new Date())
  );
}

// Filter data by date range (uses shipment_date)
export function filterByDateRange(data, startDate, endDate) {
  if (!startDate && !endDate) return data;
  return data.filter(s => {
    if (!s.shipment_date) return true;
    const d = new Date(s.shipment_date);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate)) return false;
    return true;
  });
}

// Get unique values for filter dropdowns
export function getUniqueValues(data, field) {
  return [...new Set(data.map(s => s[field]).filter(Boolean))].sort();
}

// Planned vs Actual lead time per shipment (completed only)
export function getPlannedVsActual(data) {
  return data.filter(isCompleted).map(s => {
    const planned = daysBetween(s.shipment_date, s.planned_delivery_date);
    const actual = daysBetween(s.shipment_date, s.actual_delivery_date);
    return {
      id: s.shipment_id,
      carrier: s.carrier_name,
      planned: planned ?? 0,
      actual: actual ?? 0,
      diff: (actual ?? 0) - (planned ?? 0),
    };
  });
}
