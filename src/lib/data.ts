export interface DailyRow {
  dt: string;
  krw: number;
  ord: number;
  smp: number;
  aff: number;
}
export interface ProductRow { name: string; total: number; }
export interface SojaeRow { month: string; new: number; rev: number; }

export function dtToDate(dt: string): Date {
  const y = 2000 + parseInt(dt.slice(0, 2));
  const m = parseInt(dt.slice(2, 4)) - 1;
  const d = parseInt(dt.slice(4, 6));
  return new Date(y, m, d);
}

export function fmtKRW(v: number): string {
  if (v >= 1e9) return "₩" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "₩" + (v / 1e6).toFixed(0) + "M";
  return "₩" + Math.round(v).toLocaleString();
}

// 외부 데이터 배열을 날짜 범위로 필터링
export function filterByRange(start: string, end: string, daily: DailyRow[]): DailyRow[] {
  const s = new Date(start);
  const e = new Date(end);
  return daily.filter((r) => {
    const d = dtToDate(r.dt);
    return d >= s && d <= e;
  });
}
