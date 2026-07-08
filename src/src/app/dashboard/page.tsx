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
import styles from "./page.module.css";

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, error } = useSheetData();

  // 데이터 로드 후 실제 마지막 날짜 기준으로 기본값 설정
  const [startDate, setStartDate] = useState(searchParams.get("start") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end") || "");
  const [activeQuick, setActiveQuick] = useState<number | null>(null);

  // 데이터 로드되면 URL 파라미터 없을 때 전체 범위로 초기화
  useEffect(() => {
    if (!data || startDate) return;
    const allDates = data.daily;
    if (!allDates.length) return;
    const first = fmt(dtToDate(allDates[0].dt));
    const last = fmt(dtToDate(allDates[allDates.length - 1].dt));
    setStartDate(first);
    setEndDate(last);
    setActiveQuick(null); // 전체
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
    const endDate = dtToDate(lastDt);
    let startD: Date;
    if (days === null) {
      // 전체: 데이터의 첫 날부터
      startD = dtToDate(allDates[0].dt);
    } else {
      // N일: 마지막 날 기준 N일 전
      startD = new Date(endDate);
      startD.setDate(endDate.getDate() - days + 1);
    }
    const s = fmt(startD);
    const e = fmt(endDate);
    setStartDate(s);
    setEndDate(e);
    pushParams(s, e);
  }, [data, pushParams]);

  const handleStart = (v: string) => { setStartDate(v); setActiveQuick(null); pushParams(v, endDate); };
  const handleEnd = (v: string) => { setEndDate(v); setActiveQuick(null); pushParams(startDate, v); };

  // 날짜 필터 적용
  const filteredData = useMemo(() => {
    if (!data || !startDate || !endDate) return [];
    return filterByRange(startDate, endDate, data.daily);
  }, [data, startDate, endDate]);

  // 최근 2주 데이터 (차트용)
  const last14Data = useMemo(() => {
    if (!data?.daily.length) return [];
    const allDates = data.daily;
    const lastDt = dtToDate(allDates[allDates.length - 1].dt);
    const twoWeeksAgo = new Date(lastDt);
    twoWeeksAgo.setDate(lastDt.getDate() - 13);
    return filterByRange(fmt(twoWeeksAgo), fmt(lastDt), allDates);
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
            <p style={{fontSize:12,marginTop:4}}>구글 시트 공유 설정을 확인해주세요.</p>
          </div>
        )}

        {data && !loading && (
          <>
            <div className={styles.updateInfo}>
              🔄 마지막 업데이트: {new Date(data.updatedAt).toLocaleString("ko-KR")} · 전체 {data.daily.length}일치
            </div>

            {/* KPI: 선택 기간 기준 */}
            <KpiRow data={filteredData} />

            {/* 일별 차트: 최근 2주 고정, 4개 지표 한 번에 */}
            <div className={styles.fullWidth}>
              <DailyChart data={last14Data} />
            </div>

            {/* 제품별 TOP 15 */}
            <div className={styles.fullWidth}>
              <ProductBars data={data.top15} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
