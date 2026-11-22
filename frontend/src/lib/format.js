export const DIVISION_COLORS = ['#4f46e5', '#0284c7', '#059669', '#7c3aed', '#d97706', '#db2777', '#0d9488'];

export function fmtMoney(v) {
  if (v === undefined || v === null || isNaN(v)) return '$0';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(v);
}

export function fmtSignedMoney(v) {
  if (!v || Math.abs(v) < 0.5) return '$0';
  const sign = v > 0 ? '+' : '';
  return sign + fmtMoney(v);
}

export function fmtPrice(v) {
  if (v === undefined || v === null || isNaN(v)) return '$0.00';
  return '$' + Number(v).toFixed(2);
}

export function fmtPct(v, decimals = 1) {
  if (v === undefined || v === null || isNaN(v)) return '0.0%';
  return (v * 100).toFixed(decimals) + '%';
}

export function fmtSignedPct(v, decimals = 1) {
  if (!v || Math.abs(v * 100) < 0.04) return '0.0%';
  const sign = v > 0 ? '+' : '';
  return sign + (v * 100).toFixed(decimals) + '%';
}

export function fmtSignedNum(v, decimals = 1) {
  if (!v || Math.abs(v) < 0.01) return '0';
  const sign = v > 0 ? '+' : '';
  return sign + Number(v).toFixed(decimals);
}

export function round4(v) {
  return Math.round((Number(v) || 0) * 10000) / 10000;
}

export function fmtNum(v) {
  if (v === undefined || v === null || isNaN(v)) return '0';
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function storeSlugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'portfolio';
}
