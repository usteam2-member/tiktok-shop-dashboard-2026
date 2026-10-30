"use client";
import { useMemo } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Line as LineChartComponent } from "react-chartjs-2";
import ProductMonthlyActivity from "./ProductMonthlyActivity";
import type { PidMonthly } from "@/lib/useSheetData";


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface DailyRow {
  dt: string;
  krw?: number;
  smp?: number;
  ord?: number;
  [key: string]: any;
}

interface SojaeRow {
  [key: string]: any;
}

interface ProductDetailModalProps {
  product: {
    name: string;
    sku: string;
    pid: string;
  };
  dailyData: DailyRow[];
  sojaeData?: SojaeRow[];
  pidMonthly?: PidMonthly;
  onClose: () => void;
}

export default function ProductDetailModal({ product, dailyData, sojaeData = [], pidMonthly, onClose }: ProductDetailModalProps) {
  // sojae 데이터 구조 확인 (처음 한 번만)
  useMemo(() => {
    if (sojaeData && sojaeData.length > 0) {
      console.log("📊 [Modal] === Sojae Data Structure ===");
      console.log("📊 [Modal] Sojae data length:", sojaeData.length);
      console.log("📊 [Modal] Sample sojae row:", sojaeData[0]);
      
      // 모든 필드명과 값 출력
      const firstRow = sojaeData[0];
      console.log("📊 [Modal] Sojae row fields:");
      Object.entries(firstRow).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value}`);
      });
      
      // 처음 5개 행 출력 (SKU 찾기용)
      console.log("📊 [Modal] First 5 rows:");
      for (let i = 0; i < Math.min(5, sojaeData.length); i++) {
        console.log(`  Row ${i}:`, sojaeData[i]);
      }
    }
  }, [sojaeData]);
  // 날짜 검증
  const isValidDate = (dt: any): boolean => {
    if (!dt) return false;
    
    const dtStr = String(dt).trim();
    
    // "20260804" 형식
    if (dtStr.length === 8 && /^\d{8}$/.test(dtStr)) {
      const year = parseInt(dtStr.substring(0, 4));
      const month = parseInt(dtStr.substring(4, 6));
      const day = parseInt(dtStr.substring(6, 8));
      return year >= 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
    }
    
    // "2026-08-04" 형식
    if (dtStr.includes("-")) {
      const parts = dtStr.split("-");
      if (parts.length === 3 && parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        return year >= 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
      }
    }
    
    return false;
  };

  // 월별 매출액 — 해당 PID(리스팅)의 매출 (GMV | by Product 시트 날짜 행 합계)
  const monthlyData = useMemo(() => {
    const months = pidMonthly?.months[product.pid] || {};
    const last = pidMonthly?.lastDate[product.pid] || "";
    const sorted = Object.entries(months)
      .filter(([, v]) => v.rev > 0)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12);
    const multiYear = new Set(sorted.map(([k]) => k.slice(0, 2))).size > 1;
    const lastKey = last ? last.slice(2, 4) + last.slice(5, 7) : "";
    const lastDay = last ? parseInt(last.slice(8, 10)) : 0;
    const dim = last ? new Date(Date.UTC(+last.slice(0, 4), +last.slice(5, 7), 0)).getUTCDate() : 0;
    const label = (k: string) =>
      `${multiYear ? `${k.slice(0, 2)}년 ` : ""}${parseInt(k.slice(2))}월${k === lastKey && lastDay < dim ? "(진행 중)" : ""}`;

    return {
      labels: sorted.map(([k]) => label(k)),
      datasets: [
        {
          label: "매출액 (₩)",
          data: sorted.map(([, v]) => v.rev),
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
  }, [pidMonthly, product.pid]);

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
              📊 월별 매출액 (이 PID · 최근 12개월)
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

          {/* 월별 샘플출고수 + 신규 소재 + 매출 소재 */}
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: "#1f2937" }}>
              📦 월별 샘플출고수 & 🎬 신규·매출 소재
            </h3>
            <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px" }}>
              <ProductMonthlyActivity pid={product.pid} sku={product.sku} pidMonthly={pidMonthly} sojaeData={sojaeData as any} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
