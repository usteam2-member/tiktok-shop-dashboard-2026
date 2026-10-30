import { useState, useEffect } from "react";
import { DailyRow, ProductRow, ProductTop10Item, ProductDailySeries, getProductType } from "./data";
import { parseCSVFull } from "./gmax";

const SHEET_ID = "1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24";
const GID_DAILY = "1032420248"; // 매출 raw 시트 (J열 = 매출액 KRW)
const GID_PRODUCT = "1578364048";
const GID_SOJAE = "367495503";

// SojaeRow 타입 재정의 (data.ts의 것 대신)
interface SojaeRow {
  dt: string;
  sku: string;
  productName?: string;
  totalVideo: number;
  newVideo: number;
  makingSales: number;
  gmv: number;
  [key: string]: any;
}

// 제품별 일별 매출 — "GMV | by Product" 시트의 각 제품 '매출액(KRW)' 열
export interface ProductDaily {
  products: { sku: string; name: string }[];              // 표시 이름에 (단품)/(번들) 포함
  days: { date: string; rev: number[]; ord: number[]; smp: number[] }[]; // date = "YYYY-MM-DD", 배열 순서 = products 순서 (smp = 샘플출고수)
}

export interface TopProduct {
  sku: string;
  name: string;
  revenue: number;
  orders: number;
}

// 선택한 기간(start~end, "YYYY-MM-DD")의 제품별 매출 합계 → 매출 상위 n개
export function topProductsInRange(pd: ProductDaily, start: string, end: string, n = 10): TopProduct[] {
  const totals = pd.products.map(p => ({ ...p, revenue: 0, orders: 0 }));
  for (const d of pd.days) {
    if ((start && d.date < start) || (end && d.date > end)) continue;
    d.rev.forEach((v, i) => { totals[i].revenue += v; });
    d.ord.forEach((v, i) => { totals[i].orders += v; });
  }
  return totals
    .filter(t => t.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, n);
}

interface AnomalyItem {
  name: string;
  sku: string;
  yesterday: number;
  today: number;
  changePercent: number;
}

export interface SheetData {
  daily: DailyRow[];
  products: ProductRow[];
  productTop10ByPeriod: Record<string, { revenue: ProductTop10Item[]; orders: ProductTop10Item[] }>;
  sojae: SojaeRow[];
  anomaliesByDate: Record<string, { increases: AnomalyItem[]; decreases: AnomalyItem[] }>;
  productDailyRows: string[][]; // productDaily 시트의 원본 데이터
  productDaily: ProductDaily;   // 제품별 일별 매출/주문 (기간 필터용)
  pidMonthly: PidMonthly;       // PID(리스팅)별 월 매출·주문·샘플 (제품별 상세정보용)
  updatedAt: string;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const cols: string[] = [];
    let inQuote = false;
    let cur = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

// "79,322" / "₩1,234" / "#DIV/0!" 등을 안전하게 숫자로 변환
function safeNum(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[,\s₩$%#]/g, ""));
  return isNaN(n) ? 0 : n;
}

async function fetchSheet(gid: string) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch sheet ${gid}`);
  return parseCSV(await res.text());
}

// ─────────────────────────────────────────────────────────────
// GMV | Daily
// ─────────────────────────────────────────────────────────────
function parseDailyData(rows: string[][]): DailyRow[] {
  if (rows.length < 3) return [];

  const result: DailyRow[] = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 10) continue;

    // B열 (row[1]) = 날짜 (YYMMDD 형식)
    let dt = row[1]?.trim();
    if (!dt || dt.length !== 6 || isNaN(parseInt(dt))) continue;

    dt = `20${dt.slice(0, 2)}${dt.slice(2, 4)}${dt.slice(4, 6)}`;

    result.push({
      dt,
      aff: safeNum(row[4]),
      smp: safeNum(row[5]),
      ord: safeNum(row[6]),
      usd: safeNum(row[8]),     // I열: 총 매출(USD)
      krw: safeNum(row[9]),     // J열: 총 매출(KRW)
      adCost: safeNum(row[11]), // L열: Total ads spend (ROAS 계산 기준과 동일)
      roas: safeNum(row[16]),   // Q열: ROAS (%)
      unitPriceUsd: safeNum(row[18]), // S열: 객단가(USD)
    });
  }

  let lastValidIdx = -1;
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].krw > 0) { lastValidIdx = i; break; }
  }
  return lastValidIdx >= 0 ? result.slice(0, lastValidIdx + 1) : result;
}

// ─────────────────────────────────────────────────────────────
// GMV | by Product
//  - 헤더 행(SKU / 제품명 / 매출액·주문수·샘플출고수)을 위치가 아니라 내용으로 찾음
//  - 날짜 행(B열 YYMMDD)만 사용 → 월 합계 행(2601 등)과 '마감 예상' 행은 자동 제외
// ─────────────────────────────────────────────────────────────
interface ProductBlock { col: number; sku: string; name: string; pid: string; }
interface ProductDay { date: string; row: string[]; } // date = "YYYY-MM-DD"
interface ProductSheet { blocks: ProductBlock[]; days: ProductDay[]; latest: string; }

const SKU_RE = /^(SB\d+_[A-Z]+|BD\d+)$/;

function toIsoDate(raw: string | undefined): string | null {
  const v = (raw || "").replace(/\s/g, "");
  if (!/^2\d{5}$/.test(v)) return null; // YYMMDD 만 허용 (2601 같은 월 합계는 제외)
  const mm = parseInt(v.slice(2, 4));
  const dd = parseInt(v.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `20${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4, 6)}`;
}

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function parseProductSheet(rows: string[][]): ProductSheet {
  const empty: ProductSheet = { blocks: [], days: [], latest: "" };
  if (rows.length < 5) return empty;

  // 1) '매출액(KRW)'이 가장 많은 행 = 지표 라벨 행
  let labelIdx = -1, maxLabel = 0;
  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const cnt = rows[i].filter(c => c.includes("매출액(KRW)")).length;
    if (cnt > maxLabel) { maxLabel = cnt; labelIdx = i; }
  }
  if (labelIdx < 0) return empty;

  // 2) 라벨 행 위쪽에서 SKU 패턴이 가장 많은 행 = SKU 행
  let skuIdx = -1, maxSku = 0;
  for (let i = 0; i < labelIdx; i++) {
    const cnt = rows[i].filter(c => SKU_RE.test(c.trim())).length;
    if (cnt > maxSku) { maxSku = cnt; skuIdx = i; }
  }
  // 3) 제품명 행 = 라벨 행 바로 위 (SKU 행과 겹치면 SKU 행 바로 아래)
  let nameIdx = labelIdx - 1;
  if (nameIdx === skuIdx) nameIdx = skuIdx + 1 < labelIdx ? skuIdx + 1 : -1;

  const labelRow = rows[labelIdx];
  const skuRow = skuIdx >= 0 ? rows[skuIdx] : [];
  // PID 행 = 라벨 행 위에서 긴 숫자(상품 ID)가 처음 나오는 행
  const pidRow = rows.slice(0, labelIdx).find(r => r.some(v => /^\d{15,}$/.test((v || "").trim()))) || [];
  const nameRow = nameIdx >= 0 ? rows[nameIdx] : [];

  const blocks: ProductBlock[] = [];
  for (let c = 0; c < labelRow.length; c++) {
    if (!labelRow[c].includes("매출액(KRW)")) continue;
    const sku = [skuRow[c], skuRow[c + 1], skuRow[c + 2]]
      .map(v => (v || "").trim())
      .find(v => SKU_RE.test(v)) || "";
    if (!sku) continue;
    const name = (nameRow[c] || "").trim() || sku;
    const pid = [pidRow[c], pidRow[c + 1], pidRow[c + 2]].map(v => (v || "").trim()).find(v => /^\d{15,}$/.test(v)) || "";
    blocks.push({ col: c, sku, name, pid });
  }

  // 4) 날짜 행만 수집 (B열 우선, 없으면 C열)
  const seen = new Set<string>();
  const days: ProductDay[] = [];
  for (let i = labelIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const date = toIsoDate(row[1]) || toIsoDate(row[2]);
    if (!date || seen.has(date)) continue;
    seen.add(date);
    days.push({ date, row });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));

  // 5) 실제 매출/주문이 있는 마지막 날짜 = 기준일
  let latest = "";
  for (let i = days.length - 1; i >= 0 && !latest; i--) {
    const hasData = blocks.some(b => safeNum(days[i].row[b.col]) > 0 || safeNum(days[i].row[b.col + 1]) > 0);
    if (hasData) latest = days[i].date;
  }

  // 기준일 이후(아직 입력 안 된 미래 날짜) 행은 버림
  return { blocks, days: latest ? days.filter(d => d.date <= latest) : [], latest };
}

function buildTop10(sheet: ProductSheet) {
  const periods: Record<string, number | null> = { "1": 1, "7": 7, "30": 30, "90": 90, "all": null };
  const result: Record<string, { revenue: ProductTop10Item[]; orders: ProductTop10Item[] }> = {};

  for (const [key, days] of Object.entries(periods)) {
    const start = days === null ? "" : addDays(sheet.latest, -(days - 1));
    const inRange = sheet.days.filter(d => d.date >= start && d.date <= sheet.latest);

    // SKU 기준으로 합산 (같은 SKU가 여러 블록에 있어도 하나로)
    const agg: Record<string, { name: string; revenue: number; orders: number }> = {};
    for (const b of sheet.blocks) {
      if (!agg[b.sku]) agg[b.sku] = { name: `${b.name} ${getProductType(b.sku)}`.trim(), revenue: 0, orders: 0 };
      for (const d of inRange) {
        agg[b.sku].revenue += safeNum(d.row[b.col]);
        agg[b.sku].orders += safeNum(d.row[b.col + 1]);
      }
    }

    const items = Object.entries(agg)
      .filter(([, v]) => v.revenue > 0 || v.orders > 0)
      .map(([sku, v]) => ({
        name: v.name,
        pid: sku,
        sku,
        productType: getProductType(sku),
        revenue: v.revenue,
        orders: v.orders,
      }));

    result[key] = {
      revenue: [...items].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      orders: [...items].sort((a, b) => b.orders - a.orders).slice(0, 10),
    };
  }
  return result;
}

function buildAnomalies(pd: ProductDaily) {
  const byDate: Record<string, { increases: AnomalyItem[]; decreases: AnomalyItem[] }> = {};

  for (let i = 1; i < pd.days.length; i++) {
    const prev = pd.days[i - 1];
    const today = pd.days[i];
    const increases: AnomalyItem[] = [];
    const decreases: AnomalyItem[] = [];

    // SKU별로 합산된 값 사용 → 같은 제품이 두 번 나오지 않음
    pd.products.forEach((p, idx) => {
      const y = prev.rev[idx];
      const t = today.rev[idx];
      if (y === 0 || t === 0) return; // 어제 또는 오늘 매출이 0이면 제외 (±100% 같은 왜곡 방지)
      // 화면에 보이는 값(소수점 1자리)과 구간 판정 기준을 일치시킴 (예: 19.96% → 20.0%는 20~30% 구간)
      const changePercent = Math.round(((t - y) / y) * 1000) / 10;
      const item = { name: p.name, sku: p.sku, yesterday: y, today: t, changePercent };
      if (changePercent >= 10) increases.push(item);
      else if (changePercent <= -10) decreases.push(item);
    });

    // 오늘 매출이 큰 순서 (구간 필터 후에도 이 순서 유지)
    increases.sort((a, b) => b.today - a.today);
    decreases.sort((a, b) => b.today - a.today);
    byDate[today.date] = { increases, decreases }; // 키 형식: "2026-09-25"
  }
  return byDate;
}

function buildProductDaily(sheet: ProductSheet): ProductDaily {
  // 같은 SKU가 여러 블록에 있으면 하나로 합침
  const skus: string[] = [];
  const names: Record<string, string> = {};
  for (const b of sheet.blocks) {
    if (!(b.sku in names)) { skus.push(b.sku); names[b.sku] = `${b.name} ${getProductType(b.sku)}`.trim(); }
  }
  const idx: Record<string, number> = {};
  skus.forEach((s, i) => { idx[s] = i; });

  const days = sheet.days.map(d => {
    const rev = new Array(skus.length).fill(0);
    const ord = new Array(skus.length).fill(0);
    const smp = new Array(skus.length).fill(0);
    for (const b of sheet.blocks) {
      rev[idx[b.sku]] += safeNum(d.row[b.col]);     // 매출액(KRW)
      ord[idx[b.sku]] += safeNum(d.row[b.col + 1]); // 주문수
      smp[idx[b.sku]] += safeNum(d.row[b.col + 2]); // 샘플출고수
    }
    return { date: d.date, rev, ord, smp };
  });

  return { products: skus.map(s => ({ sku: s, name: names[s] })), days };
}

// 제품 목록 = PID(리스팅) 단위. PID가 없는 열은 SKU로 대신
export interface MonthStat { rev: number; ord: number; smp: number; }
export interface PidMonthly {
  months: Record<string, Record<string, MonthStat>>; // PID(없으면 SKU) → "2609" → 값
  lastDate: Record<string, string>;                   // PID → 값이 있는 마지막 날짜 ("YYYY-MM-DD")
}

// PID별 월 합계 (날짜 행만 합산 → 월 합계·마감 예상 행은 제외)
function buildPidMonthly(sheet: ProductSheet): PidMonthly {
  const out: PidMonthly = { months: {}, lastDate: {} };
  for (const b of sheet.blocks) {
    const key = b.pid || b.sku;
    const m = (out.months[key] ||= {});
    for (const d of sheet.days) {
      const rev = safeNum(d.row[b.col]), ord = safeNum(d.row[b.col + 1]), smp = safeNum(d.row[b.col + 2]);
      if (!rev && !ord && !smp) continue;
      const k = d.date.slice(2, 4) + d.date.slice(5, 7);
      const s = (m[k] ||= { rev: 0, ord: 0, smp: 0 });
      s.rev += rev; s.ord += ord; s.smp += smp;
      if (!out.lastDate[key] || d.date > out.lastDate[key]) out.lastDate[key] = d.date;
    }
  }
  return out;
}

function buildProducts(sheet: ProductSheet): ProductRow[] {
  const seen = new Set<string>();
  const products: ProductRow[] = [];
  for (const b of sheet.blocks) {
    const key = b.pid || b.sku;
    if (seen.has(key)) continue;
    seen.add(key);
    products.push({
      name: b.name,
      sku: b.sku,
      pid: key,
      productType: getProductType(b.sku),
      totalRevenue: 0,
      ordToday: 0,
      ord7: 0,
      ord30: 0,
      ordThisMonth: 0,
      smpThisMonth: 0,
      newSojae: 0,
      revSojae: 0,
      dailySeries: [],
    });
  }
  return products;
}

// ─────────────────────────────────────────────────────────────
// GMV | 소재
// ─────────────────────────────────────────────────────────────
// 열 위치가 아니라 라벨로 찾음: 라벨 행(총 소재 | 신규 소재 | 매출 소재 | GMV)의 '신규 소재' 칸마다 제품 하나
//  PID 행 = 라벨 행 위에서 긴 숫자가 처음 나오는 행, SKU 행 = SKU 패턴이 가장 많은 행
//  월 값 = A열 월 행(2609 등). 월 행이 비어 있으면 그 달 날짜 행(B열 YYMMDD) 합계
export function parseSojaeData(rows: string[][]): SojaeRow[] {
  if (rows.length < 5) return [];
  const clean = (v: string | undefined) => (v || "").replace(/\s+/g, "");
  const isNew = (v: string | undefined) => clean(v).startsWith("신규소재");

  let labelIdx = -1, best = 0;
  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const cnt = rows[i].filter(isNew).length;
    if (cnt > best) { best = cnt; labelIdx = i; }
  }
  if (labelIdx < 0) return [];
  const label = rows[labelIdx];
  const SKU = /^(SB\d+_[A-Z]+|BD\d+(_[A-Z]+)?)$/;
  let skuRow: string[] = [], n = 0;
  for (let i = 0; i < labelIdx; i++) {
    const c = rows[i].filter(v => SKU.test((v || "").trim())).length;
    if (c > n) { n = c; skuRow = rows[i]; }
  }
  const pidRow = rows.slice(0, labelIdx).find(r => r.some(v => /^\d{15,}$/.test((v || "").trim()))) || [];
  const nameRow = rows[labelIdx - 1] || [];

  // 블록 나누기: 제품 칸은 4열(총 소재 | 신규 소재 | 매출 소재 | GMV)도 있고 3열(일부 열 없음)도 있음
  //  라벨 순서(총 → 신규 → 매출 → GMV)가 다시 앞으로 돌아가는 칸에서 새 제품 칸이 시작된다고 봄
  const rank = (v: string) => {
    const t = clean(v).toLowerCase();
    if (t.startsWith("총소재")) return 0;
    if (t.startsWith("신규소재")) return 1;
    if (t.startsWith("매출소재")) return 2;
    if (t.startsWith("gmv")) return 3;
    return -1;
  };
  const segs: { start: number; end: number; col: Record<number, number> }[] = [];
  let prev = 99;
  for (let c = 0; c < label.length; c++) {
    const r = rank(label[c]);
    if (r < 0) continue;
    if (r <= prev || !segs.length) segs.push({ start: c, end: c, col: {} });
    const seg = segs[segs.length - 1];
    seg.col[r] = c; seg.end = c; prev = r;
  }
  const blocks: { pid: string; sku: string; name: string; total: number; nw: number; sales: number; gmv: number }[] = [];
  segs.forEach((seg, i) => {
    if (seg.col[1] === undefined) return; // 신규 소재 칸이 없는 칸은 제외
    const hi = i + 1 < segs.length ? segs[i + 1].start - 1 : seg.end; // 다음 제품 칸 바로 앞까지
    const pick = (row: string[], re: RegExp) => { for (let k = seg.start; k <= hi; k++) { const v = (row[k] || "").trim(); if (re.test(v)) return v; } return ""; };
    const pid = pick(pidRow, /^\d{15,}$/);
    const sku = pick(skuRow, SKU);
    if (!pid && !sku) return;
    const name = (pick(nameRow, /\S/).split("\n")[0] || sku).trim();
    blocks.push({ pid, sku, name, total: seg.col[0] ?? -1, nw: seg.col[1], sales: seg.col[2] ?? -1, gmv: seg.col[3] ?? -1 });
  });

  // 월 행 / 날짜 행 모으기
  const monthRow: Record<string, string[]> = {};
  const dailySum: Record<string, number[][]> = {}; // 월 → 블록별 [총, 신규, 매출, GMV]
  for (let i = labelIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const a = (r[0] || "").trim(), b = (r[1] || "").trim();
    if (/^\d{4}$/.test(a) && !monthRow[a]) { monthRow[a] = r; continue; }
    if (/^2\d{5}$/.test(b)) {
      const k = b.slice(0, 4);
      const acc = (dailySum[k] ||= blocks.map(() => [0, 0, 0, 0]));
      blocks.forEach((bl, j) => {
        acc[j][0] += bl.total >= 0 ? safeNum(r[bl.total]) : 0;
        acc[j][1] += safeNum(r[bl.nw]);
        acc[j][2] += bl.sales >= 0 ? safeNum(r[bl.sales]) : 0;
        acc[j][3] += bl.gmv >= 0 ? safeNum(r[bl.gmv]) : 0;
      });
    }
  }

  const result: SojaeRow[] = [];
  const months = Array.from(new Set([...Object.keys(monthRow), ...Object.keys(dailySum)])).sort();
  for (const dt of months) {
    blocks.forEach((bl, j) => {
      const m = monthRow[dt];
      let v = m
        ? [bl.total >= 0 ? safeNum(m[bl.total]) : 0, safeNum(m[bl.nw]), bl.sales >= 0 ? safeNum(m[bl.sales]) : 0, bl.gmv >= 0 ? safeNum(m[bl.gmv]) : 0]
        : [0, 0, 0, 0];
      if (v.every(x => x === 0) && dailySum[dt]) v = dailySum[dt][j]; // 월 행이 비어 있으면 날짜 행 합계
      const [totalVideo, newVideo, makingSales, gmv] = v;
      if (totalVideo > 0 || newVideo > 0 || makingSales > 0 || gmv > 0) {
        result.push({ dt, sku: bl.sku, pid: bl.pid, productName: bl.name, totalVideo, newVideo, makingSales, gmv });
      }
    });
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
export function useSheetData() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [dailyRows, productDailyRows, sojaeRows] = await Promise.all([
          fetchSheet(GID_DAILY),
          fetchSheet(GID_PRODUCT).catch(() => [] as string[][]),
          // 소재 시트는 헤더에 줄바꿈 셀이 있어서 따옴표 안 줄바꿈까지 처리하는 parseCSVFull 사용
          fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID_SOJAE}`, { cache: "no-store" })
            .then(r => (r.ok ? r.text() : ""))
            .then(t => (t ? parseCSVFull(t) : []))
            .catch(() => [] as string[][]),
        ]);

        const daily = parseDailyData(dailyRows);
        const productSheet = parseProductSheet(productDailyRows);
        const products = buildProducts(productSheet);
        const productTop10ByPeriod = buildTop10(productSheet);
        const productDaily = buildProductDaily(productSheet);
        const pidMonthly = buildPidMonthly(productSheet);
        const anomaliesByDate = buildAnomalies(productDaily);
        const sojae = parseSojaeData(sojaeRows);

        console.log(
          `📊 제품 ${productSheet.blocks.length}개 · 일별 ${productSheet.days.length}일 · 기준일 ${productSheet.latest}`
        );

        setData({
          daily,
          products,
          productTop10ByPeriod,
          sojae,
          anomaliesByDate,
          productDailyRows,
          productDaily,
          pidMonthly,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { data, loading, error };
}

export type { DailyRow, ProductRow, SojaeRow, ProductTop10Item, ProductDailySeries };
