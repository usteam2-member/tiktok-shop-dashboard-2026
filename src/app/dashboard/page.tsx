"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSheetData } from "@/lib/useSheetData";
import { filterByRange, dtToDate } from "@/lib/data";
import Navbar from "@/components/Navbar";
import TabBar from "@/components/TabBar";
import FilterBar from "@/components/FilterBar";
import KpiRow from "@/components/KpiRow";
import DailyCharts from "@/components/DailyChart";
import ProductSalesChart from "@/components/ProductSalesChart";
import AnomalyDetection from "@/components/AnomalyDetection";

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() - days * 24 * 60 * 60 * 1000);
  return result;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, error } = useSheetData();

  const [startDate, setStartDate] = useState(searchParams.get("start") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end") || "");
  const [activeQuick, setActiveQuick] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "anomaly">("dashboard");
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(10);
  const [selectedAnomalyDate, setSelectedAnomalyDate] = useState<string>("");

  useEffect(() => {
    if (!data?.daily.length) return;
    
    const lastDt = data.daily[data.daily.length - 1].dt;
    const latestDate = dtToDate(lastDt);
    
    const startD = subtractDays(latestDate, 29);
    const s = fmt(startD);
    const e = fmt(latestDate);
    
    console.log("📅 Data range:", s, "~", e);
    console.log("📊 Current URL:", searchParams.get("start"), "~", searchParams.get("end"));

    const urlStart = searchParams.get("start");
    const urlEnd = searchParams.get("end");
    
    if (!urlStart || !urlEnd) {
      setStartDate(s);
      setEndDate(e);
      setActiveQuick(30);
    } else if (urlStart < s || urlEnd > e) {
      console.log("⚠️  URL dates out of range, resetting to default");
      setStartDate(s);
      setEndDate(e);
      setActiveQuick(30);
    } else {
      setStartDate(urlStart);
      setEndDate(urlEnd);
    }
  }, [data?.daily]);

  const pushParams = useCallback((s: string, e: string) => {
    const p = new URLSearchParams();
    p.set("start", s);
    p.set("end", e);
    router.push(`/dashboard?${p.toString()}`);
  }, [router]);

  const handleQuick = (days: number | null) => {
    if (!data?.daily.length) return;
    
    const lastDt = data.daily[data.daily.length - 1].dt;
    const latestDate = dtToDate(lastDt);
    
    if (days === null) {
      // 전체
      setStartDate("2026-01-01");
      setEndDate(fmt(latestDate));
      setActiveQuick(null);
      pushParams("2026-01-01", fmt(latestDate));
    } else {
      const startD = subtractDays(latestDate, days - 1);
      const s = fmt(startD);
      const e = fmt(latestDate);
      
      setStartDate(s);
      setEndDate(e);
      setActiveQuick(days);
      pushParams(s, e);
    }
  };

  const handleStart = (v: string) => { setStartDate(v); setActiveQuick(null); pushParams(v, endDate); };
  const handleEnd = (v: string) => { setEndDate(v); setActiveQuick(null); pushParams(startDate, v); };

  const kpiData = useMemo(() => {
    if (!data) return [];
    const filtered = filterByRange(startDate, endDate, data.daily);
    console.log(`📈 KPI Data: ${startDate} ~ ${endDate} → ${filtered.length} items`);
    return filtered;
  }, [data, startDate, endDate]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const filtered = filterByRange(startDate, endDate, data.daily);
    console.log(`📊 Chart Data: ${startDate} ~ ${endDate} → ${filtered.length} items`);
    return filtered;
  }, [data, startDate, endDate]);

  const isCustomRange = useMemo(() => {
    if (!data?.daily.length || activeQuick !== null) return false;
    
    const lastDt = data.daily[data.daily.length - 1].dt;
    const lastDate = dtToDate(lastDt);
    const lastFmt = fmt(lastDate);
    
    const isDefault = startDate === "2026-01-01" && endDate === lastFmt;
    return !isDefault;
  }, [data, startDate, endDate, activeQuick]);

  const productSalesData = useMemo(() => {
    if (!data?.productTop10ByPeriod) return [];
    const key = activeQuick === 1 ? "1" : activeQuick === 7 ? "7" : activeQuick === 30 ? "30" : activeQuick === 90 ? "90" : "all";
    const top10 = data.productTop10ByPeriod[key]?.revenue || [];
    return top10.map(p => ({
      productName: p.name,
      sales: p.revenue,
      orders: (p as any).orders || 0,
    }));
  }, [data, activeQuick]);

  const periodLabel = activeQuick === 1 ? "오늘 (최근 7일 차트)" :
    activeQuick === 7 ? "최근 7일" :
    activeQuick === 30 ? "최근 30일" :
    activeQuick === 90 ? "최근 90일" : "전체";

  // 📊 이상감지용 available dates 계산 (최근 30일만)
  const availableDates = useMemo(() => {
    if (!data?.daily) return [];
    return data.daily
      .map(d => {
        let dt = d.dt;
        // "20260804" → "2026-08-04" 형식으로 표준화
        if (dt.length === 8 && !dt.includes('-')) {
          dt = `${dt.substring(0, 4)}-${dt.substring(4, 6)}-${dt.substring(6, 8)}`;
        }
        return dt;
      })
      .reverse() // 최신부터 오래된 순
      .slice(0, 30); // 최근 30일만
  }, [data]);

  // 📊 선택된 날짜의 이상감지 데이터
  const selectedDateAnomalies = useMemo(() => {
    if (!data?.anomaliesByDate) {
      return { increases: [], decreases: [] };
    }
    
    // selectedAnomalyDate가 비어있으면 최신 데이터
    const dateKey = selectedAnomalyDate || (availableDates[0] || "");
    
    console.log("📊 [Dashboard] dateKey:", dateKey, "availableDates[0]:", availableDates[0]);
    
    const result = data.anomaliesByDate[dateKey] || { increases: [], decreases: [] };
    console.log("📊 [Dashboard] Data for", dateKey, ": +", result.increases?.length || 0, " -", result.decreases?.length || 0);
    
    return result;
  }, [data, selectedAnomalyDate, availableDates]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar startDate={startDate} endDate={endDate} />
      <TabBar />
      
      {/* 탭 네비게이션 */}
      <div style={{ display: "flex", gap: "12px", padding: "10px 20px", borderBottom: "2px solid #e5e7eb", background: "var(--card)" }}>
        <button
          onClick={() => setActiveTab("dashboard")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "dashboard" ? "#3b82f6" : "#f3f4f6",
            color: activeTab === "dashboard" ? "white" : "#64748b",
            fontWeight: activeTab === "dashboard" ? 700 : 600,
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: activeTab === "dashboard" ? "0 2px 8px rgba(59, 130, 246, 0.3)" : "none",
            transform: activeTab === "dashboard" ? "translateY(-2px)" : "translateY(0)",
          }}
        >
          📊 대시보드
        </button>
        <button
          onClick={() => setActiveTab("anomaly")}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "anomaly" ? "#3b82f6" : "#f3f4f6",
            color: activeTab === "anomaly" ? "white" : "#64748b",
            fontWeight: activeTab === "anomaly" ? 700 : 600,
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: activeTab === "anomaly" ? "0 2px 8px rgba(59, 130, 246, 0.3)" : "none",
            transform: activeTab === "anomaly" ? "translateY(-2px)" : "translateY(0)",
          }}
        >
          ⚠️ 이상감지
        </button>
      </div>

      {/* 대시보드 탭 */}
      {activeTab === "dashboard" && (
        <>
          <FilterBar
            startDate={startDate}
            endDate={endDate}
            activeQuick={activeQuick}
            onStartChange={handleStart}
            onEndChange={handleEnd}
            onQuick={handleQuick}
          />
          <main style={{ flex: 1, padding: "20px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", gap: "20px" }}>
                <div style={{ width: "40px", height: "40px", border: "3px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <p>구글 시트에서 데이터 불러오는 중...</p>
              </div>
            )}
            {error && (
              <div style={{ padding: "20px", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", margin: "20px" }}>
                <p>⚠️ 데이터 로드 실패: {error}</p>
              </div>
            )}
            {data && !loading && (
              <>
                <div style={{ padding: "12px 16px", background: "#f0f9ff", borderLeft: "3px solid #3b82f6", fontSize: "12px", color: "#1e40af", marginBottom: "20px" }}>
                  🔄 마지막 업데이트: {new Date(data.updatedAt).toLocaleString("ko-KR")} · 전체 {data.daily.length}일치
                </div>
                <KpiRow data={kpiData} />
                <DailyCharts data={chartData} activeQuick={activeQuick} isCustomRange={isCustomRange} />
                
                {/* 📊 매출액 Top 10 제품 차트 */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <ProductSalesChart 
                    data={productSalesData} 
                    periodLabel={periodLabel}
                  />
                </div>
              </>
            )}
          </main>
        </>
      )}

      {/* 이상감지 탭 */}
      {activeTab === "anomaly" && (
        <main style={{ flex: 1, padding: "20px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", gap: "20px" }}>
              <div style={{ width: "40px", height: "40px", border: "3px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <p>구글 시트에서 데이터 불러오는 중...</p>
            </div>
          )}
          {error && (
            <div style={{ padding: "20px", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", margin: "20px" }}>
              <p>⚠️ 데이터 로드 실패: {error}</p>
            </div>
          )}
          {data && !loading && (
            <>
              {(() => {
                const filteredIncreases = selectedDateAnomalies?.increases?.filter((item) => item.changePercent >= anomalyThreshold) || [];
                const filteredDecreases = selectedDateAnomalies?.decreases?.filter((item) => Math.abs(item.changePercent) >= anomalyThreshold) || [];
                
                console.log("📊 [Dashboard] selectedDateAnomalies:", selectedDateAnomalies);
                console.log("📊 [Dashboard] Original increases:", selectedDateAnomalies?.increases?.length || 0);
                console.log("📊 [Dashboard] Filtered increases (threshold " + anomalyThreshold + "):", filteredIncreases.length);
                console.log("📊 [Dashboard] Original decreases:", selectedDateAnomalies?.decreases?.length || 0);
                console.log("📊 [Dashboard] Filtered decreases (threshold " + anomalyThreshold + "):", filteredDecreases.length);
                
                return (
                  <AnomalyDetection 
                    increases={filteredIncreases}
                    decreases={filteredDecreases}
                    threshold={anomalyThreshold}
                    onThresholdChange={setAnomalyThreshold}
                    selectedDate={selectedAnomalyDate}
                    onDateChange={setSelectedAnomalyDate}
                    availableDates={availableDates}
                  />
                );
              })()}
            </>
          )}
        </main>
      )}
    </div>
  );
}
