"use client";
interface Props {
  startDate: string;
  endDate: string;
}

export default function Navbar({ startDate, endDate }: Props) {
  return (
    <div style={{ background: "#1f2937", color: "white", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0" }}>TikTok Shop 매출 대시보드</h1>
        <div style={{ fontSize: "12px", color: "#d1d5db" }}>조회 기간: {startDate} ~ {endDate}</div>
      </div>
      <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
        <button style={{ padding: "6px 12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>설정/에디터</button>
        <button style={{ padding: "6px 12px", background: "#6b7280", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>삼 문서</button>
        <button style={{ padding: "6px 12px", background: "#6b7280", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>재공할</button>
        <button style={{ padding: "6px 12px", background: "#6b7280", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>소개</button>
      </div>
    </div>
  );
}
