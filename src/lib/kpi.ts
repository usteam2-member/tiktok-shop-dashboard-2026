// KPI 트랙킹 시트 (1nIN6ak… / gid 934469246, "Performance") 파싱
//
// 시트 구조 (2026-09 기준)
//  - 단계 이름 행: "1. reach out", "2. sample order", "3. Video posting", "4. Order", "5. 히어로 영상"
//  - 헤더 행: 월 | 담당자 | fastmoss 리치아웃 | (수치) | PID | 제품명 | 단계별 [KPI, Today, (%), EOM expected, +/-] ...
//  - 월 블록: A열에 "26/09" 같은 월이 적힌 행부터 다음 합계 행(제품명·PID 빈 행) 전까지
//
// 계산 (시트 수식 대신 대시보드에서 직접 계산)
//  - EOM expected = Today ÷ (보는 날짜 − 1) × 그 달의 일수   (지난달이면 Today 그대로)
//  - +/- = EOM expected − KPI   (KPI가 비어 있으면 표시 안 함)

import { parseCSVFull } from "./gmax";

const KPI_SHEET_ID = "1nIN6akTKgT3x1ZJbmkWQ7o3KuhClczUCX5TX5WN-OsU";
const KPI_GID = "934469246";

export interface KpiStage { key: string; label: string; }

export interface KpiCell { kpi: number | null; today: number; }

export interface KpiProduct {
  owner: string;        // 담당자
  ownerNote: string;    // fastmoss 리치아웃 요일 · 수치
  pid: string;
  name: string;
  cells: KpiCell[];     // stages 순서
}

export interface KpiMonth {
  label: string;        // "26/09"
  year: number;
  month: number;        // 1~12
  products: KpiProduct[];
}

export interface KpiData { stages: KpiStage[]; months: KpiMonth[]; }

const norm = (s: string | undefined) => (s || "").replace(/\s+/g, " ").trim();
const low = (s: string | undefined) => norm(s).toLowerCase();

function numOrNull(v: string | undefined): number | null {
  const t = (v || "").replace(/[,\s₩$]/g, "");
  if (!t || t.includes("%") || t.startsWith("#")) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

export function parseKpiSheet(rows: string[][]): KpiData {
  // 1) 헤더 행 = "EOM expected"가 가장 많은 행
  let h = -1, best = 0;
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const cnt = rows[i].filter(c => low(c) === "eom expected").length;
    if (cnt > best) { best = cnt; h = i; }
  }
  if (h < 0) return { stages: [], months: [] };
  const header = rows[h];
  const stageRow = rows[h - 1] || [];

  // 2) 단계 = "KPI" 열에서 시작해 Today / EOM expected가 뒤따르는 묶음
  const colPid = header.findIndex(c => low(c) === "pid");
  const colName = header.findIndex(c => norm(c) === "제품명");
  const groups: { label: string; kpi: number; today: number }[] = [];
  for (let c = 0; c < header.length; c++) {
    if (low(header[c]) !== "kpi") continue;
    const next = header.slice(c + 1, c + 6).map(low);
    const t = next.indexOf("today");
    const e = next.indexOf("eom expected");
    if (t < 0 || e < 0) continue;
    const raw = [0, 1, 2].map(k => norm(stageRow[c + k])).find(v => v) || `단계 ${groups.length + 1}`;
    groups.push({ label: raw.replace(/^\d+\.\s*/, ""), kpi: c, today: c + 1 + t });
  }
  const stages = groups.map((g, i) => ({ key: `s${i}`, label: g.label }));

  // 3) 월 블록
  const months: KpiMonth[] = [];
  let cur: KpiMonth | null = null;
  let owner = "", ownerNote = "";
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i];
    const m = norm(r[0]).match(/^(\d{2})\/(\d{2})/);
    if (m) {
      cur = { label: `${m[1]}/${m[2]}`, year: 2000 + parseInt(m[1]), month: parseInt(m[2]), products: [] };
      months.push(cur);
      owner = ""; ownerNote = "";
    }
    if (!cur) continue;
    const name = norm(r[colName]);
    const pid = norm(r[colPid]);
    if (!name && !pid) { cur = null; continue; } // 합계 행 / 빈 행 → 블록 끝
    if (norm(r[1])) {
      owner = norm(r[1]).split(/\s{1,}(?=[A-Z])/)[0]; // "다희, 지연 Dahee, Jiyeon" → 한글 부분만
      const day = norm(r[2]), cnt = norm(r[3]);
      ownerNote = [day && `리치아웃 ${day}요일`, cnt && !cnt.includes("%") && `fastmoss ${cnt}`].filter(Boolean).join(" · ");
    }
    if (!name) continue;
    cur.products.push({
      owner, ownerNote, pid, name,
      cells: groups.map(g => ({ kpi: numOrNull(r[g.kpi]), today: numOrNull(r[g.today]) ?? 0 })),
    });
  }
  return { stages, months: months.filter(mo => mo.products.length) };
}

export async function fetchKpi(): Promise<KpiData> {
  const url = `https://docs.google.com/spreadsheets/d/${KPI_SHEET_ID}/export?format=csv&gid=${KPI_GID}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("KPI 시트를 불러오지 못했어요 (시트가 '링크가 있는 모든 사용자' 보기로 공유돼 있는지 확인해 주세요)");
  return parseKpiSheet(parseCSVFull(await res.text()));
}

// 경과 일수: 보는 날짜 − 1 (그 달이 지났으면 그 달 전체 일수)
export function elapsedDays(year: number, month: number, now: Date) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const ny = now.getFullYear(), nm = now.getMonth() + 1;
  if (ny > year || (ny === year && nm > month)) return { elapsed: daysInMonth, daysInMonth };
  if (ny < year || (ny === year && nm < month)) return { elapsed: 0, daysInMonth };
  return { elapsed: Math.max(0, now.getDate() - 1), daysInMonth };
}

export function eom(today: number, elapsed: number, daysInMonth: number): number | null {
  if (elapsed <= 0) return null;
  return (today / elapsed) * daysInMonth;
}
