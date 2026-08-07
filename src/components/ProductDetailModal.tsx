"use client";
import { useState, useMemo } from "react";
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
  // dailyData 구조 로그 (처음 한 번만)
  useMemo(() => {
    if (dailyData.length > 0) {
      console.log("📊 [Modal] Sample dailyData row:", dailyData[0]);
      console.log("📊 [Modal] dailyData keys:", Object.keys(dailyData[0]));
      
      // 첫 번째 행의 모든 키와 값 출력
      const firstRow = dailyData[0];
      Object.entries(firstRow).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value} (type: ${typeof value})`);
      });
      
      console.log("📊 [Modal] Product SKU:", product.sku);
      
      // SKU와 관련된 열을 찾기 위해 products 정보도 출력
      console.log("📊 [Modal] Looking for SKU:", product.sku);
    }
  }, [dailyData, product.sku]);
  // 월별 데이터 집계 (실제 데이터 기반)
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, number> = {};

    dailyData.forEach((row) => {
      const dt = row.dt as string;
      const krw = row.krw as number; // 실제 매출액 데이터
      
      if (!dt || !krw) return;

      // dt 형식: "20260804" → "2608" (연도 마지막 2자리 + 월)
      let monthKey = "";
      if (dt.length === 8 && !dt.includes("-")) {
        // "20260804" 형식
        monthKey = dt.substring(2, 6); // "2608"
      } else if (dt.includes("-")) {
        // "2026-08-04" 형식
        const parts = dt.split("-");
        if (parts.length === 3 && parts[0].length === 4 && parts[1].length === 2) {
          monthKey = parts[0].substring(2) + parts[1]; // "2608"
        } else {
          return;
        }
      } else {
        return;
      }

      // 유효한 월 형식만 (YYOMM: 4자리 숫자)
      if (!/^\d{4}$/.test(monthKey)) {
        return;
      }

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = 0;
      }
      // 실제 krw 값을 합산
      monthMap[monthKey] += krw;
    });

    // 최근 12개월 데이터
    const sorted = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, revenue]) => ({
        month,
        revenue,
      }));

    console.log("📊 [Modal] Monthly data (실제):", sorted);

    return {
      labels: sorted.map((d) => d.month),
      datasets: [
        {
          label: "매출액 (₩)",
          data: sorted.map((d) => d.revenue),
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

  // 주간 데이터 + 샘플 출고수 (막대 그래프)
  const weeklyAndSampleData = useMemo(() => {
    const weeks = [];
    const today = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      // 해당 주의 모든 데이터 합산
      let weekRevenue = 0;
      let weekSample = 0;

      dailyData.forEach((row) => {
        const dt = row.dt as string;
        const krw = row.krw as number;
        const smp = row.smp as number;
        
        if (!dt) return;

        let rowDate: Date;

        if (dt.length === 8 && !dt.includes("-")) {
          // "20260804" 형식
          const year = parseInt(dt.substring(0, 4));
          const month = parseInt(dt.substring(4, 6));
          const day = parseInt(dt.substring(6, 8));
          rowDate = new Date(year, month - 1, day);
        } else if (dt.includes("-")) {
          // "2026-08-04" 형식
          const parts = dt.split("-");
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          rowDate = new Date(year, month - 1, day);
        } else {
          return;
        }

        if (rowDate >= weekStart && rowDate <= weekEnd) {
          if (krw) weekRevenue += krw;
          if (smp) weekSample += smp;
        }
      });

      weeks.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}~${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
        revenue: weekRevenue,
        sample: weekSample,
      });
    }

    console.log("📊 [Modal] Weekly data (실제):", weeks);

    return {
      labels: weeks.map((w) => w.week),
      datasets: [
        {
          label: "매출액 (₩)",
          data: weeks.map((w) => w.revenue),
          backgroundColor: "#3b82f6",
          borderRadius: 4,
          yAxisID: "y",
        },
        {
          label: "샘플 출고수",
          data: weeks.map((w) => w.sample),
          backgroundColor: "#10b981",
          borderRadius: 4,
          yAxisID: "y1",
        },
      ],
    };
  }, [dailyData]);

  const monthlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
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

  const weeklyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
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
        title: {
          display: true,
          text: "매출액 (₩)",
        },
      },
      y1: {
        beginAtZero: true,
        position: "right" as const,
        ticks: { font: { size: 12 } },
        grid: { drawOnChartArea: false },
        title: {
          display: true,
          text: "출고수",
        },
      },
      x: {
        ticks: { font: { size: 12 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div
      style={{
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
      }}
    >
      {/* 모달 박스 */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          maxWidth: "1200px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "white",
          }}
        >
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
            <div
              style={{
                background: "#f9fafb",
                padding: "16px",
                borderRadius: "8px",
                height: "300px",
              }}
            >
              <LineChartComponent data={monthlyData} options={monthlyChartOptions as any} />
            </div>
          </div>

          {/* 주간 매출액 & 샘플 출고수 */}
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: "#1f2937" }}>
              📈 주간 매출액 & 📦 샘플 출고수 (최근 4주)
            </h3>
            <div
              style={{
                background: "#f9fafb",
                padding: "16px",
                borderRadius: "8px",
                height: "350px",
              }}
            >
              <BarChartComponent data={weeklyAndSampleData} options={weeklyChartOptions as any} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
