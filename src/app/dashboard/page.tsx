"use client";
import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSheetData } from "@/lib/useSheetData";
import { filterByRange } from "@/lib/data";
import Navbar from "@/components/Navbar";
import TabBar from "@/components/TabBar";
import FilterBar from "@/components/FilterBar";
import KpiRow from "@/components/KpiRow";
import DailyChart from "@/components/DailyChart";
import ProductBars from "@/components/ProductBars";
import SojaeChart from "@/components/SojaeChart";
import styles from "./page.module.css";

const DEFAULT_START = "2026-01-01";
const DEFAULT_END = "2026-07-31";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(searchParams.get("start") || DEFAULT_START);
  const [endDate, setEndDate] = useState(searchParams.get("end") || DEFAULT_END);
  const [activeQuick, setActiveQuick] = useState<number | null>(null);

  // 구글 시트에서 데이터 로드
  const { data, loading, error } = useSheetData();

  // 날짜 필터 적용
  const filteredData = useMemo(() => {
    if (!data) return [];
    return filterByRange(startDate, endDate, data.daily);
  }, [data, startDate, endDate]);

  const pushParams = useCallback((s: string, e: string) => {
    router.replace(`/dashboard?start=${s}&end=${e}`, { scroll: false });
  }, [router]);

  const handleQuick = (days: number | null) => {
    setActiveQuick(days);
    // 데이터의 실제 날짜 범위 기반으로 동적 처리
    const allDates = data?.daily.map(r => r.dt) || [];
    const lastDt = allDates[allDates.length - 1] || "260731";
    const endY = 2000 + parseInt(lastDt.slice(0, 2));
    const endM = parseInt(lastDt.slice(2, 4)) - 1;
    const endD = parseInt(lastDt.slice(4, 6));
    const end = new Date(endY, endM, endD);
    let start: Date;
    if (days === null) {
      const firstDt = allDates[0] || "260101";
      start = new Date(2000 + parseInt(firstDt.slice(0,2)), parseInt(firstDt.slice(2,4))-1, parseInt(firstDt.slice(4,6)));
    } else {
      start = new Date(end);
      start.setDate(end.getDate() - days + 1);
    }
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const s = fmt(start);
    const e = fmt(end);
    setStartDate(s);
    setEndDate(e);
    pushParams(s, e);
  };

  const handleStart = (v: string) => { setStartDate(v); setActiveQuick(null); pushParams(v, endDate); };
  const handleEnd = (v: string) => { setEndDate(v); setActiveQuick(null); pushParams(startDate, v); };

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

        {/* 로딩 상태 */}
        {loading && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>구글 시트에서 데이터 불러오는 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className={styles.errorWrap}>
            <p>⚠️ 데이터 로드 실패: {error}</p>
            <p style={{fontSize:12, marginTop:4}}>구글 시트 공유 설정을 확인해주세요.</p>
          </div>
        )}

        {/* 데이터 로드 완료 */}
        {data && !loading && (
          <>
            <div className={styles.updateInfo}>
              🔄 마지막 업데이트: {new Date(data.updatedAt).toLocaleString("ko-KR")} · 데이터 {data.daily.length}일치
            </div>
            <KpiRow data={filteredData} />
            <div className={styles.grid2}>
              <DailyChart data={filteredData} metric="revenue" />
              <DailyChart data={filteredData} metric="creatives" />
            </div>
            <div className={styles.grid2}>
              <ProductBars data={data.top15} />
              <SojaeChart data={data.sojae} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
