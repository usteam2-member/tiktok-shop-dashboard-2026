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

// ─────────────────────────────────────────────────────────────
// 제품별 월 매출 — GMV | by Product 시트(gid 1578364048)
//  1행 PID · SKU 행 · 제품명 행 · 라벨 행(매출액(KRW) | 주문수 | 샘플출고수)
//  B열 "2609" 행(누적) 다음 줄 C열 "마감 예상" 행 = 그 달 마감(예상) 값  ← 이 값을 사용
// ─────────────────────────────────────────────────────────────
const GID_PRODUCT = "1578364048";

export interface ProductInfo { pid: string; sku: string; name: string; }
export interface ProductMonthly {
  products: ProductInfo[];
  revenue: Record<string, number[]>; // "2026-09" → products 순서의 매출액
}

export function parseProductMonthly(rows: string[][]): ProductMonthly {
  const empty: ProductMonthly = { products: [], revenue: {} };
  const clean = (s: string | undefined) => (s || "").trim();

  let labelIdx = -1, best = 0;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const cnt = rows[i].filter(c => c.includes("매출액(KRW)")).length;
    if (cnt > best) { best = cnt; labelIdx = i; }
  }
  if (labelIdx < 0) return empty;
  const bestRow = (re: RegExp) => {
    let idx = -1, n = 0;
    for (let i = 0; i < labelIdx; i++) {
      const c = rows[i].filter(v => re.test(clean(v))).length;
      if (c > n) { n = c; idx = i; }
    }
    return idx >= 0 ? rows[idx] : [];
  };
  const skuRow = bestRow(/^(SB\d+_[A-Z]+|BD\d+)$/);
  const pidRow = rows[0] || [];
  const nameRow = rows[labelIdx - 1] || [];
  const label = rows[labelIdx];

  const cols: number[] = [];
  const products: ProductInfo[] = [];
  for (let c = 0; c < label.length; c++) {
    if (!label[c].includes("매출액(KRW)")) continue;
    const pid = /^\d{15,}$/.test(clean(pidRow[c])) ? clean(pidRow[c]) : "";
    const sku = [0, 1, 2].map(k => clean(skuRow[c + k])).find(v => /^(SB\d+_[A-Z]+|BD\d+)$/.test(v)) || "";
    const name = (clean(nameRow[c]).split("\n")[0] || sku || `열 ${c + 1}`).replace(/\s+/g, " ").trim();
    if (!pid && !sku) continue;
    cols.push(c);
    products.push({ pid, sku, name });
  }

  const num = (v: string | undefined) => {
    const t = (v || "").replace(/[,\s₩$%]/g, "");
    const n = parseFloat(t);
    return !t || t.startsWith("#") || isNaN(n) ? 0 : n;
  };
  const revenue: Record<string, number[]> = {};
  for (let i = labelIdx + 1; i < rows.length - 1; i++) {
    const b = clean(rows[i][1]);
    if (!/^\d{4}$/.test(b)) continue;
    const next = rows[i + 1];
    const isForecast = [0, 1, 2].some(k => clean(next[k]).replace(/\s/g, "") === "마감예상");
    const src = isForecast ? next : rows[i];
    const vals = cols.map(c => num(src[c]));
    if (vals.every(v => v === 0)) continue;
    revenue[`20${b.slice(0, 2)}-${b.slice(2, 4)}`] = vals;
  }
  return { products, revenue };
}

let productCache: Promise<ProductMonthly> | null = null;
export function fetchProductMonthly(): Promise<ProductMonthly> {
  if (!productCache) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID_PRODUCT}`;
    productCache = fetch(url, { cache: "no-store" })
      .then(res => { if (!res.ok) throw new Error("제품별 매출 시트를 불러오지 못했어요"); return res.text(); })
      .then(t => parseProductMonthly(parseCSVFull(t)))
      .catch(e => { productCache = null; throw e; });
  }
  return productCache;
}
