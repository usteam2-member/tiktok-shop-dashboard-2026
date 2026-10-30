"use client";
import { useMemo, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  BarController, LineController, Tooltip, Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import type { PidMonthly } from "@/lib/useSheetData";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Tooltip, Legend);

// 제품 상세: 월별 샘플출고수 + 신규 소재 + 매출 소재 (콤보 차트)
//  - 샘플출고수: GMV | by Product 시트의 해당 PID '샘플출고수' 일별 값 → 월 합계
//  - 신규/매출 소재: GMV | 소재 시트의 해당 PID 월 행 (PID가 없으면 SKU)
//  - 축: '축 나누기'(소재 = 왼쪽, 샘플 = 오른쪽) / '같은 축'(셋 다 왼쪽) 전환

const C_NEW = "#8b5cf6";
const C_SALES = "#ec4899";
const C_SMP = "#10b981";

interface SojaeLike { dt?: string; sku?: string; pid?: string; newVideo?: number | string; makingSales?: number | string; }

interface Props {
  pid: string;
  sku: string;
  pidMonthly?: PidMonthly;
  sojaeData: SojaeLike[];
}

export default function ProductMonthlyActivity({ pid, sku, pidMonthly, sojaeData }: Props) {
  const [sameScale, setSameScale] = useState(false);
  const rows = useMemo(() => {
    const map: Record<string, { smp: number; newV: number; sales: number }> = {}; // "2609" → 값
    const get = (k: string) => (map[k] ||= { smp: 0, newV: 0, sales: 0 });

    // 샘플출고수 (PID 월 합계)
    const lastDate = pidMonthly?.lastDate[pid] || "";
    for (const [k, v] of Object.entries(pidMonthly?.months[pid] || {})) get(k).smp += v.smp;
    // 신규 소재 · 매출 소재 (월 행) — 소재 시트에 이 PID가 있으면 PID로, 없으면 SKU로
    const byPid = sojaeData.some(r => r.pid && r.pid === pid);
    for (const r of sojaeData) {
      if ((byPid ? r.pid !== pid : r.sku !== sku) || !r.dt || !/^\d{4}$/.test(r.dt)) continue;
      get(r.dt).newV += Number(r.newVideo) || 0;
      get(r.dt).sales += Number(r.makingSales) || 0;
    }

    // 값이 있는 첫 달 ~ 마지막 달 (최근 12개월)
    const keys = Object.keys(map).filter(k => map[k].smp || map[k].newV || map[k].sales).sort();
    if (!keys.length) return [];
    const all = Object.keys(map).sort().filter(k => k >= keys[0] && k <= keys[keys.length - 1]).slice(-12);
    const ongoing = lastDate ? lastDate.slice(2, 4) + lastDate.slice(5, 7) : "";
    const lastDay = lastDate ? parseInt(lastDate.slice(8, 10)) : 0;
    const daysInMonth = lastDate ? new Date(Date.UTC(+lastDate.slice(0, 4), +lastDate.slice(5, 7), 0)).getUTCDate() : 0;
    return all.map(k => ({
      key: k,
      label: `${parseInt(k.slice(2))}월`,
      partial: k === ongoing && lastDay < daysInMonth, // 아직 진행 중인 달
      ...map[k],
    }));
  }, [pid, sku, pidMonthly, sojaeData]);

  if (!rows.length) {
    return <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>데이터를 불러올 수 없습니다</div>;
  }

  const labels = rows.map(r => (r.partial ? `${r.label}(진행 중)` : r.label));
  const data = {
    labels,
    datasets: [
      { type: "bar" as const, label: "신규 소재", data: rows.map(r => r.newV), backgroundColor: C_NEW, borderRadius: 4, yAxisID: "y", order: 2 },
      { type: "bar" as const, label: "매출 소재", data: rows.map(r => r.sales), backgroundColor: C_SALES, borderRadius: 4, yAxisID: "y", order: 2 },
      {
        type: "line" as const, label: "샘플출고수", data: rows.map(r => r.smp), yAxisID: sameScale ? "y" : "y1", order: 1,
        borderColor: C_SMP, backgroundColor: C_SMP, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, tension: 0.3,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { labels: { font: { size: 12 }, usePointStyle: true } },
      tooltip: {
        callbacks: { label: (c: any) => `${c.dataset.label}: ${Number(c.parsed.y).toLocaleString("ko-KR")}${c.dataset.label === "샘플출고수" ? "건" : "개"}` },
      },
    },
    scales: {
      y: { beginAtZero: true, position: "left" as const, title: { display: true, text: sameScale ? "개수 (소재 · 샘플)" : "소재 수 (개)", color: "#6b7280" }, grid: { color: "rgba(0,0,0,0.05)" } },
      y1: { display: !sameScale, beginAtZero: true, position: "right" as const, title: { display: true, text: "샘플출고수 (건)", color: C_SMP }, ticks: { color: C_SMP }, grid: { drawOnChartArea: false } },
      x: { grid: { display: false } },
    },
  };

  const th: React.CSSProperties = { padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#6b7280", textAlign: "right", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "6px 10px", fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums", borderBottom: "1px solid #f1f5f9" };
  const dot = (c: string) => <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: c, marginRight: 6 }} />;

  const btn = (on: boolean): React.CSSProperties => ({
    padding: "4px 12px", fontSize: 12, border: "1px solid #d1d5db", cursor: "pointer",
    background: on ? "#1f2937" : "white", color: on ? "white" : "#374151", fontWeight: on ? 600 : 500,
  });

  return (
    <div>
      {/* 축 보기 전환 */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button onClick={() => setSameScale(false)} style={{ ...btn(!sameScale), borderRadius: "6px 0 0 6px" }}>축 나누기</button>
        <button onClick={() => setSameScale(true)} style={{ ...btn(sameScale), borderRadius: "0 6px 6px 0", borderLeft: "none" }}>같은 축</button>
      </div>
      <div style={{ height: 340 }}>
        <Chart type="bar" data={data as any} options={options as any} />
      </div>
      {/* 월별 숫자 표 — 그래프에서 작은 값도 바로 읽을 수 있게 */}
      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 120 + rows.length * 70 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }} />
              {rows.map((r, i) => <th key={r.key} style={th}>{labels[i]}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr><td style={{ ...td, textAlign: "left", whiteSpace: "nowrap" }}>{dot(C_SMP)}샘플출고수</td>{rows.map(r => <td key={r.key} style={td}>{r.smp.toLocaleString("ko-KR")}</td>)}</tr>
            <tr><td style={{ ...td, textAlign: "left", whiteSpace: "nowrap" }}>{dot(C_NEW)}신규 소재</td>{rows.map(r => <td key={r.key} style={td}>{r.newV.toLocaleString("ko-KR")}</td>)}</tr>
            <tr><td style={{ ...td, textAlign: "left", whiteSpace: "nowrap" }}>{dot(C_SALES)}매출 소재</td>{rows.map(r => <td key={r.key} style={td}>{r.sales.toLocaleString("ko-KR")}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
        샘플출고수 = GMV | by Product 시트 · 신규/매출 소재 = GMV | 소재 시트 · {sameScale ? "세 지표 모두 왼쪽 축 (같은 눈금)" : "막대(소재)는 왼쪽 축, 선(샘플)은 오른쪽 축"}
      </div>
    </div>
  );
}
