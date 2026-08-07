"use client";
import { useMemo } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Line as LineChartComponent, Bar as BarChartComponent } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface DailyRow {
  dt: string;
  krw?: number;
  smp?: number;
  ord?: number;
  [key: string]: any;
}

interface ProductDetailModalProps {
  product: {
    name: string;
    sku: string;
    pid: string;
  };
  dailyData: DailyRow[];
  onClose: () => void;
}

export default function ProductDetailModal({ product, dailyData, onClose }: ProductDetailModalProps) {
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

  // 월별 데이터 집계
  const monthlyData = useMemo(() => {
    console.log(`📊 [Modal] Aggregating data for: ${product.sku}`);
    console.log(`📊 [Modal] dailyData length: ${dailyData.length}`);
    
    const monthMap: Record<string, number> = {};
    let validCount = 0;

    dailyData.forEach((row, idx) => {
      const dt = row.dt;
      const krw = row.krw;

      // 날짜 검증
      if (!isValidDate(dt)) {
        if (idx < 5) console.log(`  Row ${idx}: Invalid date "${dt}"`);
        return;
      }

      const krwNum = parseFloat(String(krw)) || 0;
      if (krwNum <= 0) return;

      // 날짜를 월로 변환
      const dtStr = String(dt);
      let monthKey = "";
      
      if (dtStr.length === 8) {
        monthKey = dtStr.substring(2, 6); // "20260804" → "2608"
      } else if (dtStr.includes("-")) {
        const parts = dtStr.split("-");
        monthKey = parts[0].substring(2) + parts[1]; // "2026-08" → "2608"
      }

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = 0;
      }
      monthMap[monthKey] += krwNum;
      validCount++;

      if (validCount <= 3) {
        console.log(`  Valid row ${idx}: ${dt} → ${monthKey}, krw=${krwNum}`);
      }
    });

    console.log(`📊 [Modal] Valid rows: ${validCount}`);
    console.log("📊 [Modal] Month map:", monthMap);

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
  }, [dailyData, product.sku, isValidDate]);

  // 주간 데이터 + 샘플 출고수
  const weeklyAndSampleData = useMemo(() => {
    const weeks = [];
    const today = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      let weekRevenue = 0;
      let weekSample = 0;

      dailyData.forEach((row) => {
        const dt = row.dt;
        const krw = row.krw;
        const smp = row.smp;

        if (!isValidDate(dt)) return;

        const dtStr = String(dt);
        let rowDate: Date;

        if (dtStr.length === 8) {
          const year = parseInt(dtStr.substring(0, 4));
          const month = parseInt(dtStr.substring(4, 6));
          const day = parseInt(dtStr.substring(6, 8));
          rowDate = new Date(year, month - 1, day);
        } else if (dtStr.includes("-")) {
          const parts = dtStr.split("-");
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          rowDate = new Date(year, month - 1, day);
        } else {
          return;
        }

        if (rowDate >= weekStart && rowDate <= weekEnd) {
          if (krw) weekRevenue += parseFloat(String(krw)) || 0;
          if (smp) weekSample += parseFloat(String(smp)) || 0;
        }
      });

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
  }, [dailyData, isValidDate]);

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
