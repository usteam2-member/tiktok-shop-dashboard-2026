import { NextResponse } from "next/server";

const SHEET_ID = "1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24";

function sheetUrl(sheetName: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
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

function isDt(v: string) {
  return /^2[6-9]\d{4}$/.test(v.replace(/\s/g, ""));
}

function safeNum(v: string): number {
  const n = parseFloat(v.replace(/[,\s₩$]/g, ""));
  return isNaN(n) ? 0 : n;
}

async function fetchSheet(name: string) {
  const res = await fetch(sheetUrl(name), { cache: "no-store" });
  if (!res.ok) throw new Error(`시트 로드 실패: ${name}`);
  return parseCSV(await res.text());
}

// "세럼 매출액(KRW)" → "세럼" 추출
function extractProductName(cellValue: string): string {
  return cellValue
    .replace(/매출액\(KRW\)/g, "")
    .replace(/주문수/g, "")
    .replace(/샘플출고수/g, "")
    .replace(/SB\w+_US/g, "")
    .replace(/BD\w+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  try {
    // ── GMV | Daily ──────────────────────────────────────────────
    const dailyRows = await fetchSheet("GMV | Daily");
    const daily: { dt: string; krw: number; ord: number; smp: number; aff: number }[] = [];

    for (const row of dailyRows) {
      const dtRaw = (row[1] || "").replace(/\s/g, "");
      if (!isDt(dtRaw)) continue;
      const krw = safeNum(row[9] || "0");
      const ord = safeNum(row[6] || "0");
      const smp = safeNum(row[5] || "0");
      const aff = safeNum(row[4] || "0");
      if (krw === 0 && ord === 0) continue;
      daily.push({ dt: dtRaw, krw, ord, smp, aff });
    }

    // ── GMV | by Product ─────────────────────────────────────────
    const prodRows = await fetchSheet("GMV | by Product");

    // 3행(index 2): "SB0791_US 세럼 매출액(KRW)" 형태로 제품명+헤더 합쳐짐
    const headerRow = prodRows[2] || [];

    const productCols: { name: string; col: number }[] = [];

    for (let c = 2; c < headerRow.length; c++) {
      const cell = (headerRow[c] || "").trim();
      if (!cell.includes("매출액(KRW)")) continue;
      const name = extractProductName(cell);
      if (name) productCols.push({ name, col: c });
    }

    const lastDt = daily[daily.length - 1]?.dt || "260101";
    const thisMonth = lastDt.slice(0, 4);

    const productTotals: Record<string, number> = {};
    const productOrders: Record<string, number> = {};
    for (const { name } of productCols) {
      productTotals[name] = 0;
      productOrders[name] = 0;
    }

    // 데이터는 5행(index 4)부터
    for (const row of prodRows.slice(4)) {
      const dtRaw = (row[1] || "").replace(/\s/g, "");
      if (!isDt(dtRaw)) continue;
      const isThisMonth = dtRaw.slice(0, 4) === thisMonth;
      for (const { name, col } of productCols) {
        productTotals[name] += safeNum(row[col] || "0");
        if (isThisMonth) productOrders[name] += safeNum(row[col + 1] || "0");
      }
    }

    const top15 = Object.entries(productTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, total]) => ({ name, total }));

    const thisMonthTop10 = Object.entries(productOrders)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, orders]) => ({ name, orders }));

    // ── GMV | 소재 ───────────────────────────────────────────────
    const sojaeRows = await fetchSheet("GMV | 소재");
    const sojae: { month: string; new: number; rev: number }[] = [];
    const monthLabel: Record<string, string> = {
      "2601":"1월","2602":"2월","2603":"3월","2604":"4월",
      "2605":"5월","2606":"6월","2607":"7월","2608":"8월",
      "2609":"9월","2610":"10월","2611":"11월","2612":"12월",
    };

    for (const row of sojaeRows.slice(4)) {
      const mRaw = (row[0] || "").replace(/\s/g, "");
      if (!/^26\d{2}$/.test(mRaw)) continue;
      let newSum = 0, revSum = 0;
      for (let c = 3; c < row.length; c += 4) {
        newSum += safeNum(row[c] || "0");
        if (c + 1 < row.length) revSum += safeNum(row[c + 1] || "0");
      }
      if (newSum > 0 || revSum > 0) {
        sojae.push({ month: monthLabel[mRaw] || mRaw, new: newSum, rev: revSum });
      }
    }

    return NextResponse.json({
      daily, top15, thisMonthTop10, sojae,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
