// 보고 탭 데이터 — GMV | Daily 시트(gid 1032420248)의 월 요약 행
//
// 시트 구조: 달마다 일별 행 앞에 두 줄
//   B열 "26년9월"  → 그 달 누적 실적
//   B열 "마감 예상" → 그 달 마감(예상) 값  ← 월례회의 비교에 사용 (지난달은 곧 마감 값)
// 열: G=orders, J=총 매출(KRW), M=GMV ads, N=Creative Boost, T=객단가(KRW)

import { parseCSVFull } from "./gmax";
import { usToday } from "./kpi";

const SHEET_ID = "1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24";
const GID_DAILY = "1032420248";

export interface MonthSummary {
  key: string;        // "2026-09"
  year: number;
  month: number;
  revenue: number;    // 총 매출(KRW)
  orders: number;     // 주문수
  aov: number;        // 객단가(KRW)
  gmvAds: number;     // GMV ads
  boost: number;      // Creative Boost
  roasTotal: number | null; // 총 매출 ÷ (GMV ads + Creative Boost)
}

function num(v: string | undefined): number | null {
  const t = (v || "").replace(/[,\s₩$%]/g, "");
  if (!t || t.startsWith("#")) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

export function parseMonthSummaries(rows: string[][]): MonthSummary[] {
  const out: MonthSummary[] = [];
  let cur: { year: number; month: number } | null = null;
  for (const r of rows) {
    const b = (r[1] || "").replace(/\s/g, "");
    const m = b.match(/^(\d{2})년(\d{1,2})월$/);
    if (m) { cur = { year: 2000 + parseInt(m[1]), month: parseInt(m[2]) }; continue; }
    if (b === "마감예상" && cur) {
      const revenue = num(r[9]), orders = num(r[6]);
      if (revenue === null || orders === null || revenue <= 0) { cur = null; continue; } // 아직 데이터 없는 달
      const gmvAds = num(r[12]) ?? 0, boost = num(r[13]) ?? 0;
      const aov = num(r[19]) ?? (orders > 0 ? revenue / orders : 0);
      out.push({
        key: `${cur.year}-${String(cur.month).padStart(2, "0")}`,
        year: cur.year, month: cur.month,
        revenue, orders, aov, gmvAds, boost,
        roasTotal: gmvAds + boost > 0 ? revenue / (gmvAds + boost) : null,
      });
      cur = null;
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

let cache: Promise<MonthSummary[]> | null = null;
export function fetchMonthSummaries(): Promise<MonthSummary[]> {
  if (!cache) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID_DAILY}`;
    cache = fetch(url, { cache: "no-store" })
      .then(res => { if (!res.ok) throw new Error("매출 시트를 불러오지 못했어요"); return res.text(); })
      .then(t => parseMonthSummaries(parseCSVFull(t)))
      .catch(e => { cache = null; throw e; });
  }
  return cache;
}

// 진행 중인 달인지 (미국 날짜 기준)
export function isOngoing(m: { year: number; month: number }): boolean {
  const t = usToday();
  return t.year === m.year && t.month === m.month;
}
