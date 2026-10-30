"use client";
import { useMemo } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  BarController, LineController, Tooltip, Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import type { ProductDaily } from "@/lib/useSheetData";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Tooltip, Legend);

// 제품 상세: 월별 샘플출고수 + 신규 소재 + 매출 소재 (콤보 차트)
//  - 샘플출고수: GMV | by Product 시트의 해당 SKU '샘플출고수' 일별 값 → 월 합계
//  - 신규/매출 소재: GMV | 소재 시트의 해당 SKU 월 행 (B열 2609 등)
//  - 소재 수(막대)와 샘플출고수(선)는 크기 차이가 커서 축을 나눔: 왼쪽 = 소재, 오른쪽 = 샘플

const C_NEW = "#8b5cf6";
const C_SALES = "#ec4899";
const C_SMP = "#10b981";

interface SojaeLike { dt?: string; sku?: string; newVideo?: number | string; makingSales?: number | string; }

interface Props {
  sku: string;
  productDaily?: ProductDaily;
  sojaeData: SojaeLike[];
}

export default function ProductMonthlyActivity({ sku, productDaily, sojaeData }: Props) {
  const rows = useMemo(() => {
    const map: Record<string, { smp: number; newV: number; sales: number }> = {}; // "2609" → 값
    const get = (k: string) => (map[k] ||= { smp: 0, newV: 0, sales: 0 });

    // 샘플출고수 (일별 → 월)
    let lastDate = "";
    const i = productDaily ? productDaily.products.findIndex(p => p.sku === sku) : -1;
    if (productDaily && i >= 0) {
      for (const d of productDaily.days) {
        const k = d.date.slice(2, 4) + d.date.slice(5, 7); // "2026-09-03" → "2609"
        get(k).smp += d.smp?.[i] || 0;
        if (d.rev[i] || d.ord[i] || d.smp?.[i]) lastDate = d.date;
      }
    }
    // 신규 소재 · 매출 소재 (월 행)
    for (const r of sojaeData) {
      if (r.sku !== sku || !r.dt || !/^\d{4}$/.test(r.dt)) continue;
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
  }, [sku, productDaily, sojaeData]);

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
        type: "line" as const, label: "샘플출고수", data: rows.map(r => r.smp), yAxisID: "y1", order: 1,
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
        callbacks: { label: (c: any) => `${c.dataset.label}: ${Number(c.parsed.y).toLocaleString("ko-KR")}${c.dataset.yAxisID === "y1" ? "건" : "개"}` },
      },
    },
    scales: {
      y: { beginAtZero: true, position: "left" as const, title: { display: true, text: "소재 수 (개)", color: "#6b7280" }, grid: { color: "rgba(0,0,0,0.05)" } },
      y1: { beginAtZero: true, position: "right" as const, title: { display: true, text: "샘플출고수 (건)", color: C_SMP }, ticks: { color: C_SMP }, grid: { drawOnChartArea: false } },
      x: { grid: { display: false } },
    },
  };

  const th: React.CSSProperties = { padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "#6b7280", textAlign: "right", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "6px 10px", fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums", borderBottom: "1px solid #f1f5f9" };
  const dot = (c: string) => <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: c, marginRight: 6 }} />;

  return (
    <div>
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
        샘플출고수 = GMV | by Product 시트 · 신규/매출 소재 = GMV | 소재 시트 · 막대(소재)는 왼쪽 축, 선(샘플)은 오른쪽 축
      </div>
    </div>
  );
}
