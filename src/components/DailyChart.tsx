"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { DailyRow } from "@/lib/data";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface Props { data: DailyRow[]; }

function makeChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  datasets: any[],
  yLeftCb: (v: number) => string,
  yRightCb?: (v: number) => string,
): Chart {
  return new Chart(canvas, {
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
}

function LineChart({ title, data, buildDatasets, yLeftCb, yRightCb }: {
  title: string;
  data: DailyRow[];
  buildDatasets: (data: DailyRow[]) => any[];
  yLeftCb: (v: number) => string;
  yRightCb?: (v: number) => string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    chartRef.current?.destroy();
    const labels = data.map(r => r.dt.slice(2, 4) + "/" + r.dt.slice(4, 6));
    chartRef.current = makeChart(canvasRef.current, labels, buildDatasets(data), yLeftCb, yRightCb);
    return () => { chartRef.current?.destroy(); };
  }, [data]);

  return (
    <div className={styles.card}>
      <div className={styles.header}><div className={styles.title}>{title}</div></div>
      <div style={{ position: "relative", height: 200 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default function DailyCharts({ data }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
      {/* 1. 매출 + 주문수 */}
      <LineChart
        title="일별 매출 & 주문수 (최근 14일)"
        data={data}
        yLeftCb={(v) => (v / 1e6).toFixed(0) + "M"}
        yRightCb={(v) => v.toLocaleString()}
        buildDatasets={(d) => [
          { label: "매출(KRW)", data: d.map(r => r.krw), borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.07)", borderWidth: 2, pointRadius: 2, fill: true, tension: 0.35, yAxisID: "yLeft" },
          { label: "주문수", data: d.map(r => r.ord), borderColor: "#f59e0b", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 2, fill: false, tension: 0.35, yAxisID: "yRight" },
        ]}
      />

      {/* 2. 소재 업로드 + 샘플 출고 */}
      <LineChart
        title="일별 소재 업로드 & 샘플 출고 (최근 14일)"
        data={data}
        yLeftCb={(v) => v.toLocaleString()}
        yRightCb={(v) => v.toLocaleString()}
        buildDatasets={(d) => [
          { label: "소재 업로드", data: d.map(r => r.aff), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.07)", borderWidth: 2, pointRadius: 2, fill: true, tension: 0.35, yAxisID: "yLeft" },
          { label: "샘플 출고", data: d.map(r => r.smp), borderColor: "#ef4444", borderDash: [5, 4], backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 2, fill: false, tension: 0.35, yAxisID: "yRight" },
        ]}
      />

      {/* 3. 광고비 + ROAS */}
      <LineChart
        title="일별 광고비 & ROAS (최근 14일)"
        data={data}
        yLeftCb={(v) => (v / 1e6).toFixed(0) + "M"}
        yRightCb={(v) => v.toFixed(0) + "%"}
        buildDatasets={(d) => [
          { label: "광고비(KRW)", data: d.map(r => r.adCost), borderColor: "#8b5cf6", backgroundColor: "rgba(139,92,246,0.07)", borderWidth: 2, pointRadius: 2, fill: true, tension: 0.35, yAxisID: "yLeft" },
          { label: "ROAS", data: d.map(r => r.roas), borderColor: "#f59e0b", backgroundColor: "transparent", borderWidth: 1.5, pointRadius: 2, fill: false, tension: 0.35, yAxisID: "yRight" },
        ]}
      />

      {/* 4. 객단가(USD) */}
      <LineChart
        title="일별 객단가 USD (최근 14일)"
        data={data}
        yLeftCb={(v) => "$" + v.toFixed(1)}
        buildDatasets={(d) => [
          { label: "객단가(USD)", data: d.map(r => r.unitPriceUsd), borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.07)", borderWidth: 2, pointRadius: 2, fill: true, tension: 0.35, yAxisID: "yLeft" },
        ]}
      />
    </div>
  );
}
