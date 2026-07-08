"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { DailyRow } from "@/lib/data";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface Props { data: DailyRow[]; }

export default function DailyChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    chartRef.current?.destroy();

    const labels = data.map((r) => r.dt.slice(2,4) + "/" + r.dt.slice(4,6));

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "매출 (KRW)",
            data: data.map(r => r.krw),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.07)",
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.35,
            yAxisID: "yKRW",
          },
          {
            label: "주문수",
            data: data.map(r => r.ord),
            borderColor: "#f59e0b",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false,
            tension: 0.35,
            yAxisID: "yRight",
          },
          {
            label: "소재 업로드",
            data: data.map(r => r.aff),
            borderColor: "#10b981",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false,
            tension: 0.35,
            yAxisID: "yRight",
          },
          {
            label: "샘플 출고",
            data: data.map(r => r.smp),
            borderColor: "#ef4444",
            borderDash: [5, 4],
            backgroundColor: "transparent",
            borderWidth: 1.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false,
            tension: 0.35,
            yAxisID: "yRight",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              font: { size: 11 },
              color: "#64748b",
              boxWidth: 20,
              boxHeight: 2,
              padding: 16,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw as number;
                if (ctx.dataset.label === "매출 (KRW)")
                  return ` 매출: ₩${(v/1e6).toFixed(1)}M`;
                return ` ${ctx.dataset.label}: ${v.toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8", font: { size: 11 }, maxRotation: 30 },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
          yKRW: {
            position: "left",
            ticks: {
              color: "#3b82f6",
              font: { size: 10 },
              callback: (v) => (v as number / 1e6).toFixed(0) + "M",
            },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
          yRight: {
            position: "right",
            ticks: {
              color: "#64748b",
              font: { size: 10 },
              callback: (v) => (v as number).toLocaleString(),
            },
            grid: { display: false },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [data]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>일별 매출 · 주문수 · 소재 업로드 · 샘플 출고 (최근 14일)</div>
        <span style={{fontSize:11,color:"#94a3b8"}}>항상 최근 2주 기준</span>
      </div>
      <div style={{ position: "relative", height: 300 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
