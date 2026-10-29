// 매출 목표 시트 (미국 파일, gid 275604972 "매출 목표")
//  헤더 행: 10월 담당자 | 분류 | 참고 코드(SKU) | 품목명 | 1월 매출 | 1월 판매량 | … | 10월 매출 | … | 10월 판매량 …
//  품목 행마다 월별 목표 매출. 아래쪽의 다른 표(원가 구조 등)는 빈 줄 여러 개 뒤에 있어서 제외

import { parseCSVFull } from "./gmax";
import { ProductInfo } from "./report";

const SHEET_ID = "1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24";
const GID_TARGET = "275604972";
const LAST_ROW = 50; // 미국 목표 표는 시트 50행까지 (그 아래는 다른 표)

export interface TargetRow {
  owner: string;
  sku: string;              // 참고 코드 (없거나 "TBU"면 "")
  name: string;             // 품목명
  byMonth: Record<number, number>; // 월(1~12) → 목표 매출
  qtyByMonth: Record<number, number>; // 월(1~12) → 목표 판매량
}

// opts.lastRow: 이 행(시트 행 번호)까지만 읽기 · opts.stopAtBlank: 품목 다음 첫 빈 줄에서 멈춤 (영국: 아래에 재고·캠페인 표가 붙어 있음)
export function parseTargets(rows: string[][], opts: { lastRow?: number; stopAtBlank?: boolean } = {}): { rows: TargetRow[]; months: number[] } {
  const lastRow = opts.lastRow ?? LAST_ROW;
  const norm = (v: string | undefined) => (v || "").replace(/\s+/g, "");
  const isName = (c: string) => ["품목명", "제품"].includes(norm(c));
  const h = rows.findIndex(r => r.some(isName) && r.some(c => /^\d{1,2}월매출$/.test(norm(c))));
  if (h < 0) return { rows: [], months: [] };
  const header = rows[h];
  const cName = header.findIndex(isName);
  const cSku = header.findIndex(c => ["참고코드", "코드"].includes(norm(c)));
  const cOwner = header.findIndex(c => norm(c).includes("담당자"));
  const monthCols: { month: number; col: number }[] = [];
  header.forEach((c, i) => {
    const m = norm(c).match(/^(\d{1,2})월매출$/); // "6월 매출 예상" 같은 열은 제외
    if (m) monthCols.push({ month: parseInt(m[1]), col: i });
  });
  const qtyCols: { month: number; col: number }[] = [];
  header.forEach((c, i) => {
    const m = norm(c).match(/^(\d{1,2})월판매량$/);
    if (m) qtyCols.push({ month: parseInt(m[1]), col: i });
  });

  const num = (v: string | undefined) => {
    const t = (v || "").replace(/[,\s₩$]/g, "");
    const n = parseFloat(t);
    return !t || t.startsWith("#") || t.includes("%") || isNaN(n) ? 0 : n;
  };

  const out: TargetRow[] = [];
  let blank = 0;
  for (let i = h + 1; i < Math.min(rows.length, lastRow); i++) {
    const r = rows[i];
    if (opts.stopAtBlank && out.length && r.every(c => !c.trim())) break;
    const name = (r[cName] || "").split("\n")[0].replace(/\s+/g, " ").trim();
    if (!name) { if (++blank >= 10) break; continue; } // 빈 줄이 이어지면 목표 표 끝
    blank = 0;
    if (name.includes("매출액")) continue; // "단품 매출액" 같은 합계 행
    const skuRaw = (r[cSku] || "").trim();
    const byMonth: Record<number, number> = {};
    for (const { month, col } of monthCols) byMonth[month] = num(r[col]);
    const qtyByMonth: Record<number, number> = {};
    for (const { month, col } of qtyCols) qtyByMonth[month] = num(r[col]);
    out.push({ owner: (r[cOwner] || "").trim(), sku: /^(SB|BD)\d+/.test(skuRaw) ? skuRaw : "", name, byMonth, qtyByMonth });
  }
  return { rows: out, months: monthCols.map(m => m.month) };
}

// 지역마다 시트가 달라서 (시트 ID, gid)별로 캐시
const cache: Record<string, Promise<{ rows: TargetRow[]; months: number[] }>> = {};
export function fetchTargets(sheetId: string = SHEET_ID, gid: string = GID_TARGET, opts: { lastRow?: number; stopAtBlank?: boolean } = {}) {
  const k = `${sheetId}:${gid}`;
  if (!cache[k]) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    cache[k] = fetch(url, { cache: "no-store" })
      .then(res => res.ok ? res.text() : "")
      .then(t => {
        if (!t || /^\s*<(!doctype|html)/i.test(t)) throw new Error("매출 목표 시트를 불러오지 못했어요 (시트가 '링크가 있는 모든 사용자 보기'로 공유돼 있는지 확인해 주세요)");
        return parseTargets(parseCSVFull(t), opts);
      })
      .catch(e => { delete cache[k]; throw e; });
  }
  return cache[k];
}

// ─────────────────────────────────────────────────────────────
// 목표 시트 품목 ↔ GMV | by Product 제품 연결
//  1) 참고 코드(SKU)가 있으면 SKU로
//  2) 없으면 아래 별칭표 → 3) 이름이 같으면(공백·"헤어_" 무시) 연결
//  목표 시트에 참고 코드를 채우면 별칭표 없이도 정확히 연결돼요
// ─────────────────────────────────────────────────────────────
export const NAME_ALIAS: Record<string, string> = {
  "실펩토너 x 2": "BD0099",                          // 실펩 EGF 토너 (300ml) 2개
  "실펩토너 x 3": "BD0100",                          // 실펩 EGF 토너 (300ml) 3개
  "실펩토너 2종_실펩토너, 딥콜세럼": "BD0096",          // 실펩토너 + 딥콜세럼
  "실펩토너 3종_실펩토너, 실펩앰플, 딥콜크림": "BD0097", // 실펩토너 + 실펩앰플 + EGF크림 (확인 필요)
  "넥괄사": "SB1744_US",                             // 괄사크림
  "실펩 아이크림": "SB0927_US",                       // 실펩아이크림
  "헤어_실펩 샴푸 + 트리트먼트": "BD0092",
  "헤어_실펩 샴푸 + 트리트먼트 +스칼프 세럼": "BD0093",
};

const key = (s: string) => s.replace(/^헤어_/, "").replace(/\s+/g, "").toLowerCase();

// 같은 SKU가 여러 리스팅(PID)으로 나뉘어 있으면 모두 더하도록 해당 제품 칸 번호를 전부 돌려줌
export function matchProduct(t: TargetRow, products: ProductInfo[]): { indices: number[]; via: "sku" | "alias" | "name" | null } {
  // 영국 시트는 단품 SKU가 _UK로 끝나서, _US 코드면 _UK로도 찾음
  const bySku = (sku: string) => {
    const alt = sku.replace(/_US$/, "_UK");
    return products.map((p, i) => (p.sku === sku || p.sku === alt ? i : -1)).filter(i => i >= 0);
  };
  if (t.sku) {
    const ix = bySku(t.sku);
    if (ix.length) return { indices: ix, via: "sku" };
  }
  const alias = NAME_ALIAS[t.name];
  if (alias) {
    const ix = bySku(alias);
    if (ix.length) return { indices: ix, via: "alias" };
  }
  const ix = products.map((p, i) => (key(p.name) === key(t.name) ? i : -1)).filter(i => i >= 0);
  return ix.length ? { indices: ix, via: "name" } : { indices: [], via: null };
}
