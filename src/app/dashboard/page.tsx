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
import ThisMonthChart from "@/components/ThisMonthChart";

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

  // 데이터 로드 시 가장 최신 날짜 기준으로 초기화
  useEffect(() => {
    if (!data?.daily.length) return;
    
    // 가장 최신 데이터 날짜 (마지막 항목)
    const lastDt = data.daily[data.daily.length - 1].dt;
    const latestDate = dtToDate(lastDt);
    
    // 📌 전체 탭은 2026-01-01부터 시작
    const s = "2026-01-01";
    const e = fmt(latestDate);
    
    console.log("📅 Data range:", s, "~", e);
    console.log("📊 Current URL:", searchParams.get("start"), "~", searchParams.get("end"));

    // URL의 날짜가 실제 데이터 범위를 벗어나거나 없으면 강제 재설정
    const urlStart = searchParams.get("start");
    const urlEnd = searchParams.get("end");
    
    if (!urlStart || !urlEnd || urlStart < s || urlEnd > e) {
      console.log("🔄 Resetting URL to 2026-01-01 ~ latest");
      setStartDate(s);
      setEndDate(e);
      setActiveQuick(null);
      router.replace(`/dashboard?start=${s}&end=${e}`, { scroll: false });
    } else {
      setStartDate(urlStart);
      setEndDate(urlEnd);
    }
  }, [data]);

  const pushParams = useCallback((s: string, e: string) => {
    router.replace(`/dashboard?start=${s}&end=${e}`, { scroll: false });
  }, [router]);

  const handleQuick = useCallback((days: number | null) => {
    if (!data?.daily.length) return;
    
    // 가장 최신 날짜 기준으로 계산
    const lastDt = data.daily[data.daily.length - 1].dt;
    const endD = dtToDate(lastDt);
    let startD: Date;

    if (days === null) {
      // 📌 전체: 2026-01-01부터 최신 날까지
      startD = new Date("2026-01-01");
    } else if (days === 1) {
      // 오늘: 최근 7일 (최신 날짜부터 7일 전)
      startD = subtractDays(endD, 6);  // 7일 데이터
    } else {
      // 최근 N일: 최신 날짜를 기준으로 N일 전
      startD = subtractDays(endD, days - 1);
    }

    const s = fmt(startD);
    const e = fmt(endD);
    console.log(`🔍 Filter: ${days} days → ${s} ~ ${e}`);
    
    setStartDate(s);
    setEndDate(e);
    setActiveQuick(days);
    pushParams(s, e);
  }, [data, pushParams]);

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

  // 📌 커스텀 범위 여부 판단
  const isCustomRange = useMemo(() => {
    if (!data?.daily.length || activeQuick !== null) return false;
    
    // 전체 탭은 2026-01-01부터 마지막 날까지가 기본값
    const lastDt = data.daily[data.daily.length - 1].dt;
    const lastDate = dtToDate(lastDt);
    const lastFmt = fmt(lastDate);
    
    // 2026-01-01과 lastDate가 기본값
    const isDefault = startDate === "2026-01-01" && endDate === lastFmt;
    return !isDefault;
  }, [data, startDate, endDate, activeQuick]);

  const top10Data = useMemo(() => {
    if (!data?.productTop10ByPeriod) return [];
    if (activeQuick === 1) return data.productTop10ByPeriod["7"];  // 오늘 = 7일 TOP 10
    if (activeQuick === 7) return data.productTop10ByPeriod["7"];
    if (activeQuick === 30) return data.productTop10ByPeriod["30"];
    if (activeQuick === 90) return data.productTop10ByPeriod["90"];
    return data.productTop10ByPeriod["all"];
  }, [data, activeQuick]);

  const periodLabel = activeQuick === 1 ? "오늘 (최근 7일 차트)" :
    activeQuick === 7 ? "최근 7일" :
    activeQuick === 30 ? "최근 30일" :
    activeQuick === 90 ? "최근 90일" : "전체";

  const productDetails = useMemo(() => {
    if (!data?.products) return [];
    return data.products.map(p => ({
      name: p.name,
      pid: p.pid,
      smpThisMonth: p.smpThisMonth,
      newSojae: p.newSojae,
      revSojae: p.revSojae,
    }));
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar startDate={startDate} endDate={endDate} />
      <TabBar />
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
            <div style={{ gridColumn: "1 / -1" }}>
              <ThisMonthChart
                data={top10Data}
                periodLabel={periodLabel}
                productDetails={productDetails}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
