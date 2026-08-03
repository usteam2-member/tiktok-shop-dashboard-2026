"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

interface ProductSalesData {
  productName: string;
  sales: number;
  orders?: number;
}

interface Props {
  data: ProductSalesData[];
  periodLabel: string;
}

export default function ProductSalesChart({ data, periodLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    chartRef.current?.destroy();

    // Top 10 정렬 및 순서 (큰 것이 위로)
    const top10 = [...data]
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const labels = top10.map(p => p.productName); // 제품명으로 Y축 라벨 설정
    const salesData = top10.map(p => p.sales);
    const ordersData = top10.map(p => p.orders || 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "매출액(KRW)",
            data: salesData,
            backgroundColor: "#3b82f6",
            borderColor: "#3b82f6",
            borderWidth: 0,
            borderRadius: 4,
            yAxisID: "y",
            order: 2,
          },
        ],
      },
      options: {
        indexAxis: "y" as const,
        responsive: true,
        maintainAspectRatio: false,
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
              usePointStyle: false,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.parsed.x;
                if (val === null || val === undefined) return "";
                
                if (val >= 1e6) return "매출액: " + (val / 1e6).toFixed(1) + "M";
                if (val >= 1e3) return "매출액: " + (val / 1e3).toFixed(0) + "K";
                return "매출액: " + val.toFixed(0);
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: "#64748b",
              font: { size: 10 },
              callback: (v) => {
                const val = v as number;
                if (val >= 1e6) return (val / 1e6).toFixed(0) + "M";
                if (val >= 1e3) return (val / 1e3).toFixed(0) + "K";
                return val.toFixed(0);
              },
            },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
          y: {
            position: "left",
            beginAtZero: true,
            ticks: {
              color: "#64748b",
              font: { size: 11, weight: "500" },
            },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [data]);

  if (!data.length) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "40px 20px",
          textAlign: "center",
          color: "#999",
          gridColumn: "1 / -1",
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        데이터가 없어요
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        gridColumn: "1 / -1",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
          매출액 Top 10 제품 ({periodLabel})
        </div>
      </div>
      <div style={{ position: "relative", height: 350 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
