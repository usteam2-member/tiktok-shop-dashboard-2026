// 제품별 기간 매출·주문수 — "GMV | by Product" 시트(gid 1578364048) 원본 행에서 PID(리스팅) 단위로 집계
//  1행 PID · SKU 행 · 제품명 행 · 라벨 행(매출액(KRW) | 주문수 | 샘플출고수) · B열 YYMMDD 날짜 행
//  객단가 = 매출액(KRW) ÷ 주문수 (같은 시트의 두 값이라 기준이 일치)

import { parseCSVFull } from "./gmax";

const SKU_RE = /^(SB\d+_[A-Z]+|BD\d+(_[A-Z]+)?)$/;
const PID_RE = /^\d{15,}$/;

export interface OrderStat { rev: number; ord: number; }
export interface ProductOrders {
  byPid: Record<string, OrderStat>;
  bySku: Record<string, OrderStat>; // 같은 SKU의 리스팅을 모두 합친 값 (PID가 없을 때 사용)
}

const num = (v: string | undefined) => {
  const t = (v || "").replace(/[,\s₩$%]/g, "");
  const n = parseFloat(t);
  return !t || t.startsWith("#") || isNaN(n) ? 0 : n;
};

function toIso(raw: string | undefined): string | null {
  const v = (raw || "").replace(/\s/g, "");
  if (!/^2\d{5}$/.test(v)) return null;
  return `20${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4, 6)}`;
}

// start~end("YYYY-MM-DD") 기간 합계
export function productOrdersInRange(rows: string[][], start: string, end: string): ProductOrders {
  const out: ProductOrders = { byPid: {}, bySku: {} };
  if (!rows || rows.length < 5) return out;

  let labelIdx = -1, best = 0;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const cnt = rows[i].filter(c => c.includes("매출액(KRW)")).length;
    if (cnt > best) { best = cnt; labelIdx = i; }
  }
  if (labelIdx < 0) return out;
  const label = rows[labelIdx];
  const clean = (s: string | undefined) => (s || "").trim();

  let skuRow: string[] = [], n = 0;
  for (let i = 0; i < labelIdx; i++) {
    const c = rows[i].filter(v => SKU_RE.test(clean(v))).length;
    if (c > n) { n = c; skuRow = rows[i]; }
  }
  const pidRow = rows.slice(0, labelIdx).find(r => r.some(v => PID_RE.test(clean(v)))) || [];

  const blocks: { rev: number; ord: number; pid: string; sku: string }[] = [];
  for (let c = 0; c < label.length; c++) {
    if (!label[c].includes("매출액(KRW)")) continue;
    const ord = [c + 1, c + 2].find(k => clean(label[k]).includes("주문수"));
    if (ord === undefined) continue;
    const pid = [0, 1, 2].map(k => clean(pidRow[c + k])).find(v => PID_RE.test(v)) || "";
    const sku = [0, 1, 2].map(k => clean(skuRow[c + k])).find(v => SKU_RE.test(v)) || "";
    if (!pid && !sku) continue;
    blocks.push({ rev: c, ord, pid, sku });
  }

  const seen = new Set<string>();
  for (let i = labelIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const date = toIso(r[1]) || toIso(r[2]);
    if (!date || seen.has(date)) continue; // 월 합계·마감 예상 행은 날짜가 아니라 자동 제외
    seen.add(date);
    if ((start && date < start) || (end && date > end)) continue;
    for (const b of blocks) {
      const rev = num(r[b.rev]), ord = num(r[b.ord]);
      if (!rev && !ord) continue;
      if (b.pid) {
        const s = (out.byPid[b.pid] ||= { rev: 0, ord: 0 });
        s.rev += rev; s.ord += ord;
      }
      if (b.sku) {
        const s = (out.bySku[b.sku] ||= { rev: 0, ord: 0 });
        s.rev += rev; s.ord += ord;
      }
    }
  }
  return out;
}

export function aovOf(s: OrderStat | undefined): number | null {
  return s && s.ord > 0 ? s.rev / s.ord : null;
}

// 미국 GMV | by Product 시트 원본 (여러 줄 셀까지 정확히 나누도록 parseCSVFull 사용)
const PRODUCT_URL = "https://docs.google.com/spreadsheets/d/1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24/export?format=csv&gid=1578364048";
let rowsCache: Promise<string[][]> | null = null;
export function fetchProductRows(): Promise<string[][]> {
  if (!rowsCache) {
    rowsCache = fetch(PRODUCT_URL, { cache: "no-store" })
      .then(res => { if (!res.ok) throw new Error("제품별 시트를 불러오지 못했어요"); return res.text(); })
      .then(parseCSVFull)
      .catch(e => { rowsCache = null; throw e; });
  }
  return rowsCache;
}
