"use client";
import { useSheetData } from "@/lib/useSheetData";
import { useState, useMemo } from "react";
import FilterBar from "@/components/FilterBar";
import KpiRow from "@/components/KpiRow";
import DailyChart from "@/components/DailyChart";
import ProductSalesChart from "@/components/ProductSalesChart";
import AnomalyDetection from "@/components/AnomalyDetection";

export default function DashboardPage() {
  const { data, loading, error } = useSheetData();
  const [activeQuick, setActiveQuick] = useState<number | null>(30);
  const [activeCustomDate, setActiveCustomDate] = useState<[string, string] | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(today);

  const handleQuickChange = (days: number | null) => {
    if (days === null) {
      // 설정 탭 - 커스텀 날짜 사용
      setActiveQuick(null);
      return;
    }
    
    setActiveQuick(days);
    const start = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(today);
  };

  const isCustomRange = activeQuick === null;

  const chartData = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily.filter((row) => {
      const dt = row.dt;
      return dt >= startDate && dt <= endDate;
    });
  }, [data, startDate, endDate]);

  const kpiData = useMemo(() => {
    if (chartData.length === 0) {
      return { sales: 0, orders: 0, aff: 0, smp: 0 };
    }
    return {
      sales: chartData.reduce((sum, row) => sum + row.krw, 0),
      orders: chartData.reduce((sum, row) => sum + row.ord, 0),
      aff: chartData.reduce((sum, row) => sum + row.aff, 0),
      smp: chartData.reduce((sum, row) => sum + row.smp, 0),
    };
  }, [chartData]);

  const periodLabel = useMemo(() => {
    if (activeQuick === 7) return "7일";
    if (activeQuick === 30) return "30일";
    if (activeQuick === 90) return "90일";
    if (activeQuick === null) return `${startDate} ~ ${endDate}`;
    return "전체";
  }, [activeQuick, startDate, endDate]);

  const productSalesData = useMemo(() => {
    if (!data?.productTop10ByPeriod) return [];
    
    let key: string = "all";
    if (activeQuick === 7) key = "7";
    else if (activeQuick === 30) key = "30";
    else if (activeQuick === 90) key = "90";
    
    const top10 = data.productTop10ByPeriod[key]?.revenue || [];
    return top10.map(p => ({
      productName: p.name,
      sales: p.revenue,
      orders: (p as any).orders || 0,
    }));
  }, [data, activeQuick]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "18px",
          color: "#999",
        }}
      >
        로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "18px",
          color: "#dc2626",
        }}
      >
        에러: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      {/* 탭 네비게이션 */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        <button
          onClick={() => setActiveTab("dashboard")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: activeTab === "dashboard" ? "#3b82f6" : "transparent",
            color: activeTab === "dashboard" ? "white" : "#64748b",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          📊 대시보드
        </button>
        <button
          onClick={() => setActiveTab("anomaly")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: activeTab === "anomaly" ? "#3b82f6" : "transparent",
            color: activeTab === "anomaly" ? "white" : "#64748b",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          ⚠️ 이상감지
        </button>
      </div>

      {/* 대시보드 탭 */}
      {activeTab === "dashboard" && (
        <div>
          <FilterBar 
            startDate={startDate}
            endDate={endDate}
            activeQuick={activeQuick}
            onQuick={handleQuickChange}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <KpiRow data={kpiData} />
            <DailyChart data={chartData} activeQuick={activeQuick} isCustomRange={isCustomRange} />

            {/* 📊 매출액 기준 Top 10 제품 차트 */}
            <div style={{ gridColumn: "1 / -1" }}>
              <ProductSalesChart data={productSalesData} periodLabel={periodLabel} />
            </div>
          </div>
        </div>
      )}

      {/* 이상감지 탭 */}
      {activeTab === "anomaly" && (
        <div>
          <AnomalyDetection increases={data?.anomalies.increases || []} decreases={data?.anomalies.decreases || []} />
        </div>
      )}
    </div>
  );
}
