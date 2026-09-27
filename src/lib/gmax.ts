// Gmax 광고 시트 (gid 799909766) 파싱/집계
//
// 시트 구조 (2026-09 기준)
//  - SKU 행: 제품 블록마다 SKU (SB0941_US, BD0096 ...)
//  - 제품명 행: 블록 첫 칸에 제품명 (셀 안 줄바꿈 가능: "실펩토너\ntoner")
//  - 라벨 행: 제품당 4열 = GMV | Ads spend | boosting | ROI
//  - 데이터 행: A=요일, B=YYMMDD (월 합계 행 B=YYMM, '마감 예상' 행은 제외)
//  - ROI = GMV ÷ Ads spend  (예: 9,250,046 ÷ 6,171,495 = 1.50)

import { getProductType } from "./data";

const SHEET_ID = "1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24";
export const GID_GMAX = "799909766";

export interface GmaxProduct { sku: string; name: string; }

export interface GmaxDay {
  date: string;     // "YYYY-MM-DD"
  gmv: number[];    // products 순서
  ads: number[];    // Ads spend (boosting 포함)
  boost: number[];  // boosting
}

export interface GmaxData { products: GmaxProduct[]; days: GmaxDay[]; }

export interface GmaxRow {
  sku: string;
  name: string;
  gmv: number;
  ads: number;          // Ads spend 전체 (boosting 포함)
  boost: number;        // 그중 boosting
  roi: number | null;   // GMV ÷ Ads spend
  boostShare: number;   // boosting ÷ Ads spend (0~1)
}

// 따옴표 안 쉼표·줄바꿈까지 처리하는 CSV 파서
export function parseCSVFull(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQuote = false;
      } else cur += ch;
      continue;
    }
    if (ch === '"') inQuote = true;
    else if (ch === ",") { row.push(cur.trim()); cur = ""; }
    else if (ch === "\n") { row.push(cur.trim()); rows.push(row); row = []; cur = ""; }
    else if (ch !== "\r") cur += ch;
  }
  if (cur || row.length) { row.push(cur.trim()); rows.push(row); }
  return rows;
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[,\s₩$%#]/g, ""));
  return isNaN(n) ? 0 : n;
}

const SKU_RE = /^(SB\d+_[A-Z]+|BD\d+)$/;
const norm = (s: string | undefined) => (s || "").replace(/\s+/g, "").toLowerCase();

function toIsoDate(raw: string | undefined): string | null {
  const v = (raw || "").replace(/\s/g, "");
  if (!/^2\d{5}$/.test(v)) return null;
  const mm = parseInt(v.slice(2, 4)), dd = parseInt(v.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `20${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4, 6)}`;
}

export function parseGmaxSheet(rows: string[][]): GmaxData {
  const empty: GmaxData = { products: [], days: [] };

  // 1) 라벨 행 = "Ads spend"가 가장 많은 행
  let labelIdx = -1, best = 0;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const cnt = rows[i].filter(c => norm(c) === "adsspend").length;
    if (cnt > best) { best = cnt; labelIdx = i; }
  }
  if (labelIdx < 0) return empty;
  const label = rows[labelIdx];

  // 2) SKU 행 = 라벨 행 위에서 SKU 패턴이 가장 많은 행
  let skuIdx = -1; best = 0;
  for (let i = 0; i < labelIdx; i++) {
    const cnt = rows[i].filter(c => SKU_RE.test(c.trim())).length;
    if (cnt > best) { best = cnt; skuIdx = i; }
  }
  // PID 행 = 라벨 행 위에서 15자리 이상 숫자(TikTok 상품 ID)가 가장 많은 행
  const PID_RE = /^\d{15,}$/;
  let pidIdx = -1; best = 0;
  for (let i = 0; i < labelIdx; i++) {
    const cnt = rows[i].filter(c => PID_RE.test(c.trim())).length;
    if (cnt > best) { best = cnt; pidIdx = i; }
  }
  const skuRow = skuIdx >= 0 ? rows[skuIdx] : [];
  const pidRow = pidIdx >= 0 ? rows[pidIdx] : [];
  const nameRow = rows[labelIdx - 1] || [];

  // 3) 제품 블록 = 시트의 제품 칸 하나 (GMV | Ads spend | boosting | ROI)
  //    같은 SKU라도 리스팅(PID)이 다르면 시트처럼 따로 보여줌. SKU가 비어 있는 칸도 포함.
  interface Block { key: string; sku: string; name: string; gmv: number; ads: number; boost: number; }
  const blocks: Block[] = [];
  for (let c = 0; c < label.length; c++) {
    if (norm(label[c]) !== "gmv") continue;
    const find = (key: string) => {
      for (let k = c + 1; k <= c + 3; k++) if (norm(label[k]) === key) return k;
      return -1;
    };
    const ads = find("adsspend");
    if (ads < 0) continue;
    const boost = find("boosting");
    const inBlock = (row: string[], re: RegExp) =>
      [0, 1, 2, 3].map(k => (row[c + k] || "").trim()).find(v => re.test(v)) || "";
    const sku = inBlock(skuRow, SKU_RE);
    const pid = inBlock(pidRow, PID_RE);
    const rawName = [0, 1, 2, 3].map(k => nameRow[c + k] || "").find(v => v.trim()) || sku || `열 ${c + 1}`;
    const name = rawName.split("\n")[0].replace(/\s+/g, " ").trim();
    blocks.push({ key: pid || `col${c}`, sku, name, gmv: c, ads, boost });
  }

  // 블록마다 제품 하나. 이름이 겹치면 SKU / PID 끝자리로 구분
  const products: GmaxProduct[] = blocks.map(b => ({ sku: b.sku, name: `${b.name} ${getProductType(b.sku)}`.trim() }));
  const count: Record<string, number> = {};
  products.forEach(p => { count[p.name] = (count[p.name] || 0) + 1; });
  products.forEach((p, i) => {
    if (count[p.name] > 1) {
      const b = blocks[i];
      p.name = `${p.name} · ${b.sku || ""}${b.key.startsWith("col") ? "" : " #" + b.key.slice(-4)}`.replace(/\s+/g, " ").trim();
    }
  });

  // 4) 날짜 행만 수집
  const seen = new Set<string>();
  let days: GmaxDay[] = [];
  for (let i = labelIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const date = toIsoDate(r[1]) || toIsoDate(r[2]);
    if (!date || seen.has(date)) continue;
    seen.add(date);
    const gmv = new Array(products.length).fill(0);
    const ads = new Array(products.length).fill(0);
    const boost = new Array(products.length).fill(0);
    blocks.forEach((b, p) => {
      gmv[p] += num(r[b.gmv]);
      ads[p] += num(r[b.ads]);
      if (b.boost >= 0) boost[p] += num(r[b.boost]);
    });
    days.push({ date, gmv, ads, boost });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));

  // 아직 입력 안 된 미래 날짜 제거 (광고비가 있는 마지막 날까지)
  let last = days.length - 1;
  while (last >= 0 && days[last].ads.every(v => v === 0) && days[last].gmv.every(v => v === 0)) last--;
  days = days.slice(0, last + 1);

  return { products, days };
}

// 한 페이지에서 여러 곳(Top 10, Gmax광고 탭)이 써도 시트는 한 번만 불러옴
let gmaxPromise: Promise<GmaxData> | null = null;
export function fetchGmax(): Promise<GmaxData> {
  if (!gmaxPromise) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID_GMAX}`;
    gmaxPromise = fetch(url, { cache: "no-store" })
      .then(res => {
        if (!res.ok) throw new Error("Gmax 광고 시트를 불러오지 못했어요");
        return res.text();
      })
      .then(text => parseGmaxSheet(parseCSVFull(text)))
      .catch(e => { gmaxPromise = null; throw e; });
  }
  return gmaxPromise;
}

// 시트는 제품마다 입력 시점이 달라서, 최근 하루이틀은 일부 제품만 채워져 있을 수 있음.
// "입력 완료된 날" = 그날 Ads spend 합계가 직전 7일 중앙값의 50% 이상인 날
export function completeDates(data: GmaxData): Set<string> {
  const totals = data.days.map(d => d.ads.reduce((a, b) => a + b, 0));
  const ok = new Set<string>();
  data.days.forEach((d, i) => {
    const prev = totals.slice(Math.max(0, i - 7), i).filter(v => v > 0).sort((a, b) => a - b);
    const median = prev.length ? prev[Math.floor(prev.length / 2)] : 0;
    if (totals[i] > 0 && (median === 0 || totals[i] >= median * 0.5)) ok.add(d.date);
  });
  return ok;
}

export function lastCompleteDate(data: GmaxData): string {
  const ok = completeDates(data);
  for (let i = data.days.length - 1; i >= 0; i--) if (ok.has(data.days[i].date)) return data.days[i].date;
  return data.days[data.days.length - 1]?.date || "";
}

// 기간(start~end, "YYYY-MM-DD") 제품별 합계. 정렬은 호출하는 쪽에서.
export function aggregateGmaxRange(data: GmaxData, start: string, end: string): GmaxRow[] {
  const rows = data.products.map(p => ({ ...p, gmv: 0, ads: 0, boost: 0 }));
  for (const d of data.days) {
    if ((start && d.date < start) || (end && d.date > end)) continue;
    d.gmv.forEach((v, i) => { rows[i].gmv += v; });
    d.ads.forEach((v, i) => { rows[i].ads += v; });
    d.boost.forEach((v, i) => { rows[i].boost += v; });
  }
  return rows.map(r => {
    const boost = Math.min(r.boost, r.ads);
    return { ...r, boost, roi: r.ads > 0 ? r.gmv / r.ads : null, boostShare: r.ads > 0 ? boost / r.ads : 0 };
  });
}

// period: "YYYY-MM-DD"(일별) 또는 "YYYY-MM"(월별) — 날짜가 이 값으로 시작하는 행을 합산
export function aggregateGmax(data: GmaxData, period: string): GmaxRow[] {
  const rows = data.products.map(p => ({ ...p, gmv: 0, ads: 0, boost: 0 }));
  for (const d of data.days) {
    if (!d.date.startsWith(period)) continue;
    d.gmv.forEach((v, i) => { rows[i].gmv += v; });
    d.ads.forEach((v, i) => { rows[i].ads += v; });
    d.boost.forEach((v, i) => { rows[i].boost += v; });
  }
  return rows
    .filter(r => r.ads > 0)
    .map(r => {
      const boost = Math.min(r.boost, r.ads); // boosting은 Ads spend에 포함
      return {
        ...r,
        boost,
        roi: r.ads > 0 ? r.gmv / r.ads : null,
        boostShare: r.ads > 0 ? boost / r.ads : 0,
      };
    })
    .sort((a, b) => b.ads - a.ads);
}

// 피어슨 상관계수 (-1 ~ 1). 표본 3개 미만이거나 분산이 0이면 null
export function correlation(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

// 스피어만 순위 상관계수: 광고비처럼 한두 제품이 압도적으로 큰 데이터에서도 흐름을 안정적으로 보여줌
export function rankCorrelation(xs: number[], ys: number[]): number | null {
  const rank = (arr: number[]) => {
    const order = arr.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array(arr.length).fill(0);
    for (let i = 0; i < order.length; ) {
      let j = i;
      while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[order[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  return correlation(rank(xs), rank(ys));
}
