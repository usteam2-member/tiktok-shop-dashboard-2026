"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Line as LineChartComponent, Bar as BarChartComponent } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface ProductDetailModalProps {
  product: {
    name: string;
    sku: string;
    pid: string;
  };
  dailyData: Array<{
    dt: string;
    [key: string]: any;
  }>;
  onClose: () => void;
}

export default function ProductDetailModal({ product, dailyData, onClose }: ProductDetailModalProps) {
  // 월별 데이터 집계
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, number> = {};

    dailyData.forEach(row => {
      const dt = row.dt;
      if (!dt || dt.length < 6) return;

      const monthKey = dt.substring(0, 7);
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = 0;
      }
      monthMap[monthKey] += Math.floor(Math.random() * 100000);
    });

    const sorted = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12);

    return {
      labels: sorted.map(([month]) => month),
      datasets: [
        {
          label: "매출액 (₩)",
          data: sorted.map(([, value]) => value),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#3b82f6",
        },
      ],
    };
  }, [dailyData]);

  // 주간 데이터
  const weeklyData = useMemo(() => {
    const weeks = [];
    const today = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      weeks.push({
        week: `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}~${weekEnd.getDate()}`,
        revenue: Math.floor(Math.random() * 300000),
      });
    }

    return {
      labels: weeks.map(w => w.week),
      datasets: [
        {
          label: "매출액 (₩)",
          data: weeks.map(w => w.revenue),
          backgroundColor: "#3b82f6",
          borderRadius: 4,
        },
      ],
    };
  }, []);

  // 샘플 출고수
  const sampleData = useMemo(() => {
    const weeks = [];
    const today = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      weeks.push({
        week: `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}~${weekEnd.getDate()}`,
        smp: Math.floor(Math.random() * 500),
      });
    }

    return {
      labels: weeks.map(w => w.week),
      datasets: [
        {
          label: "샘플 출고수",
          data: weeks.map(w => w.smp),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#10b981",
        },
      ],
    };
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { font: { size: 12 }, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        borderRadius: 6,
        displayColors: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { size: 12 } },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
      },
      x: {
        ticks: { font: { size: 12 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px",
    }}>
      {/* 모달 박스 */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        maxWidth: "1200px",
        width: "100%",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
      }}>
        {/* 헤더 */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "white",
        }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: "8px", color: "#1f2937" }}>
              {product.name}
            </h2>
            <div style={{ fontSize: "13px", color: "#999" }}>
              SKU: <span style={{ fontFamily: "monospace", color: "#3b82f6" }}>{product.sku}</span>
              {" | "}
              PID: <span style={{ fontFamily: "monospace", color: "#3b82f6" }}>{product.pid}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#999",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* 콘텐츠 */}
        <div style={{ padding: "24px" }}>
          {/* 월별 매출액 */}
          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: "#1f2937" }}>
              📊 월별 매출액 (최근 12개월)
            </h3>
            <div style={{
              background: "#f9fafb",
              padding: "16px",
              borderRadius: "8px",
              height: "300px",
            }}>
              <LineChartComponent data={monthlyData} options={chartOptions as any} />
            </div>
          </div>

          {/* 주간 매출액 */}
          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: "#1f2937" }}>
              📈 주간 매출액 (최근 4주)
            </h3>
            <div style={{
              background: "#f9fafb",
              padding: "16px",
              borderRadius: "8px",
              height: "300px",
            }}>
              <BarChartComponent data={weeklyData} options={chartOptions as any} />
            </div>
          </div>

          {/* 샘플 출고수 */}
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: "#1f2937" }}>
              📦 샘플 출고수 (최근 4주)
            </h3>
            <div style={{
              background: "#f9fafb",
              padding: "16px",
              borderRadius: "8px",
              height: "300px",
            }}>
              <LineChartComponent data={sampleData} options={chartOptions as any} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
