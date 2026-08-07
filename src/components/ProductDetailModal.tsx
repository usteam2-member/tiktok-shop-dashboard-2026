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
  productDailyRows: string[][];
  onClose: () => void;
}

export default function ProductDetailModal({ product, productDailyRows, onClose }: ProductDetailModalProps) {
  // SKU의 열 인덱스 찾기
  const skuColumnIndex = useMemo(() => {
    if (productDailyRows.length < 3) return -1;
    
    const skuRow = productDailyRows[2];
    const idx = skuRow.findIndex(sku => sku?.trim() === product.sku);
    console.log(`📊 [Modal] SKU ${product.sku} found at column ${idx}`);
    return idx;
  }, [productDailyRows, product.sku]);

  // 월별 데이터 집계
  const monthlyData = useMemo(() => {
    if (skuColumnIndex === -1 || productDailyRows.length < 6) {
      console.log("📊 [Modal] Cannot extract monthly data - invalid column or not enough rows");
      console.log(`  - skuColumnIndex: ${skuColumnIndex}`);
      console.log(`  - productDailyRows.length: ${productDailyRows.length}`);
      return { labels: [], datasets: [] };
    }

    console.log("📊 [Modal] Starting monthly data extraction...");
    console.log(`  - SKU Column Index: ${skuColumnIndex}`);
    console.log(`  - Total rows: ${productDailyRows.length}`);
    console.log(`  - Sample row 5 (index 5):`, productDailyRows[5]);

    const monthMap: Record<string, number> = {};

    // Row 5부터 데이터 시작
    for (let rowIdx = 5; rowIdx < productDailyRows.length; rowIdx++) {
      const row = productDailyRows[rowIdx];
      const dt = row[0]?.trim();
      const revenue = row[skuColumnIndex];

      if (!dt) {
        console.log(`  - Row ${rowIdx}: No date`);
        continue;
      }

      if (!revenue) {
        console.log(`  - Row ${rowIdx} (${dt}): No revenue at column ${skuColumnIndex}`);
        continue;
      }

      // 날짜를 월로 변환
      let monthKey = "";
      if (dt.length === 8) {
        monthKey = dt.substring(2, 6); // "20260804" → "2608"
      } else if (dt.includes("-")) {
        const parts = dt.split("-");
        monthKey = parts[0].substring(2) + parts[1]; // "2026-08" → "2608"
      } else {
        console.log(`  - Row ${rowIdx}: Invalid date format: ${dt}`);
        continue;
      }

      const revenueNum = parseInt(revenue) || 0;
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = 0;
      }
      monthMap[monthKey] += revenueNum;
      
      if (rowIdx < 8) {
        console.log(`  - Row ${rowIdx} (${dt}): month=${monthKey}, revenue=${revenueNum}`);
      }
    }

    console.log("📊 [Modal] Monthly map:", monthMap);

    const sorted = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, revenue]) => ({
        month,
        revenue,
      }));

    console.log("📊 [Modal] Final monthly data:", sorted);

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
  }, [productDailyRows, skuColumnIndex]);

  // 주간 데이터 + 샘플 출고수
  const weeklyAndSampleData = useMemo(() => {
    if (skuColumnIndex === -1 || productDailyRows.length < 6) {
      return { labels: [], datasets: [] };
    }

    const weeks = [];
    const today = new Date();
    const smpColumnIndex = skuColumnIndex + 2; // 샘플 출고수는 3열씩의 마지막 열

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      let weekRevenue = 0;
      let weekSample = 0;

      // Row 5부터 데이터 시작
      for (let rowIdx = 5; rowIdx < productDailyRows.length; rowIdx++) {
        const row = productDailyRows[rowIdx];
        const dt = row[0]?.trim();
        const revenue = row[skuColumnIndex];
        const sample = row[smpColumnIndex];

        if (!dt) continue;

        let rowDate: Date;
        if (dt.length === 8) {
          const year = parseInt(dt.substring(0, 4));
          const month = parseInt(dt.substring(4, 6));
          const day = parseInt(dt.substring(6, 8));
          rowDate = new Date(year, month - 1, day);
        } else if (dt.includes("-")) {
          const parts = dt.split("-");
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          rowDate = new Date(year, month - 1, day);
        } else {
          continue;
        }

        if (rowDate >= weekStart && rowDate <= weekEnd) {
          if (revenue) weekRevenue += parseInt(revenue) || 0;
          if (sample) weekSample += parseInt(sample) || 0;
        }
      }

      weeks.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}~${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
        revenue: weekRevenue,
        sample: weekSample,
      });
    }

    console.log("📊 [Modal] Weekly data:", weeks);

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
  }, [productDailyRows, skuColumnIndex]);

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
        callbacks: {
          label: function(context: any) {
            return "매출액: ₩" + context.parsed.y.toLocaleString();
          }
        }
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
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            if (context.dataset.yAxisID === 'y') {
              return label + ': ₩' + context.parsed.y.toLocaleString();
            } else {
              return label + ': ' + context.parsed.y.toLocaleString();
            }
          }
        }
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
              {monthlyData.labels.length > 0 ? (
                <LineChartComponent data={monthlyData} options={monthlyChartOptions as any} />
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                  데이터를 불러올 수 없습니다
                </div>
              )}
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
              {weeklyAndSampleData.labels.length > 0 ? (
                <BarChartComponent data={weeklyAndSampleData} options={weeklyChartOptions as any} />
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
                  데이터를 불러올 수 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
