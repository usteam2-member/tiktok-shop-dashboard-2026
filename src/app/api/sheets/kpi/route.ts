import { NextResponse } from "next/server";

const KPI_SHEET_ID = "1nIN6akTKgT3x1ZJbmkWQ7o3KuhClczUCX5TX5WN-OsU";
const KPI_GID = "934469246";

function sheetUrl() {
  return `https://docs.google.com/spreadsheets/d/${KPI_SHEET_ID}/export?format=csv&gid=${KPI_GID}`;
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

function safeNum(v: string): number {
  const n = parseFloat(v.replace(/[,\s₩$%#]/g, ""));
  return isNaN(n) ? 0 : n;
}

async function fetchKpiSheet() {
  const res = await fetch(sheetUrl(), { cache: "no-store" });
  if (!res.ok) throw new Error(`KPI 시트 로드 실패`);
  return parseCSV(await res.text());
}

export async function GET() {
  try {
    const rows = await fetchKpiSheet();

    if (rows.length < 4) {
      return NextResponse.json({ kpi: {}, error: "데이터 없음" });
    }

    const kpiData: Record<
      string,
      {
        product: string;
        invite: { target: number; current: number; rate: number };
        shipment: { target: number; current: number; rate: number };
        video: { target: number; current: number; rate: number };
      }
    > = {};

    // 행 4부터 데이터 (인덱스 3)
    const dataStartIdx = 3;

    for (let i = dataStartIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 18) continue;

      const pid = (row[3] || "").trim();
      const product = (row[4] || "").trim();

      if (!pid || !product) continue;

      // 초대: F(5), G(6), H(7)
      const inviteTarget = safeNum(row[5] || "0");
      const inviteCurrent = safeNum(row[6] || "0");
      const inviteRate = inviteTarget > 0 ? (inviteCurrent / inviteTarget) * 100 : 0;

      // 출고: J(9), K(10), L(11)
      const shipmentTarget = safeNum(row[9] || "0");
      const shipmentCurrent = safeNum(row[10] || "0");
      const shipmentRate = shipmentTarget > 0 ? (shipmentCurrent / shipmentTarget) * 100 : 0;

      // 영상: N(13), O(14), P(15)
      const videoTarget = safeNum(row[13] || "0");
      const videoCurrent = safeNum(row[14] || "0");
      const videoRate = videoTarget > 0 ? (videoCurrent / videoTarget) * 100 : 0;

      kpiData[pid] = {
        product,
        invite: { target: inviteTarget, current: inviteCurrent, rate: inviteRate },
        shipment: { target: shipmentTarget, current: shipmentCurrent, rate: shipmentRate },
        video: { target: videoTarget, current: videoCurrent, rate: videoRate },
      };
    }

    return NextResponse.json({ kpi: kpiData, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ kpi: {}, error: String(err) }, { status: 500 });
  }
}
