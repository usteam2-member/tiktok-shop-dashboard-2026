"use client";
import { DailyRow } from "@/lib/data";
import styles from "./KpiRow.module.css";

interface Props {
  data: DailyRow[];
}

export default function KpiRow({ data }: Props) {
  if (!data.length) return null;

  const last = data[data.length - 1];
  const sum = {
    krw: data.reduce((a, r) => a + r.krw, 0),
    ord: data.reduce((a, r) => a + r.ord, 0),
    smp: data.reduce((a, r) => a + r.smp, 0),
    aff: data.reduce((a, r) => a + r.aff, 0),
  };

  const kpis = [
    { label: "총 매출", value: sum.krw, format: (v: number) => `₩${(v / 1e6).toFixed(1)}B`, key: "krw" },
    { label: "총 주문수", value: sum.ord, format: (v: number) => v.toLocaleString(), key: "ord" },
    { label: "총 샘플 출고", value: sum.smp, format: (v: number) => v.toLocaleString(), key: "smp" },
    { label: "총 소재 업로드", value: sum.aff, format: (v: number) => v.toLocaleString(), key: "aff" },
  ];

  // 0이 아닌 KPI만 필터링
  const visibleKpis = kpis.filter(kpi => kpi.value > 0);

  if (!visibleKpis.length) {
    return (
      <div className={styles.wrap}>
        <div style={{ textAlign: "center", color: "#999", padding: "20px" }}>
          데이터가 없어요
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {visibleKpis.map((kpi) => (
        <div key={kpi.key} className={styles.card}>
          <div className={styles.label}>{kpi.label}</div>
          <div className={styles.value}>{kpi.format(kpi.value)}</div>
          <div className={styles.subtext}>
            일 평균 {kpi.format(kpi.value / data.length)}
          </div>
        </div>
      ))}
    </div>
  );
}
