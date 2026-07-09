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
  const n = parseFloat(v.replace(/[,\s₩$%#]/g, ""));
  return isNaN(n) ? 0 : n;
}

async function fetchSheet(name: string) {
  const res = await fetch(sheetUrl(name), { cache: "no-store" });
  if (!res.ok) throw new Error(`시트 로드 실패: ${name}`);
  return parseCSV(await res.text());
}

function extractName(cell: string): string {
  return cell
    .replace(/매출액\(KRW\)/g, "")
    .replace(/주문수/g, "")
    .replace(/샘플출고수/g, "")
    .replace(/[A-Z0-9]+_US/g, "")
    .replace(/BD\w+/g, "")
    .replace(/\d{10,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  try {
    // ── GMV | Daily ──────────────────────────────────────────────
    const dailyRows = await fetchSheet("GMV | Daily");
    const daily: {
      dt: string; krw: number; ord: number; smp: number; aff: number;
      adCost: number; roas: number; unitPriceUsd: number;
    }[] = [];

    for (const row of dailyRows) {
      const dtRaw = (row[1] || "").replace(/\s/g, "");
      if (!isDt(dtRaw)) continue;
      const krw = safeNum(row[9] || "0");
      const ord = safeNum(row[6] || "0");
      if (krw === 0 && ord === 0) continue;
      daily.push({
        dt: dtRaw, krw, ord,
        smp: safeNum(row[5] || "0"),
        aff: safeNum(row[4] || "0"),
        adCost: safeNum(row[11] || "0"),
        roas: safeNum(row[16] || "0"),
        unitPriceUsd: safeNum(row[17] || "0"),
      });
    }

    // ── GMV | by Product ─────────────────────────────────────────
    const prodRows = await fetchSheet("GMV | by Product");

    const MONTH_LABEL: Record<string, string> = {
      "2601":"1월","2602":"2월","2603":"3월","2604":"4월",
      "2605":"5월","2606":"6월","2607":"7월","2608":"8월",
      "2609":"9월","2610":"10월","2611":"11월","2612":"12월",
    };

    let bestHeaderRow = -1;
    let maxCount = 0;
    for (let i = 0; i < Math.min(15, prodRows.length); i++) {
      const count = prodRows[i].filter(c => c.includes("매출액(KRW)")).length;
      if (count > maxCount) { maxCount = count; bestHeaderRow = i; }
    }

    const productCols: { name: string; col: number }[] = [];
    if (bestHeaderRow >= 0) {
      const headerRow = prodRows[bestHeaderRow] || [];
      for (let c = 2; c < headerRow.length; c++) {
        const cell = (headerRow[c] || "").trim();
        if (!cell.includes("매출액(KRW)")) continue;
        const name = extractName(cell);
        if (name) productCols.push({ name, col: c });
      }
    }

    // 일별 제품 주문수 저장
    const productDailyOrders: Record<string, Record<string, number>> = {};
    const productTotals: Record<string, number> = {};

    for (const { name } of productCols) {
      productDailyOrders[name] = {};
      productTotals[name] = 0;
    }

    for (const row of prodRows.slice(bestHeaderRow + 1)) {
      const dtRaw = (row[1] || "").replace(/\s/g, "");
      if (!isDt(dtRaw)) continue;

      for (const { name, col } of productCols) {
        const rev = safeNum(row[col] || "0");
        const ord = safeNum(row[col + 1] || "0");
        if (rev > 0) productTotals[name] += rev;
        if (ord > 0) {
          productDailyOrders[name][dtRaw] = (productDailyOrders[name][dtRaw] || 0) + ord;
        }
      }
    }

    // 마지막 날짜 기준으로 기간별 TOP 10 계산
    const lastDt = daily[daily.length - 1]?.dt || "260101";
    const lastDate = new Date(
      2000 + parseInt(lastDt.slice(0, 2)),
      parseInt(lastDt.slice(2, 4)) - 1,
      parseInt(lastDt.slice(4, 6))
    );

    function getTopByDays(days: number | null): { name: string; orders: number }[] {
      return Object.entries(productDailyOrders)
        .map(([name, dayMap]) => {
          let total = 0;
          for (const [dt, ord] of Object.entries(dayMap)) {
            if (days === null) {
              total += ord;
            } else {
              const y = 2000 + parseInt(dt.slice(0, 2));
              const m = parseInt(dt.slice(2, 4)) - 1;
              const d = parseInt(dt.slice(4, 6));
              const date = new Date(y, m, d);
              const diffDays = Math.round((lastDate.getTime() - date.getTime()) / 86400000);
              if (diffDays < days) total += ord;
            }
          }
          return { name, orders: total };
        })
        .filter(e => e.orders > 0)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10);
    }

    const productTop10ByPeriod = {
      "3": getTopByDays(3),
      "7": getTopByDays(7),
      "30": getTopByDays(30),
      "90": getTopByDays(90),
      "all": getTopByDays(null),
    };

    // ── GMV | 소재 ───────────────────────────────────────────────
    const sojaeRows = await fetchSheet("GMV | 소재");
    const sojae: { month: string; new: number; rev: number }[] = [];

    for (const row of sojaeRows.slice(4)) {
      const mRaw = (row[0] || "").replace(/\s/g, "");
      if (!/^26\d{2}$/.test(mRaw)) continue;
      let newSum = 0, revSum = 0;
      for (let c = 3; c < row.length; c += 4) {
        newSum += safeNum(row[c] || "0");
        if (c + 1 < row.length) revSum += safeNum(row[c + 1] || "0");
      }
      if (newSum > 0 || revSum > 0) {
        sojae.push({ month: MONTH_LABEL[mRaw] || mRaw, new: newSum, rev: revSum });
      }
    }

    return NextResponse.json({
      daily, productTop10ByPeriod, sojae,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
