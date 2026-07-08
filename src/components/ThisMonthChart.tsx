"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface Props {
  data: { name: string; orders: number }[];
  month: string;
}

export default function ThisMonthChart({ data, month }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    chartRef.current?.destroy();

    const sorted = [...data].reverse(); // 가장 높은 게 위로

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: sorted.map(d => d.name),
        datasets: [
          {
            label: "주문수",
            data: sorted.map(d => d.orders),
            backgroundColor: "#3b82f6",
            borderRadius: 4,
            borderSkipped: "left",
          },
        ],
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
        <div className={styles.title}>{month} 매출 상위 10개 제품 (주문수 기준)</div>
      </div>
      <div style={{ position: "relative", height: 320 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
