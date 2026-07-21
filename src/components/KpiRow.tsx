"use client";
import { DailyRow } from "@/lib/data";
import styles from "./KpiRow.module.css";

interface Props {
  data: DailyRow[];
}

export default function KpiRow({ data }: Props) {
  if (!data.length) return null;

  const sum = {
    krw: data.reduce((a, r) => a + r.krw, 0),
    ord: data.reduce((a, r) => a + r.ord, 0),
    smp: data.reduce((a, r) => a + r.smp, 0),
    aff: data.reduce((a, r) => a + r.aff, 0),
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.label}>총 매출</div>
        <div className={styles.value}>₩{(sum.krw / 1e6).toFixed(1)}B</div>
        <div className={styles.subtext}>일 평균 {(sum.krw / 1e6 / data.length).toFixed(1)}B</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>총 주문수</div>
        <div className={styles.value}>{sum.ord.toLocaleString()}</div>
        <div className={styles.subtext}>일 평균 {(sum.ord / data.length).toLocaleString()}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>총 샘플 출고</div>
        <div className={styles.value}>{sum.smp.toLocaleString()}</div>
        <div className={styles.subtext}>일 평균 {(sum.smp / data.length).toLocaleString()}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>총 소재 업로드</div>
        <div className={styles.value}>{sum.aff.toLocaleString()}</div>
        <div className={styles.subtext}>일 평균 {(sum.aff / data.length).toLocaleString()}</div>
      </div>
    </div>
  );
}
