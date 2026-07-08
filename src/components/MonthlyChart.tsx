"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { SojaeRow } from "@/lib/data";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface Props { data: SojaeRow[]; }

export default function MonthlyChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: data.map(s => s.month),
        datasets: [
          { label: "신규 소재", data: data.map(s => s.new), backgroundColor: "#1e293b", borderRadius: 4, borderSkipped: "bottom" },
          { label: "매출 소재", data: data.map(s => s.rev), backgroundColor: "#3b82f6", borderRadius: 4, borderSkipped: "bottom" },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: "bottom", labels: { font: { size: 11 }, color: "#64748b", boxWidth: 10, boxHeight: 10, padding: 14 } } },
        scales: {
          x: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => (v as number).toLocaleString() }, grid: { color: "#e2e6ea", lineWidth: 0.5 } },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [data]);

  return (
    <div className={styles.card}>
      <div className={styles.header}><div className={styles.title}>월별 소재 현황 (신규 · 매출 소재)</div></div>
      <div style={{ position: "relative", height: 240 }}><canvas ref={canvasRef} /></div>
    </div>
  );
} 
