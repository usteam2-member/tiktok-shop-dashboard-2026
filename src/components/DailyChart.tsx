"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { DailyRow } from "@/lib/data";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface Props {
  data: DailyRow[];
  activeQuick: number | null;
}

function sampleData(data: DailyRow[], activeQuick: number | null): { labels: string[]; rows: DailyRow[] } {
  if (!data.length) return { labels: [], rows: [] };

  // 3일, 7일 → 1일 단위
  if (activeQuick === 3 || activeQuick === 7) {
    return {
      labels: data.map(r => r.dt.slice(2, 4) + "/" + r.dt.slice(4, 6)),
      rows: data,
    };
  }

  // 30일 → 3일 간격
  if (activeQuick === 30) {
    const sampled: DailyRow[] = [];
    const labels: string[] = [];
    for (let i = 0; i < data.length; i += 3) {
      sampled.push(data[i]);
      labels.push(data[i].dt.slice(2, 4) + "/" + data[i].dt.slice(4, 6));
    }
    return { labels, rows: sampled };
  }

  // 90일 → 10일 간격
  if (activeQuick === 90) {
    const sampled: DailyRow[] = [];
    const labels: string[] = [];
    for (let i = 0; i < data.length; i += 10) {
      sampled.push(data[i]);
      labels.push(data[i].dt.slice(2, 4) + "/" + data[i].dt.slice(4, 6));
    }
    return { labels, rows: sampled };
  }

  // 전체(null) → 월별 평균
  const MONTH_LABEL: Record<string, string> = {
    "2601":"1월","2602":"2월","2603":"3월","2604":"4월",
    "2605":"5월","2606":"6월","2607":"7월","2608":"8월",
    "2609":"9월","2610":"10월","2611":"11월","2612":"12월",
  };

  const monthMap: Record<string, DailyRow[]> = {};
  for (const r of data) {
    const m = r.dt.slice(0, 4);
    if (!monthMap[m]) monthMap[m] = [];
    monthMap[m].push(r);
  }

  const labels: string[] = [];
  const rows: DailyRow[] = [];

  for (const [m, chunk] of Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!chunk.length) continue;
    labels.push(MONTH_LABEL[m] || m);
    // 월별 중간값 (15일쯤 데이터)
    const mid = chunk[Math.floor(chunk.length / 2)];
    rows.push(mid);
  }

  return { labels, rows };
}

function LineChart({ title, labels, datasets, yLeftCb, yRightCb }: {
  title: string;
  labels: string[];
  datasets: any[];
  yLeftCb: (v: number) => string;
  yRightCb?: (v: number) => string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !labels.length) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true, position: "bottom",
            labels: { font: { size: 11 }, color: "#64748b", boxWidth: 20, boxHeight: 2, padding: 14 },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 30, autoSkip: true },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
          yLeft: {
            position: "left",
            ticks: { color: "#64748b", font: { size: 10 }, callback: (v) => yLeftCb(v as number) },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
          ...(yRightCb ? {
            yRight: {
              position: "right",
              ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => yRightCb(v as number) },
              grid: { display: false },
            }
          } : {}),
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [labels, datasets]);

  return (
    <div className={styles.card}>
      <div className={styles.header}><div className={styles.title}>{title}</div></div>
      <div style={{ position: "relative", height: 200 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default function DailyCharts({ data, activeQuick }: Props) {
  const { labels, rows } = sampleData(data, activeQuick);

  const periodLabel = activeQuick === 3 ? "최근 3일 (1일 단위)" :
    activeQuick === 7 ? "최근 7일 (1일 단위)" :
    activeQuick === 30 ? "최근 30일 (3일 간격)" :
    activeQuick === 90 ? "최근 90일 (10일 간격)" : "전체 (월별)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
      <LineChart
        title={`매출 & 주문수 (${periodLabel})`}
        labels={labels}
        yLeftCb={(v) => (v / 1e6).toFixed(0) + "M"}
        yRightCb={(v) => v.toLocaleString()}
        datasets={[
          { label: "매출(KRW)", data: rows.map(r => r.krw), borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.07)", borderWidth: 2, pointRadius: 3, fill: true, tension: 0.35, yAxisID: "yLeft" },
          { label: "주문수", data: rows.map(r => r.ord), borderColor: "#f59e0b", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, fill: false, tension: 0.35, yAxisID: "yRight" },
        ]}
      />
      <LineChart
        title={`소재 업로드 & 샘플 출고 (${periodLabel})`}
        labels={labels}
        yLeftCb={(v) => v.toLocaleString()}
        yRightCb={(v) => v.toLocaleString()}
        datasets={[
          { label: "소재 업로드", data: rows.map(r => r.aff), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.07)", borderWidth: 2, pointRadius: 3, fill: true, tension: 0.35, yAxisID: "yLeft" },
          { label: "샘플 출고", data: rows.map(r => r.smp), borderColor: "#ef4444", borderDash: [5, 4], backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, fill: false, tension: 0.35, yAxisID: "yRight" },
        ]}
      />
      <LineChart
        title={`광고비 & ROAS (${periodLabel})`}
        labels={labels}
        yLeftCb={(v) => (v / 1e6).toFixed(0) + "M"}
        yRightCb={(v) => v.toFixed(0) + "%"}
        datasets={[
          { label: "광고비(KRW)", data: rows.map(r => r.adCost), borderColor: "#8b5cf6", backgroundColor: "rgba(139,92,246,0.07)", borderWidth: 2, pointRadius: 3, fill: true, tension: 0.35, yAxisID: "yLeft" },
          { label: "ROAS", data: rows.map(r => r.roas), borderColor: "#f59e0b", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 3, fill: false, tension: 0.35, yAxisID: "yRight" },
        ]}
      />
      <LineChart
        title={`객단가 USD (${periodLabel})`}
        labels={labels}
        yLeftCb={(v) => "$" + v.toFixed(1)}
        datasets={[
          { label: "객단가(USD)", data: rows.map(r => r.unitPriceUsd), borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.07)", borderWidth: 2, pointRadius: 3, fill: true, tension: 0.35, yAxisID: "yLeft" },
        ]}
      />
    </div>
  );
}
