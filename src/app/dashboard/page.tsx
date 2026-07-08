"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSheetData } from "@/lib/useSheetData";
import { filterByRange, dtToDate } from "@/lib/data";
import Navbar from "@/components/Navbar";
import TabBar from "@/components/TabBar";
import FilterBar from "@/components/FilterBar";
import KpiRow from "@/components/KpiRow";
import DailyChart from "@/components/DailyChart";
import ProductBars from "@/components/ProductBars";
import MonthlyChart from "@/components/MonthlyChart";
import ThisMonthChart from "@/components/ThisMonthChart";
import styles from "./page.module.css";

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const MONTH_LABEL: Record<string, string> = {
  "2601":"1월","2602":"2월","2603":"3월","2604":"4월",
  "2605":"5월","2606":"6월","2607":"7월","2608":"8월",
  "2609":"9월","2610":"10월","2611":"11월","2612":"12월",
};

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

  const filteredData = useMemo(() => {
    if (!data || !startDate || !endDate) return [];
    return filterByRange(startDate, endDate, data.daily);
  }, [data, startDate, endDate]);

  const last14Data = useMemo(() => {
    if (!data?.daily.length) return [];
    const allDates = data.daily;
    const lastDt = dtToDate(allDates[allDates.length - 1].dt);
    const twoWeeksAgo = new Date(lastDt);
    twoWeeksAgo.setDate(lastDt.getDate() - 13);
    return filterByRange(fmt(twoWeeksAgo), fmt(lastDt), allDates);
  }, [data]);

  const thisMonthLabel = useMemo(() => {
    if (!data?.daily.length) return "";
    const lastDt = data.daily[data.daily.length - 1].dt;
    return MONTH_LABEL[lastDt.slice(0, 4)] || lastDt.slice(0, 4);
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
            <KpiRow data={filteredData} />
            <div className={styles.fullWidth}>
              <DailyChart data={last14Data} />
            </div>
            <div className={styles.fullWidth}>
              <MonthlyChart data={data.sojae} />
            </div>
            <div className={styles.grid2}>
              <ProductBars data={data.top15} />
              <ThisMonthChart
                data={data.thisMonthTop10 || []}
                month={thisMonthLabel}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
