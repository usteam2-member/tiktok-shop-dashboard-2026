"use client";
import { DailyRow, fmtKRW } from "@/lib/data";
import styles from "./KpiRow.module.css";

interface KpiRowProps {
  data: DailyRow[];
}

export default function KpiRow({ data }: KpiRowProps) {
  if (!data.length) return null;

  const totalKRW = data.reduce((a, r) => a + r.krw, 0);
  const totalOrd = data.reduce((a, r) => a + r.ord, 0);
  const totalSmp = data.reduce((a, r) => a + r.smp, 0);
  const totalAff = data.reduce((a, r) => a + r.aff, 0);
  const avgKRW = totalKRW / data.length;
  const avgOrd = totalOrd / data.length;
  const peakKRW = Math.max(...data.map((r) => r.krw));
  const lowKRW = Math.min(...data.map((r) => r.krw));

  const kpis = [
    { label: "총 매출", main: fmtKRW(totalKRW), sub: `일 평균 ${fmtKRW(avgKRW)}` },
    { label: "총 주문수", main: totalOrd.toLocaleString(), sub: `일 평균 ${Math.round(avgOrd).toLocaleString()}건` },
    { label: "총 샘플 출고", main: totalSmp.toLocaleString(), sub: `${data.length}일 기준` },
    { label: "총 소재 업로드", main: totalAff.toLocaleString(), sub: "affiliate 기준" },
    { label: "일 최대 매출", main: fmtKRW(peakKRW), sub: "기간 내 피크", accent: "up" },
    { label: "일 최저 매출", main: fmtKRW(lowKRW), sub: "기간 내 최저", accent: "down" },
  ];

  return (
    <div className={styles.row}>
      {kpis.map((k) => (
        <div key={k.label} className={styles.card}>
          <div className={styles.label}>{k.label}</div>
          <div className={styles.main + (k.accent ? " " + styles[k.accent] : "")}>{k.main}</div>
          <div className={styles.sub}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}
