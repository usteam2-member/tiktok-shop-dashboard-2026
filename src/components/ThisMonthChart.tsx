"use client";
import { ProductTop10Item } from "@/lib/useSheetData";

interface Props {
  data: ProductTop10Item[];
  periodLabel: string;
  productDetails?: {
    name: string;
    pid: string;
    smpThisMonth: number;
    newSojae: number;
    revSojae: number;
  }[];
}

export default function ThisMonthChart({ data, periodLabel, productDetails }: Props) {
  if (!data.length) return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
      데이터가 없어요
    </div>
  );

  const detailMap = new Map(
    (productDetails || []).map(p => [p.name, p])
  );

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>제품별 주문수 TOP 10</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{periodLabel}</div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontWeight: 500, width: 28 }}>#</th>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontWeight: 500 }}>제품명</th>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--muted)", fontWeight: 500 }}>PID</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--muted)", fontWeight: 500 }}>주문수</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--muted)", fontWeight: 500 }}>샘플 출고</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--muted)", fontWeight: 500 }}>신규 소재</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--muted)", fontWeight: 500 }}>매출 소재</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => {
              const detail = detailMap.get(p.name);
              return (
                <tr key={p.name} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "#f8fafc" }}>
                  <td style={{ padding: "10px 10px", color: "var(--muted)", fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text)", fontWeight: i < 3 ? 600 : 400 }}>
                    {i === 0 && <span style={{ marginRight: 4 }}>🥇</span>}
                    {i === 1 && <span style={{ marginRight: 4 }}>🥈</span>}
                    {i === 2 && <span style={{ marginRight: 4 }}>🥉</span>}
                    <span style={{ marginRight: 6, fontSize: 11, color: "#94a3b8" }}>{p.productType}</span>
                    {p.name}
                  </td>
                  <td style={{ padding: "10px 10px", color: "#94a3b8", fontSize: 11 }}>
                    {detail?.pid || p.pid || "-"}
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", color: "#3b82f6", fontWeight: 600 }}>
                    {p.revenue.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--text)" }}>
                    {detail ? detail.smpThisMonth.toLocaleString() : "-"}
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--text)" }}>
                    {detail ? detail.newSojae.toLocaleString() : "-"}
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--text)" }}>
                    {detail ? detail.revSojae.toLocaleString() : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
