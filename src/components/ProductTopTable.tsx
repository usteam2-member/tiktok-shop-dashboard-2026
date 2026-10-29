"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchGmax, aggregateGmaxRange, lastCompleteDate, GmaxData } from "@/lib/gmax";
import { fetchProductRows, productOrdersInRange, aovOf } from "@/lib/productOrders";
import RankTable, { won } from "./RankTable";

interface Props {
  startDate: string;  // "YYYY-MM-DD"
  endDate: string;
  shopTotal?: number; // 같은 기간 샵 전체 매출 (비교용)
  fxRate?: number;    // 같은 기간 환율 (GMV | Daily 총 매출 KRW ÷ USD) — 객단가 달러 환산용
}

// 매출액 Top 20 — 데이터: Gmax 광고 시트의 제품별 GMV / Ads spend
export default function ProductTopTable({ startDate, endDate, shopTotal, fxRate }: Props) {
  const [data, setData] = useState<GmaxData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [prodRows, setProdRows] = useState<string[][] | null>(null);

  useEffect(() => {
    fetchGmax().then(setData).catch(e => setError(e.message));
    fetchProductRows().then(setProdRows).catch(() => setProdRows([])); // 실패해도 표는 표시 (객단가만 "-")
  }, []);

  // 객단가 = GMV | by Product 시트의 같은 기간 매출액(KRW) ÷ 주문수 → 환율로 달러 환산
  const orders = useMemo(
    () => (prodRows ? productOrdersInRange(prodRows, startDate, endDate) : null),
    [prodRows, startDate, endDate]
  );
  const aovUsd = (pid: string, sku: string): string | undefined => {
    if (!orders || !fxRate || fxRate <= 0) return undefined;
    const krw = aovOf((pid && orders.byPid[pid]) || (sku ? orders.bySku[sku] : undefined));
    return krw === null ? undefined : "$" + (krw / fxRate).toFixed(2);
  };

  const top = useMemo(() => {
    if (!data) return [];
    return aggregateGmaxRange(data, startDate, endDate)
      .filter(r => r.gmv > 0)
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 20);
  }, [data, startDate, endDate]);

  const lastDate = useMemo(() => (data ? lastCompleteDate(data) : ""), [data]);
  const sumTop = (n: number) => top.slice(0, n).reduce((a, r) => a + r.gmv, 0);
  const shareOf = (v: number) => (shopTotal && shopTotal > 0 ? (v / shopTotal) * 100 : null);

  if (error) return <div style={{ padding: 16, color: "#991b1b", background: "#fee2e2", borderRadius: 6 }}>⚠️ {error}</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>매출 Top 20 불러오는 중...</div>;

  return (
    <RankTable
      title="매출액 Top 20 제품"
      subtitle={`${startDate} ~ ${endDate} · Gmax 광고 시트 GMV 기준`}
      valueLabel="매출액"
      showCategory
      extraLabel="객단가"
      rows={top.map(r => ({ name: r.baseName, code: r.sku || undefined, category: r.type, roi: r.roi, value: r.gmv, hint: `Ads spend ${won(r.ads)}`, extra: aovUsd(r.pid, r.sku) }))}
      summaries={[
        ...[5, 10, 20].map(n => ({ label: `Top ${n} 매출 합계`, value: sumTop(n), shareLabel: "샵 전체 매출 대비", share: shareOf(sumTop(n)) })),
      ]}
      emptyText="이 기간에 매출 데이터가 없어요"
      footer={
        <>
          객단가(USD) = GMV | by Product 시트의 같은 기간 매출액 ÷ 주문수
          {fxRate ? ` · 환율 ₩${Math.round(fxRate).toLocaleString("ko-KR")}/$ (같은 기간 총 매출 KRW ÷ USD)` : ""}
          {lastDate && endDate > lastDate && (
            <div>Gmax 광고 시트는 {lastDate}까지 모든 제품이 입력돼 있어요. 이후 날짜는 일부 제품만 반영될 수 있어요.</div>
          )}
        </>
      }
    />
  );
}
