"use client";
import { DailyRow } from "@/lib/data";

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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px" }}>
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>총 매출</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>₩{(sum.krw / 1e6).toFixed(1)}B</div>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>일 평균 {(sum.krw / 1e6 / data.length).toFixed(1)}B</div>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px" }}>
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>총 주문수</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{sum.ord.toLocaleString()}</div>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>일 평균 {(sum.ord / data.length).toLocaleString()}</div>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px" }}>
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>총 샘플 출고</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{sum.smp.toLocaleString()}</div>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>일 평균 {(sum.smp / data.length).toLocaleString()}</div>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px" }}>
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>총 소재 업로드</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{sum.aff.toLocaleString()}</div>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>일 평균 {(sum.aff / data.length).toLocaleString()}</div>
      </div>
    </div>
  );
}
