"use client";
import { ProductTop10Item } from "@/lib/data";

interface ProductDetail {
  name: string;
  pid: string;
  smpThisMonth: number;
  newSojae: number;
  revSojae: number;
}

interface Props {
  data: ProductTop10Item[];
  periodLabel: string;
  productDetails: ProductDetail[];
}

export default function ThisMonthChart({ data, periodLabel, productDetails }: Props) {
  if (!data.length) {
    return (
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "40px 20px",
          textAlign: "center",
          color: "#999",
          gridColumn: "1 / -1",
          minHeight: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        데이터가 없어요
      </div>
    );
  }

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      {/* 테이블 */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "16px" }}>
          제품별 주문수 TOP 10
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", background: "#f9fafb" }}>
              <th style={{ padding: "12px", textAlign: "left", color: "#666", fontWeight: 600 }}>#</th>
              <th style={{ padding: "12px", textAlign: "left", color: "#666", fontWeight: 600 }}>제품명</th>
              <th style={{ padding: "12px", textAlign: "left", color: "#666", fontWeight: 600 }}>ERP 품번</th>
              <th style={{ padding: "12px", textAlign: "right", color: "#666", fontWeight: 600 }}>주문수</th>
              <th style={{ padding: "12px", textAlign: "right", color: "#666", fontWeight: 600 }}>생품 출고</th>
              <th style={{ padding: "12px", textAlign: "right", color: "#666", fontWeight: 600 }}>신규 소재</th>
              <th style={{ padding: "12px", textAlign: "right", color: "#666", fontWeight: 600 }}>매출 소재</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const detail = productDetails.find(p => p.pid === item.pid);
              return (
                <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px", color: "#666" }}>{idx + 1}</td>
                  <td style={{ padding: "12px", color: "var(--text)", fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: "12px", color: "#3b82f6" }}>{item.sku}</td>
                  <td style={{ padding: "12px", textAlign: "right", color: "var(--text)", fontWeight: 500 }}>
                    {(item as any).orders || 0}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", color: "#999" }}>
                    {detail?.smpThisMonth || "-"}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", color: "#999" }}>
                    {detail?.newSojae || "-"}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right", color: "#999" }}>
                    {detail?.revSojae || "-"}
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
