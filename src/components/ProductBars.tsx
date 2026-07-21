"use client";
import { ProductRow } from "@/lib/data";

interface Props {
  data: ProductRow[];
}

export default function ProductBars({ data }: Props) {
  if (!data.length) return null;
  
  const top15 = data.slice(0, 15);
  const max = top15[0]?.totalRevenue || 1;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>제품별 누적 매출 TOP 15</div>
        <span style={{ fontSize: "11px", background: "var(--muted)", color: "var(--text)", padding: "4px 8px", borderRadius: "4px" }}>2026 전체</span>
      </div>
      <div>
        {top15.map((p, i) => (
          <div key={p.name} style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 80px", alignItems: "center", gap: "12px", padding: "8px 0", borderBottom: i < top15.length - 1 ? "1px solid var(--border)" : "none" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)", textAlign: "center" }}>
              {i === 0 && "🥇"}
              {i === 1 && "🥈"}
              {i === 2 && "🥉"}
              {i > 2 && i + 1}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "0" }}>
              <span style={{ marginRight: "6px", fontSize: "10px", color: "#94a3b8", background: "#f1f5f9", padding: "2px 6px", borderRadius: "3px", whiteSpace: "nowrap", flexShrink: 0 }}>{p.productType}</span>
              <span style={{ fontSize: "13px", fontWeight: i < 3 ? 600 : 400, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
            </div>
            <div style={{ height: "24px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)",
                  borderRadius: "4px",
                  width: `${(p.totalRevenue / max) * 100}%`,
                  opacity: 1 - i * 0.035,
                }}
              />
            </div>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#3b82f6", textAlign: "right" }}>₩{(p.totalRevenue / 1e6).toFixed(0)}M</span>
          </div>
        ))}
      </div>
    </div>
  );
}
