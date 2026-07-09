"use client";
import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface Props {
  monthlyTop10: Record<string, { name: string; orders: number }[]>;
  availableMonths: string[];
}

export default function ThisMonthChart({ monthlyTop10, availableMonths }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // 기본값: 마지막 월
  useEffect(() => {
    if (availableMonths.length && !selectedMonth) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths]);

  useEffect(() => {
    if (!canvasRef.current || !selectedMonth || !monthlyTop10[selectedMonth]) return;
    chartRef.current?.destroy();

    const data = [...(monthlyTop10[selectedMonth] || [])].reverse();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          label: "주문수",
          data: data.map(d => d.orders),
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
  }, [selectedMonth, monthlyTop10]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>제품별 주문수 TOP 10</div>
        <div style={{ display: "flex", gap: 6 }}>
          {availableMonths.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 6,
                border: "1px solid",
                borderColor: selectedMonth === m ? "#3b82f6" : "#e2e6ea",
                background: selectedMonth === m ? "#3b82f6" : "#fff",
                color: selectedMonth === m ? "#fff" : "#64748b",
                cursor: "pointer",
                fontWeight: selectedMonth === m ? 600 : 400,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div style={{ position: "relative", height: 320 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
