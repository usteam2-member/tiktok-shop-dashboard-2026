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

    // 디버그: 첫 8행, 첫 15컬럼만
    const debugRows = prodRows.slice(0, 8).map(r => r.slice(0, 15));

    // 모든 행을 스캔해서 제품명 + 매출액(KRW) 헤더 찾기
    const productCols: { name: string; col: number }[] = [];
    const MONTH_LABEL: Record<string, string> = {
      "2601":"1월","2602":"2월","2603":"3월","2604":"4월",
      "2605":"5월","2606":"6월","2607":"7월","2608":"8월",
      "2609":"9월","2610":"10월","2611":"11월","2612":"12월",
    };

    // 헤더 행 찾기: "매출액(KRW)"이 가장 많이 나오는 행
    let bestHeaderRow = -1;
    let maxCount = 0;
    for (let i = 0; i < Math.min(10, prodRows.length); i++) {
      const count = prodRows[i].filter(c => c.trim() === "매출액(KRW)").length;
      if (count > maxCount) { maxCount = count; bestHeaderRow = i; }
    }

    // 제품명 행은 헤더 행 바로 위
    const nameRowIdx = bestHeaderRow - 1;
    const headerRowIdx = bestHeaderRow;

    if (nameRowIdx >= 0 && headerRowIdx >= 0) {
      const nameRow = prodRows[nameRowIdx] || [];
      const headerRow = prodRows[headerRowIdx] || [];
      let lastName = "";

      for (let c = 2; c < nameRow.length; c++) {
        const n = (nameRow[c] || "").trim();
        if (n && n !== "매출액(KRW)" && n !== "주문수" && n !== "샘플출고수") {
          lastName = n;
        }
        const h = (headerRow[c] || "").trim();
        if (h === "매출액(KRW)" && lastName) {
          productCols.push({ name: lastName, col: c });
        }
      }
    }

    const productTotals: Record<string, number> = {};
    const productMonthOrders: Record<string, Record<string, number>> = {};

    for (const { name } of productCols) {
      productTotals[name] = 0;
      productMonthOrders[name] = {};
    }

    // 데이터 행: 헤더 다음 행부터
    for (const row of prodRows.slice(bestHeaderRow + 1)) {
      const dtRaw = (row[1] || "").replace(/\s/g, "");
      if (!isDt(dtRaw)) continue;
      const month = dtRaw.slice(0, 4);

      for (const { name, col } of productCols) {
        const rev = safeNum(row[col] || "0");
        const ord = safeNum(row[col + 1] || "0");
        if (rev > 0) productTotals[name] += rev;
        if (ord > 0) {
          if (!productMonthOrders[name][month]) productMonthOrders[name][month] = 0;
          productMonthOrders[name][month] += ord;
        }
      }
    }

    const top15 = Object.entries(productTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, total]) => ({ name, total }));

    const allMonths = Array.from(
      new Set(Object.values(productMonthOrders).flatMap(mo => Object.keys(mo)))
    ).sort();

    const monthlyTop10: Record<string, { name: string; orders: number }[]> = {};
    for (const m of allMonths) {
      const entries = Object.entries(productMonthOrders)
        .map(([name, mo]) => ({ name, orders: mo[m] || 0 }))
        .filter(e => e.orders > 0)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10);
      if (entries.length > 0) {
        monthlyTop10[MONTH_LABEL[m] || m] = entries;
      }
    }

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
      daily, top15, monthlyTop10, sojae,
      availableMonths: Object.keys(monthlyTop10),
      debugRows,
      debugInfo: { bestHeaderRow, nameRowIdx, productColsCount: productCols.length },
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
