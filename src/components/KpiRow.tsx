"use client";
import { DailyRow, fmtKRW } from "@/lib/data";
import styles from "./KpiRow.module.css";

interface KpiRowProps {
  data: DailyRow[];
}

export default function KpiRow({ data }: KpiRowProps) {
  const totalKRW = data.reduce((a, r) => a + r.krw, 0);
  const totalOrd = data.reduce((a, r) => a + r.ord, 0);
  const totalSmp = data.reduce((a, r) => a + r.smp, 0);
  const totalAff = data.reduce((a, r) => a + r.aff, 0);
  const avgKRW = data.length ? totalKRW / data.length : 0;
  const avgOrd = data.length ? totalOrd / data.length : 0;

  const kpis = [
    { label: "총 매출", main: fmtKRW(totalKRW), sub: `일 평균 ${fmtKRW(avgKRW)}` },
    { label: "총 주문수", main: totalOrd.toLocaleString(), sub: `일 평균 ${Math.round(avgOrd).toLocaleString()}건` },
    { label: "총 샘플 출고", main: totalSmp.toLocaleString(), sub: `${data.length}일 기준` },
    { label: "총 소재 업로드", main: totalAff.toLocaleString(), sub: "affiliate 기준" },
  ];

  return (
    <div className={styles.row}>
      {kpis.map((k) => (
        <div key={k.label} className={styles.card}>
          <div className={styles.label}>{k.label}</div>
          <div className={styles.main}>{k.main}</div>
          <div className={styles.sub}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}
