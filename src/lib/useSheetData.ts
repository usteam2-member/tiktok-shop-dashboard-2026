import { useState, useEffect } from "react";
import { DailyRow, ProductRow, ProductTop10Item, ProductDailySeries, getProductType } from "./data";

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
  days: { date: string; rev: number[]; ord: number[] }[]; // date = "YYYY-MM-DD", 배열 순서 = products 순서
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
      krw: safeNum(row[9]), // J열: 매출액(KRW)
      adCost: safeNum(row[12]),
      roas: safeNum(row[16]),
      unitPriceUsd: safeNum(row[17]),
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
interface ProductBlock { col: number; sku: string; name: string; }
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
  const nameRow = nameIdx >= 0 ? rows[nameIdx] : [];

  const blocks: ProductBlock[] = [];
  for (let c = 0; c < labelRow.length; c++) {
    if (!labelRow[c].includes("매출액(KRW)")) continue;
    const sku = [skuRow[c], skuRow[c + 1], skuRow[c + 2]]
      .map(v => (v || "").trim())
      .find(v => SKU_RE.test(v)) || "";
    if (!sku) continue;
    const name = (nameRow[c] || "").trim() || sku;
    blocks.push({ col: c, sku, name });
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
    for (const b of sheet.blocks) {
      rev[idx[b.sku]] += safeNum(d.row[b.col]);     // 매출액(KRW)
      ord[idx[b.sku]] += safeNum(d.row[b.col + 1]); // 주문수
    }
    return { date: d.date, rev, ord };
  });

  return { products: skus.map(s => ({ sku: s, name: names[s] })), days };
}

function buildProducts(sheet: ProductSheet): ProductRow[] {
  const seen = new Set<string>();
  const products: ProductRow[] = [];
  for (const b of sheet.blocks) {
    if (seen.has(b.sku)) continue;
    seen.add(b.sku);
    products.push({
      name: b.name,
      sku: b.sku,
      pid: b.sku,
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
function parseSojaeData(rows: string[][]): SojaeRow[] {
  if (rows.length < 5) return [];

  const result: SojaeRow[] = [];
  const skuRow = rows[1];
  const productsRow = rows[2];

  const skuBlocks: Array<{ skuIdx: number; sku: string; productName: string }> = [];
  for (let colIdx = 2; colIdx < (skuRow?.length || 0); colIdx += 4) {
    const sku = skuRow[colIdx]?.trim();
    if (!sku) continue;
    skuBlocks.push({ skuIdx: colIdx, sku, productName: productsRow?.[colIdx]?.trim() || "" });
  }

  for (let rowIdx = 4; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const dt = row[0]?.trim();
    if (!dt || !/^\d{4}$/.test(dt)) continue;

    skuBlocks.forEach((block) => {
      const totalVideo = safeNum(row[block.skuIdx]);
      const newVideo = safeNum(row[block.skuIdx + 1]);
      const makingSales = safeNum(row[block.skuIdx + 2]);
      const gmv = safeNum(row[block.skuIdx + 3]);
      if (totalVideo > 0 || newVideo > 0 || makingSales > 0 || gmv > 0) {
        result.push({ dt, sku: block.sku, productName: block.productName, totalVideo, newVideo, makingSales, gmv });
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
          fetchSheet(GID_SOJAE).catch(() => [] as string[][]),
        ]);

        const daily = parseDailyData(dailyRows);
        const productSheet = parseProductSheet(productDailyRows);
        const products = buildProducts(productSheet);
        const productTop10ByPeriod = buildTop10(productSheet);
        const productDaily = buildProductDaily(productSheet);
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
