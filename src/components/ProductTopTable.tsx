"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchGmax, aggregateGmaxRange, lastCompleteDate, GmaxData } from "@/lib/gmax";
import RankTable, { won } from "./RankTable";

interface Props {
  startDate: string;  // "YYYY-MM-DD"
  endDate: string;
  shopTotal?: number; // 같은 기간 샵 전체 매출 (비교용)
}

// 매출액 Top 10 — 데이터: Gmax 광고 시트의 제품별 GMV / Ads spend
export default function ProductTopTable({ startDate, endDate, shopTotal }: Props) {
  const [data, setData] = useState<GmaxData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGmax().then(setData).catch(e => setError(e.message));
  }, []);

  const top = useMemo(() => {
    if (!data) return [];
    return aggregateGmaxRange(data, startDate, endDate)
      .filter(r => r.gmv > 0)
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 10);
  }, [data, startDate, endDate]);

  const lastDate = useMemo(() => (data ? lastCompleteDate(data) : ""), [data]);
  const sum = top.reduce((a, r) => a + r.gmv, 0);

  if (error) return <div style={{ padding: 16, color: "#991b1b", background: "#fee2e2", borderRadius: 6 }}>⚠️ {error}</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>매출 Top 10 불러오는 중...</div>;

  return (
    <RankTable
      title="매출액 Top 10 제품"
      subtitle={`${startDate} ~ ${endDate} · Gmax 광고 시트 GMV 기준`}
      valueLabel="매출액"
      showCategory
      rows={top.map(r => ({ name: r.baseName, category: r.type, roi: r.roi, value: r.gmv, hint: `Ads spend ${won(r.ads)}` }))}
      summary={{
        label: "Top 10 매출 합계",
        value: sum,
        shareLabel: "샵 전체 매출 대비",
        share: shopTotal && shopTotal > 0 ? (sum / shopTotal) * 100 : null,
      }}
      emptyText="이 기간에 매출 데이터가 없어요"
      footer={
        lastDate && endDate > lastDate
          ? `Gmax 광고 시트는 ${lastDate}까지 모든 제품이 입력돼 있어요. 이후 날짜는 일부 제품만 반영될 수 있어요.`
          : undefined
      }
    />
  );
}
