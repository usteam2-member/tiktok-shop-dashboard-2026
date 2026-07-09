"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { ProductTop10Item } from "@/lib/useSheetData";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface Props {
  data: ProductTop10Item[];
  periodLabel: string;
}

export default function ThisMonthChart({ data, periodLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    chartRef.current?.destroy();

    const sorted = [...data].reverse();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: sorted.map(d => d.name),
        datasets: [{
          label: "주문수",
          data: sorted.map(d => d.orders),
          backgroundColor: "#3b82f6",
          borderRadius: 4,
          borderSkipped: "left",
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` 주문수: ${(ctx.raw as number).toLocaleString()}건`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8", font: { size: 10 }, callback: (v) => (v as number).toLocaleString() },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
          y: {
            ticks: { color: "#1a202c", font: { size: 11 } },
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
        <div className={styles.title}>제품별 주문수 TOP 10 ({periodLabel})</div>
      </div>
      <div style={{ position: "relative", height: 320 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
