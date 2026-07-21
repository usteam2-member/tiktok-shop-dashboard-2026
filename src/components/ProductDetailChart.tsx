"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { ProductDailySeries } from "@/lib/data";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface ProcessedData {
  labels: string[];
  ordData: number[];
  smpData: number[];
}

interface Props {
  series: ProductDailySeries[];
}

function processData(series: ProductDailySeries[], tab: string): ProcessedData {
  const all = [...series].sort((a, b) => a.dt.localeCompare(b.dt));
  if (!all.length) return { labels: [], ordData: [], smpData: [] };

  if (tab === "대일권") {
    const last = all[all.length - 1];
    const lastDate = new Date(
      2000 + parseInt(last.dt.slice(0, 2)),
      parseInt(last.dt.slice(2, 4)) - 1,
      parseInt(last.dt.slice(4, 6))
    );

    const diffDays = (dt: string) => {
      const y = 2000 + parseInt(dt.slice(0, 2)),
        m = parseInt(dt.slice(2, 4)) - 1,
        d = parseInt(dt.slice(4, 6));
      return Math.round((lastDate.getTime() - new Date(y, m, d).getTime()) / 86400000);
    };

    if (tab === "대일권") {
      const filtered = all.filter(r => diffDays(r.dt) < 14);
      return {
        labels: filtered.map(r => r.dt.slice(2, 4) + "/" + r.dt.slice(4, 6)),
        ordData: filtered.map(r => r.ord),
        smpData: filtered.map(r => r.smp),
      };
    }

    if (tab === "위클리") {
      const filtered = all.filter(r => diffDays(r.dt) < 7);
      return {
        labels: filtered.map(r => r.dt.slice(2, 4) + "/" + r.dt.slice(4, 6)),
        ordData: filtered.map(r => r.ord),
        smpData: filtered.map(r => r.smp),
      };
    }

    if (tab === "먼슬리") {
      const filtered = all.filter(r => diffDays(r.dt) < 30);
      return {
        labels: filtered.map(r => r.dt.slice(2, 4) + "/" + r.dt.slice(4, 6)),
        ordData: filtered.map(r => r.ord),
        smpData: filtered.map(r => r.smp),
      };
    }
  }

  return {
    labels: all.map(r => r.dt.slice(2, 4) + "/" + r.dt.slice(4, 6)),
    ordData: all.map(r => r.ord),
    smpData: all.map(r => r.smp),
  };
}

export default function ProductDetailChart({ series }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const tabRef = useRef("먼슬리");

  const updateChart = () => {
    if (!canvasRef.current || !series.length) return;

    const { labels, ordData, smpData } = processData(series, tabRef.current);
    if (!labels.length) return;

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "주문수",
            data: ordData,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.07)",
            borderWidth: 2,
            pointRadius: 3,
            fill: true,
            tension: 0.35,
            yAxisID: "yLeft",
          },
          {
            label: "샘플 출고",
            data: smpData,
            borderColor: "#ef4444",
            borderDash: [5, 4],
            backgroundColor: "transparent",
            borderWidth: 1.5,
            pointRadius: 3,
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
              padding: 14,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#94a3b8",
              font: { size: 10 },
              maxRotation: 30,
              autoSkip: false,
            },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
          yLeft: {
            position: "left",
            beginAtZero: true,
            ticks: {
              color: "#3b82f6",
              font: { size: 10 },
              callback: (v) => (v as number).toLocaleString(),
            },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
          yRight: {
            position: "right",
            beginAtZero: true,
            ticks: {
              color: "#94a3b8",
              font: { size: 10 },
              callback: (v) => (v as number).toLocaleString(),
            },
            grid: { display: false },
          },
        },
      },
    });
  };

  useEffect(() => {
    updateChart();
  }, [series]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>주문수 & 샘플 출고 추이</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["대일권", "위클리", "먼슬리", "전체"].map(tab => (
            <button
              key={tab}
              onClick={() => {
                tabRef.current = tab;
                updateChart();
              }}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: tabRef.current === tab ? 600 : 400,
                background: tabRef.current === tab ? "#3b82f6" : "#e5e7eb",
                color: tabRef.current === tab ? "white" : "#666",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div style={{ position: "relative", height: 240 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
