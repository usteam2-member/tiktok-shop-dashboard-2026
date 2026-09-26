"use client";
import { DailyRow, fmtFull } from "@/lib/data";

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
        <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)", marginBottom: "4px", whiteSpace: "nowrap" }}>₩{fmtFull(sum.krw)}</div>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>일 평균 ₩{fmtFull(sum.krw / data.length)}</div>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px" }}>
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>총 주문수</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{sum.ord.toLocaleString()}</div>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>일 평균 {fmtFull(sum.ord / data.length)}</div>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px" }}>
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>총 샘플 출고</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{sum.smp.toLocaleString()}</div>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>일 평균 {fmtFull(sum.smp / data.length)}</div>
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px" }}>
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>총 소재 업로드</div>
        <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{sum.aff.toLocaleString()}</div>
        <div style={{ fontSize: "12px", color: "var(--muted)" }}>일 평균 {fmtFull(sum.aff / data.length)}</div>
      </div>
    </div>
  );
}
