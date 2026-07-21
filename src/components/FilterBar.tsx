"use client";
interface FilterBarProps {
  startDate: string;
  endDate: string;
  activeQuick: number | null;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onQuick: (days: number | null) => void;
}
const QUICK = [
  { label: "오늘", days: 1 },
  { label: "7일", days: 7 },
  { label: "30일", days: 30 },
  { label: "90일", days: 90 },
  { label: "전체", days: null },
];
export default function FilterBar({
  startDate, endDate, activeQuick,
  onStartChange, onEndChange, onQuick,
}: FilterBarProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {QUICK.map((q) => (
          <button
            key={q.label}
            onClick={() => onQuick(q.days)}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: activeQuick === q.days ? 600 : 400,
              background: activeQuick === q.days ? "#1f2937" : "#f3f4f6",
              color: activeQuick === q.days ? "white" : "#666",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {q.label}
          </button>
        ))}
        <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />
        <input
          type="date"
          value={startDate}
          min="2026-01-01"
          max="2026-12-31"
          onChange={(e) => onStartChange(e.target.value)}
          style={{ padding: "6px 8px", fontSize: "12px", border: "1px solid var(--border)", borderRadius: "4px" }}
        />
        <span style={{ fontSize: "12px", color: "var(--muted)" }}>~</span>
        <input
          type="date"
          value={endDate}
          min="2026-01-01"
          max="2026-12-31"
          onChange={(e) => onEndChange(e.target.value)}
          style={{ padding: "6px 8px", fontSize: "12px", border: "1px solid var(--border)", borderRadius: "4px" }}
        />
      </div>
      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
        {startDate} ~ {endDate} · <strong>{days}일</strong>
      </div>
    </div>
  );
}
