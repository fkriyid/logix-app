// Formatting utilities

export function formatIDR(value) {
  if (value === null || value === undefined || isNaN(value)) return 'Rp 0';
  return 'Rp ' + Math.round(value).toLocaleString('id-ID');
}

export function formatIDRCompact(value) {
  if (!value || isNaN(value)) return 'Rp 0';
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}K`;
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
}

export function formatPct(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDays(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${value.toFixed(1)} days`;
}

// Export data as CSV download
export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function statusColor(status) {
  switch (status) {
    case 'Delivered': return 'var(--status-delivered)';
    case 'Delayed': return 'var(--status-delayed)';
    case 'Exception': return 'var(--status-exception)';
    case 'In Transit': return 'var(--status-transit)';
    case 'Planned': return 'var(--status-planned)';
    default: return 'var(--text-muted)';
  }
}

export function outcomeColor(outcome) {
  switch (outcome) {
    case 'Successful': return 'var(--status-delivered)';
    case 'Failed': return 'var(--status-exception)';
    case 'Pending': return 'var(--status-planned)';
    default: return 'var(--text-muted)';
  }
}
