// 보고 탭 데이터 — 지역별(미국·영국) GMV | Daily 시트의 월 요약 행
//
// 시트 구조: 달마다 일별 행 앞에 두 줄
//   B열 "26년9월"  → 그 달 누적 실적
//   B열 "마감 예상" → 그 달 마감(예상) 값  ← 월례회의 비교에 사용 (지난달은 곧 마감 값)
// 열: G=orders, J=총 매출(KRW), M=GMV ads, N=Creative Boost, T=객단가(KRW)

import { parseCSVFull } from "./gmax";
import { usToday } from "./kpi";

// 지역별 원본 시트 (둘 다 같은 양식)
export interface ReportRegion { key: "us" | "uk"; label: string; flag: string; sheetId: string; dailyGid: string; productGid: string; }
export const REGIONS: ReportRegion[] = [
  { key: "us", label: "미국", flag: "🇺🇸", sheetId: "1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24", dailyGid: "1032420248", productGid: "1578364048" },
  { key: "uk", label: "영국", flag: "🇬🇧", sheetId: "1uwrbiCPg7OG7N38ZlYfClHeVD0gBI7RIeWLzpH7_hak", dailyGid: "0", productGid: "1578364048" },
];

async function fetchCsv(sheetId: string, gid: string, what: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = res.ok ? await res.text() : "";
  // 비공개 시트는 로그인 HTML이 돌아옴
  if (!res.ok || /^\s*<(!doctype|html)/i.test(text)) {
    throw new Error(`${what} 시트를 불러오지 못했어요 (시트가 '링크가 있는 모든 사용자 보기'로 공유돼 있는지 확인해 주세요)`);
  }
  return parseCSVFull(text);
}

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
  // 열 위치: 헤더 이름으로 찾고, 없으면 미국 시트 기본 위치 사용
  const norm = (v: string | undefined) => (v || "").replace(/\s+/g, "").toLowerCase();
  // 헤더 행 = orders와 GMV ads가 함께 있는 행 (영국 시트는 매출 열 제목이 비어 있음)
  const header = rows.slice(0, 15).find(r => r.some(c => norm(c) === "orders") && r.some(c => norm(c) === "gmvads")) || [];
  const col = (names: string[], fallback: number) => {
    const i = header.findIndex(c => names.includes(norm(c)));
    return i >= 0 ? i : fallback;
  };
  const C_ORD = col(["orders"], 6);
  const C_REV = col(["총매출(krw)"], 9);
  const C_GMVADS = col(["gmvads"], 12);
  const C_BOOST = col(["creativeboost"], 13);
  const C_AOV = col(["객단가(krw)"], 19);

  const out: MonthSummary[] = [];
  const toSummary = (ym: { year: number; month: number }, r: string[]): MonthSummary | null => {
    const revenue = num(r[C_REV]), orders = num(r[C_ORD]);
    if (revenue === null || orders === null || revenue <= 0) return null; // 아직 데이터 없는 달
    const gmvAds = num(r[C_GMVADS]) ?? 0, boost = num(r[C_BOOST]) ?? 0;
    const aov = num(r[C_AOV]) ?? (orders > 0 ? revenue / orders : 0);
    return {
      key: `${ym.year}-${String(ym.month).padStart(2, "0")}`,
      year: ym.year, month: ym.month,
      revenue, orders, aov, gmvAds, boost,
      roasTotal: gmvAds + boost > 0 ? revenue / (gmvAds + boost) : null,
    };
  };

  // 월 행("26년9월") 바로 다음이 "마감 예상" 행이면 그 값을, 없으면 월 행 값을 사용
  for (let i = 0; i < rows.length; i++) {
    const b = (rows[i][1] || "").replace(/\s/g, "");
    const m = b.match(/^(\d{2})년(\d{1,2})월$/);
    if (!m) continue;
    const ym = { year: 2000 + parseInt(m[1]), month: parseInt(m[2]) };
    const next = rows[i + 1] || [];
    const hasForecast = [0, 1, 2].some(k => (next[k] || "").replace(/\s/g, "") === "마감예상");
    const s = (hasForecast && toSummary(ym, next)) || toSummary(ym, rows[i]);
    if (s && !out.some(o => o.key === s.key)) out.push(s);
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

const summaryCache: Record<string, Promise<MonthSummary[]>> = {};
export function fetchMonthSummaries(region: ReportRegion = REGIONS[0]): Promise<MonthSummary[]> {
  if (!summaryCache[region.key]) {
    summaryCache[region.key] = fetchCsv(region.sheetId, region.dailyGid, `${region.label} 주요지표`)
      .then(parseMonthSummaries)
      .catch(e => { delete summaryCache[region.key]; throw e; });
  }
  return summaryCache[region.key];
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
  const skuRow = bestRow(/^(SB\d+_[A-Z]+|BD\d+(_[A-Z]+)?)$/);
  // PID 행 = 라벨 행 위에서 긴 숫자(상품 ID)가 처음 나오는 행 (미국 1행, 영국 2행)
  const pidRow = rows.slice(0, labelIdx).find(r => r.some(v => /^\d{15,}$/.test(clean(v)))) || [];
  const nameRow = rows[labelIdx - 1] || [];
  const label = rows[labelIdx];

  const cols: number[] = [];
  const products: ProductInfo[] = [];
  for (let c = 0; c < label.length; c++) {
    if (!label[c].includes("매출액(KRW)")) continue;
    const pid = /^\d{15,}$/.test(clean(pidRow[c])) ? clean(pidRow[c]) : "";
    const sku = [0, 1, 2].map(k => clean(skuRow[c + k])).find(v => /^(SB\d+_[A-Z]+|BD\d+(_[A-Z]+)?)$/.test(v)) || "";
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
  for (let i = labelIdx + 1; i < rows.length; i++) {
    // 월 행: 미국 "2609" / 영국 "26년9월"
    const b0 = clean(rows[i][1]).replace(/\s/g, "");
    const km = b0.match(/^(\d{2})년(\d{1,2})월$/);
    const b = km ? `${km[1]}${km[2].padStart(2, "0")}` : b0;
    if (!/^\d{4}$/.test(b)) continue;
    const next = rows[i + 1] || [];
    const isForecast = [0, 1, 2].some(k => clean(next[k]).replace(/\s/g, "") === "마감예상");
    const src = isForecast ? next : rows[i];
    const vals = cols.map(c => num(src[c]));
    if (vals.every(v => v === 0)) continue;
    const mk = `20${b.slice(0, 2)}-${b.slice(2, 4)}`;
    if (!(mk in revenue)) revenue[mk] = vals;
  }
  return { products, revenue };
}

const productCache: Record<string, Promise<ProductMonthly>> = {};
export function fetchProductMonthly(region: ReportRegion = REGIONS[0]): Promise<ProductMonthly> {
  if (!productCache[region.key]) {
    productCache[region.key] = fetchCsv(region.sheetId, region.productGid, `${region.label} 제품별 매출`)
      .then(parseProductMonthly)
      .catch(e => { delete productCache[region.key]; throw e; });
  }
  return productCache[region.key];
}
