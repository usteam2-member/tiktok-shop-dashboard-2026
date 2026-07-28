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

    // 매출로 정렬 (내림차순) 및 Top 10
    const top10 = [...data]
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)
      .reverse(); // 차트는 역순으로 표시 (맨 아래가 1위)

    const labels = top10.map((_, i) => `${10 - i}위`);
    const salesData = top10.map(p => p.sales);

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "매출(KRW)",
            data: salesData,
            backgroundColor: "#3b82f6",
            borderColor: "#3b82f6",
            borderWidth: 0,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y" as const, // 가로형 바
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.parsed.x;
                if (val === null || val === undefined) return "";
                if (val >= 1e6) return (val / 1e6).toFixed(1) + "M";
                if (val >= 1e3) return (val / 1e3).toFixed(0) + "K";
                return val.toFixed(0);
              },
              afterLabel: (context) => {
                const item = top10[context.dataIndex];
                return item.productName;
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
            ticks: { color: "#64748b", font: { size: 10 } },
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
      <div style={{ position: "relative", height: 300 }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ marginTop: "12px" }}>
        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "8px", color: "#666", fontWeight: 500 }}>순위</th>
              <th style={{ textAlign: "left", padding: "8px", color: "#666", fontWeight: 500 }}>제품명</th>
              <th style={{ textAlign: "right", padding: "8px", color: "#666", fontWeight: 500 }}>매출액</th>
            </tr>
          </thead>
          <tbody>
            {[...data]
              .sort((a, b) => b.sales - a.sales)
              .slice(0, 10)
              .map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "8px", color: "#3b82f6", fontWeight: 600 }}>{i + 1}위</td>
                  <td style={{ padding: "8px" }}>{item.productName}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 500 }}>
                    {(item.sales / 1e6).toFixed(1)}M
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
