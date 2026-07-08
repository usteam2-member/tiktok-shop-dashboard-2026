import { NextResponse } from "next/server";

const SHEET_ID = "1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24";

// 구글 시트 탭 이름 → CSV URL 변환
function sheetUrl(sheetName: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

// CSV 파싱 (따옴표 포함 처리)
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

// "260101" 형식 날짜 판별
function isDt(v: string) {
  return /^2[6-9]\d{4}$/.test(v.replace(/\s/g, ""));
}

function safeNum(v: string): number {
  const n = parseFloat(v.replace(/[,\s₩$]/g, ""));
  return isNaN(n) ? 0 : n;
}

async function fetchSheet(name: string) {
  const res = await fetch(sheetUrl(name), { next: { revalidate: 300 } }); // 5분 캐시
  if (!res.ok) throw new Error(`시트 로드 실패: ${name}`);
  return parseCSV(await res.text());
}

export async function GET() {
  try {
    // ── 1. GMV | Daily ──────────────────────────────────────────────
    const dailyRows = await fetchSheet("GMV | Daily");
    const daily: { dt: string; krw: number; ord: number; smp: number; aff: number }[] = [];

    for (const row of dailyRows) {
      const dtRaw = (row[1] || "").replace(/\s/g, "");
      if (!isDt(dtRaw)) continue;
      daily.push({
        dt: dtRaw,
        krw: safeNum(row[9] || "0"),   // 총 매출 KRW
        ord: safeNum(row[6] || "0"),   // 주문수
        smp: safeNum(row[5] || "0"),   // 샘플 출고
        aff: safeNum(row[4] || "0"),   // 소재 업로드
      });
    }

    // ── 2. GMV | by Product ─────────────────────────────────────────
    const prodRows = await fetchSheet("GMV | by Product");
    const productTotals: Record<string, number> = {};

    // 헤더 행(row index 3)에서 제품명과 컬럼 위치 파악
    const headerRow = prodRows[3] || [];
    const productCols: { name: string; col: number }[] = [];
    for (let c = 3; c < headerRow.length; c += 3) {
      const name = headerRow[c]?.trim();
      const h = (prodRows[4] || [])[c]?.trim();
      if (name && h === "매출액(KRW)") {
        productCols.push({ name, col: c });
        productTotals[name] = 0;
      }
    }

    // 데이터 행에서 제품별 누적 합산
    for (const row of prodRows.slice(7)) {
      const dtRaw = (row[1] || "").replace(/\s/g, "");
      if (!isDt(dtRaw)) continue;
      for (const { name, col } of productCols) {
        productTotals[name] = (productTotals[name] || 0) + safeNum(row[col] || "0");
      }
    }

    // Top 15 정렬
    const top15 = Object.entries(productTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, total]) => ({ name, total }));

    // ── 3. GMV | 소재 ───────────────────────────────────────────────
    const sojaeRows = await fetchSheet("GMV | 소재");
    const sojae: { month: string; new: number; rev: number }[] = [];
    const monthLabel: Record<string, string> = {
      "2601": "1월","2602": "2월","2603": "3월",
      "2604": "4월","2605": "5월","2606": "6월",
      "2607": "7월","2608": "8월","2609": "9월",
      "2610": "10월","2611": "11월","2612": "12월",
    };

    for (const row of sojaeRows.slice(4)) {
      const mRaw = (row[0] || "").replace(/\s/g, "");
      if (!/^26\d{2}$/.test(mRaw)) continue;
      let newSum = 0, revSum = 0;
      for (let c = 3; c < row.length; c += 4) {
        newSum += safeNum(row[c] || "0");
        if (c + 1 < row.length) revSum += safeNum(row[c + 1] || "0");
      }
      sojae.push({ month: monthLabel[mRaw] || mRaw, new: newSum, rev: revSum });
    }

    return NextResponse.json({ daily, top15, sojae, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
