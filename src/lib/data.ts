export interface DailyRow {
  dt: string;
  krw: number;
  ord: number;
  smp: number;
  aff: number;
  adCost: number;
  roas: number;
  unitPriceUsd: number;
}

export interface ProductRow {
  name: string;
  pid: string;
  sku: string;
  productType: string; // "(단품)" 또는 "(번들)"
  ordToday: number;
  ord7: number;
  ord30: number;
  ordThisMonth: number;
  smpThisMonth: number;
  newSojae: number;
  revSojae: number;
  dailySeries: ProductDailySeries[];
}

export interface SojaeRow {
  dt: string;
  name: string;
  count: number;
  revenue: number;
}

export interface ProductTop10Item {
  name: string;
  pid: string;
  sku: string;
  productType: string;
  revenue: number;
}

export interface ProductDailySeries {
  dt: string;
  ord: number;
  smp: number;
}

export function dtToDate(dt: string): Date {
  const y = parseInt(dt.slice(0, 4));
  const m = parseInt(dt.slice(4, 6)) - 1;
  const d = parseInt(dt.slice(6, 8));
  return new Date(y, m, d);
}

export function fmtKRW(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toFixed(0);
}

export function filterByRange(start: string, end: string, rows: DailyRow[]): DailyRow[] {
  return rows.filter(r => r.dt >= start && r.dt <= end);
}

export function getProductType(sku: string): string {
  if (!sku) return "";
  if (sku.startsWith("SB")) return "(단품)";
  if (sku.startsWith("BD")) return "(번들)";
  return "";
}
