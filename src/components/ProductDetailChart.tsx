"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { ProductDailySeries } from "@/lib/data";

Chart.register(...registerables);

interface Props {
  series: ProductDailySeries[];
}

export default function ProductDetailChart({ series }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const tabRef = useRef("먼슬리");

  const updateChart = () => {
    if (!canvasRef.current || !series.length) return;

    const all = [...series].sort((a, b) => a.dt.localeCompare(b.dt));
    if (!all.length) return;

    let labels: string[] = [];
    let ordData: number[] = [];
    let smpData: number[] = [];

    if (tabRef.current === "대일권") {
      labels = all.slice(-14).map(r => r.dt.slice(2, 4) + "/" + r.dt.slice(4, 6));
      ordData = all.slice(-14).map(r => r.ord);
      smpData = all.slice(-14).map(r => r.smp);
    } else if (tabRef.current === "위클리") {
      labels = all.slice(-7).map(r => r.dt.slice(2, 4) + "/" + r.dt.slice(4, 6));
      ordData = all.slice(-7).map(r => r.ord);
      smpData = all.slice(-7).map(r => r.smp);
    } else {
      labels = all.map(r => r.dt.slice(2, 4) + "/" + r.dt.slice(4, 6));
      ordData = all.map(r => r.ord);
      smpData = all.map(r => r.smp);
    }

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
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>주문수 & 샘플 출고 추이</div>
        <div style={{ display: "flex", gap: "8px" }}>
          {["대일권", "위클리", "먼슬리", "전체"].map(tab => (
            <button
              key={tab}
              onClick={() => {
                tabRef.current = tab;
                updateChart();
              }}
              style={{
                padding: "4px 10px",
                fontSize: "11px",
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
