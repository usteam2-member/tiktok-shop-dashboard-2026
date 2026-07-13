import { NextResponse } from "next/server";

const KPI_SHEET_ID = "1nIN6akTKgT3x1ZJbmkWQ7o3KuhClczUCX5TX5WN-OsU";
const KPI_GID = "934469246";

function sheetUrl(sheetId: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
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

function safePercent(v: string): number {
  const n = parseFloat(v.replace(/[,%\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

async function fetchKpiSheet() {
  const res = await fetch(sheetUrl(KPI_SHEET_ID, KPI_GID), { cache: "no-store" });
  if (!res.ok) throw new Error(`KPI 시트 로드 실패`);
  return parseCSV(await res.text());
}

export async function GET() {
  try {
    const rows = await fetchKpiSheet();

    // 헤더 행 찾기 (행 4, 인덱스 3)
    const headerRowIdx = 3;
    if (rows.length <= headerRowIdx) {
      throw new Error("KPI 시트가 비어있습니다");
    }

    const headerRow = rows[headerRowIdx];

    // 컬럼 인덱스 매핑
    // A=0: 항목, B=1: 담당자, C=2: fastmoss, D=3: PID, E=4: 제품명
    // F-I: 초대 (목표, 현재, 달성률, 초과부족)
    // J-M: 출고 (목표, 현재, 출고율, 초과부족)
    // N-Q: 영상 (목표, 현재, 영상위수, 현재기준완)

    const kpiData: Record<
      string,
      {
        product: string;
        invite: { target: number; current: number; rate: number; diff: number };
        shipment: { target: number; current: number; rate: number; diff: number };
        video: { target: number; current: number; rate: number; completed: string };
      }
    > = {};

    // 데이터 시작: 행 24 (인덱스 23)
    const dataStartIdx = 23;

    for (let i = dataStartIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 18) continue;

      const pid = (row[3] || "").trim();
      const product = (row[4] || "").trim();

      if (!pid || !product) continue;

      // 초대: F(5), G(6), H(7), I(8)
      const inviteTarget = safeNum(row[5] || "0");
      const inviteCurrent = safeNum(row[6] || "0");
      const inviteRate = safePercent(row[7] || "0");
      const inviteDiff = safeNum(row[8] || "0");

      // 출고: J(9), K(10), L(11), M(12)
      const shipmentTarget = safeNum(row[9] || "0");
      const shipmentCurrent = safeNum(row[10] || "0");
      const shipmentRate = safePercent(row[11] || "0");
      const shipmentDiff = safeNum(row[12] || "0");

      // 영상: N(13), O(14), P(15), Q(16)
      const videoTarget = safeNum(row[13] || "0");
      const videoCurrent = safeNum(row[14] || "0");
      const videoRate = safePercent(row[15] || "0");
      const videoCompleted = (row[16] || "").trim();

      kpiData[pid] = {
        product,
        invite: {
          target: inviteTarget,
          current: inviteCurrent,
          rate: inviteRate,
          diff: inviteDiff,
        },
        shipment: {
          target: shipmentTarget,
          current: shipmentCurrent,
          rate: shipmentRate,
          diff: shipmentDiff,
        },
        video: {
          target: videoTarget,
          current: videoCurrent,
          rate: videoRate,
          completed: videoCompleted,
        },
      };
    }

    return NextResponse.json({
      kpi: kpiData,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
