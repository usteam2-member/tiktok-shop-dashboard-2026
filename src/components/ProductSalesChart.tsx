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

    // Top 10 정렬 및 역순 (아래가 1위)
    const top10 = [...data]
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)
      .reverse();

    const labels = top10.map((_, i) => `${10 - i}위`);
    const salesData = top10.map(p => p.sales);
    const ordersData = top10.map(p => p.orders || 0);
    const productNames = top10.map(p => p.productName);

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
            yAxisID: "yLeft",
            order: 2,
          },
          {
            label: "주문수",
            data: ordersData,
            borderColor: "#f59e0b",
            backgroundColor: "transparent",
            borderWidth: 2.5,
            borderDash: [0],
            pointRadius: 4,
            pointBackgroundColor: "#f59e0b",
            type: "line",
            yAxisID: "yRight",
            order: 1,
            tension: 0.3,
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
                
                if (context.dataset.yAxisID === "yLeft") {
                  if (val >= 1e6) return "매출액: " + (val / 1e6).toFixed(1) + "M";
                  if (val >= 1e3) return "매출액: " + (val / 1e3).toFixed(0) + "K";
                  return "매출액: " + val.toFixed(0);
                } else {
                  return "주문수: " + val.toLocaleString();
                }
              },
              afterLabel: (context) => {
                const productName = productNames[context.dataIndex];
                return productName;
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
          yLeft: {
            position: "left",
            beginAtZero: true,
            title: {
              display: true,
              text: "매출액(KRW)",
              color: "#3b82f6",
              font: { size: 11, weight: "bold" },
            },
            ticks: {
              color: "#3b82f6",
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
          yRight: {
            position: "right",
            beginAtZero: true,
            title: {
              display: true,
              text: "주문수",
              color: "#f59e0b",
              font: { size: 11, weight: "bold" },
            },
            ticks: {
              color: "#f59e0b",
              font: { size: 10 },
              callback: (v) => v.toLocaleString(),
            },
            grid: { display: false },
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
          매출액 & 주문수 Top 10 제품 ({periodLabel})
        </div>
      </div>
      <div style={{ position: "relative", height: 350 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
