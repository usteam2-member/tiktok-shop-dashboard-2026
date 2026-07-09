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

function getTopByDays(
  productDailyOrders: Record<string, Record<string, number>>,
  lastDate: Date,
  days: number | null
): { name: string; orders: number }[] {
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

    const lastDt = daily[daily.length - 1]?.dt || "260101";
    const thisMonth = lastDt.slice(0, 4);
    const lastDate = new Date(
      2000 + parseInt(lastDt.slice(0, 2)),
      parseInt(lastDt.slice(2, 4)) - 1,
      parseInt(lastDt.slice(4, 6))
    );

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

    const pidRow = prodRows[0] || [];
    const skuRow = prodRows[1] || [];

    const productCols: { name: string; pid: string; sku: string; col: number }[] = [];

    if (bestHeaderRow >= 0) {
      const headerRow = prodRows[bestHeaderRow] || [];
      for (let c = 2; c < headerRow.length; c++) {
        const cell = (headerRow[c] || "").trim();
        if (!cell.includes("매출액(KRW)")) continue;
        const name = extractName(cell);
        if (!name) continue;
        let pid = "";
        let sku = "";
        for (let back = c; back >= Math.max(0, c - 4); back--) {
          const pidVal = (pidRow[back] || "").trim();
          const skuVal = (skuRow[back] || "").trim();
          if (!pid && /^\d{10,}$/.test(pidVal)) pid = pidVal;
          if (!sku && /[A-Z]+\d+_[A-Z]+/.test(skuVal)) sku = skuVal;
        }
        productCols.push({ name, pid, sku, col: c });
      }
    }

    const productDailyOrders: Record<string, Record<string, number>> = {};
    const productDailySamples: Record<string, Record<string, number>> = {};
    const productDailyRevenue: Record<string, Record<string, number>> = {};

    for (const { name } of productCols) {
      productDailyOrders[name] = {};
      productDailySamples[name] = {};
      productDailyRevenue[name] = {};
    }

    for (const row of prodRows.slice(bestHeaderRow + 1)) {
      const dtRaw = (row[1] || "").replace(/\s/g, "");
      if (!isDt(dtRaw)) continue;
      for (const { name, col } of productCols) {
        const rev = safeNum(row[col] || "0");
        const ord = safeNum(row[col + 1] || "0");
        const smp = safeNum(row[col + 2] || "0");
        if (rev > 0) productDailyRevenue[name][dtRaw] = (productDailyRevenue[name][dtRaw] || 0) + rev;
        if (ord > 0) productDailyOrders[name][dtRaw] = (productDailyOrders[name][dtRaw] || 0) + ord;
        if (smp > 0) productDailySamples[name][dtRaw] = (productDailySamples[name][dtRaw] || 0) + smp;
      }
    }

    const products = productCols.map(({ name, pid, sku }) => {
      const ordByDay = productDailyOrders[name] || {};
      const smpByDay = productDailySamples[name] || {};
      const revByDay = productDailyRevenue[name] || {};

      const calcOrd = (days: number | null) => Object.entries(ordByDay).reduce((a, [dt, v]) => {
        if (days === null) return a + v;
        const y = 2000+parseInt(dt.slice(0,2)), m = parseInt(dt.slice(2,4))-1, d = parseInt(dt.slice(4,6));
        const diff = Math.round((lastDate.getTime() - new Date(y,m,d).getTime()) / 86400000);
        return diff < days ? a + v : a;
      }, 0);

      // 전체 일별 시계열 (제한 없음)
      const allDts = new Set([
        ...Object.keys(ordByDay),
        ...Object.keys(smpByDay),
        ...Object.keys(revByDay),
      ]);
      const dailySeries = Array.from(allDts)
        .sort()
        .map(dt => ({
          dt,
          ord: ordByDay[dt] || 0,
          smp: smpByDay[dt] || 0,
          rev: revByDay[dt] || 0,
        }))
        .filter(r => r.ord > 0 || r.smp > 0 || r.rev > 0);

      return {
        name, pid, sku,
        ordToday: ordByDay[lastDt] || 0,
        ord7: calcOrd(7),
        ord30: calcOrd(30),
        ordThisMonth: Object.entries(ordByDay).reduce((a, [dt, v]) => dt.slice(0,4) === thisMonth ? a+v : a, 0),
        smpThisMonth: Object.entries(smpByDay).reduce((a, [dt, v]) => dt.slice(0,4) === thisMonth ? a+v : a, 0),
        newSojae: 0,
        revSojae: 0,
        dailySeries,
      };
    });

    const productTop10ByPeriod = {
      "1": getTopByDays(productDailyOrders, lastDate, 1),
      "7": getTopByDays(productDailyOrders, lastDate, 7),
      "30": getTopByDays(productDailyOrders, lastDate, 30),
      "90": getTopByDays(productDailyOrders, lastDate, 90),
      "all": getTopByDays(productDailyOrders, lastDate, null),
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
      daily, productTop10ByPeriod, products, sojae,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
