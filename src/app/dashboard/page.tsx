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
import styles from "./page.module.css";

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, error } = useSheetData();

  const [startDate, setStartDate] = useState(searchParams.get("start") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end") || "");
  const [activeQuick, setActiveQuick] = useState<number | null>(null);

  useEffect(() => {
    if (!data || startDate) return;
    const allDates = data.daily;
    if (!allDates.length) return;
    const first = fmt(dtToDate(allDates[0].dt));
    const last = fmt(dtToDate(allDates[allDates.length - 1].dt));
    setStartDate(first);
    setEndDate(last);
    router.replace(`/dashboard?start=${first}&end=${last}`, { scroll: false });
  }, [data]);

  const pushParams = useCallback((s: string, e: string) => {
    router.replace(`/dashboard?start=${s}&end=${e}`, { scroll: false });
  }, [router]);

  const handleQuick = useCallback((days: number | null) => {
    if (!data?.daily.length) return;
    setActiveQuick(days);
    const allDates = data.daily;
    const lastDt = allDates[allDates.length - 1].dt;
    const endD = dtToDate(lastDt);
    let startD: Date;
    if (days === null) {
      startD = dtToDate(allDates[0].dt);
    } else {
      startD = new Date(endD);
      startD.setDate(endD.getDate() - days + 1);
    }
    const s = fmt(startD);
    const e = fmt(endD);
    setStartDate(s);
    setEndDate(e);
    pushParams(s, e);
  }, [data, pushParams]);

  const handleStart = (v: string) => { setStartDate(v); setActiveQuick(null); pushParams(v, endDate); };
  const handleEnd = (v: string) => { setEndDate(v); setActiveQuick(null); pushParams(startDate, v); };

  const kpiData = useMemo(() => {
    if (!data) return [];
    if (activeQuick === 1) {
      const last = data.daily[data.daily.length - 1];
      return last ? [last] : [];
    }
    return filterByRange(startDate, endDate, data.daily);
  }, [data, startDate, endDate, activeQuick]);

  const chartData = useMemo(() => {
    if (!data) return [];
    if (activeQuick === 1) {
      const allDates = data.daily;
      const lastDt = dtToDate(allDates[allDates.length - 1].dt);
      const sevenAgo = new Date(lastDt);
      sevenAgo.setDate(lastDt.getDate() - 6);
      return filterByRange(fmt(sevenAgo), fmt(lastDt), allDates);
    }
    return filterByRange(startDate, endDate, data.daily);
  }, [data, startDate, endDate, activeQuick]);

  const top10Data = useMemo(() => {
    if (!data?.productTop10ByPeriod) return [];
    if (activeQuick === 1) return data.productTop10ByPeriod["1"];
    if (activeQuick === 7) return data.productTop10ByPeriod["7"];
    if (activeQuick === 30) return data.productTop10ByPeriod["30"];
    if (activeQuick === 90) return data.productTop10ByPeriod["90"];
    return data.productTop10ByPeriod["all"];
  }, [data, activeQuick]);

  const periodLabel = activeQuick === 1 ? "오늘" :
    activeQuick === 7 ? "최근 7일" :
    activeQuick === 30 ? "최근 30일" :
    activeQuick === 90 ? "최근 90일" : "전체";

  const chartActiveQuick = activeQuick === 1 ? 7 : activeQuick;

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
    <div className={styles.wrap}>
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
      <main className={styles.main}>
        {loading && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>구글 시트에서 데이터 불러오는 중...</p>
          </div>
        )}
        {error && (
          <div className={styles.errorWrap}>
            <p>⚠️ 데이터 로드 실패: {error}</p>
          </div>
        )}
        {data && !loading && (
          <>
            <div className={styles.updateInfo}>
              🔄 마지막 업데이트: {new Date(data.updatedAt).toLocaleString("ko-KR")} · 전체 {data.daily.length}일치
            </div>
            <KpiRow data={kpiData} />
            <DailyCharts data={chartData} activeQuick={chartActiveQuick} />
            <div className={styles.fullWidth}>
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
