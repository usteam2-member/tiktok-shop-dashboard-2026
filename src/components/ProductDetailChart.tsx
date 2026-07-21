"use client";
import { useState } from "react";
import { ProductRow } from "@/lib/data";
import ProductDetailChart from "@/components/ProductDetailChart";

interface Props {
  products: ProductRow[];
}

export default function ProductSearch({ products }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProductRow | null>(null);

  const filtered = query.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.pid.includes(query) ||
        p.sku.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
        <span style={{ fontSize: "18px" }}>🔍</span>
        <input
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            fontSize: "14px",
          }}
          placeholder="제품명, PID, SKU로 검색..."
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null); }}
        />
        {query && (
          <button
            style={{ padding: "6px 12px", background: "#e5e7eb", border: "none", borderRadius: "4px", cursor: "pointer" }}
            onClick={() => { setQuery(""); setSelected(null); }}
          >
            ✕
          </button>
        )}
      </div>

      {!selected && filtered.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
          <div style={{ background: "var(--card)", padding: "12px 16px", display: "flex", justifyContent: "space-between", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
            <span>제품</span>
            <div style={{ display: "flex", gap: "40px" }}>
              <span>이번달 주문</span>
              <span>이번달 샘플</span>
              <span>신규 소재</span>
            </div>
          </div>
          {filtered.map(p => (
            <div
              key={p.name}
              onClick={() => setSelected(p)}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--card)",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--card)")}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>
                  <span style={{ marginRight: "6px", fontSize: "11px", color: "#94a3b8" }}>{p.productType}</span>
                  {p.name}
                </div>
                {p.pid && <div style={{ fontSize: "11px", color: "#94a3b8" }}>PID: {p.pid}</div>}
              </div>
              <div style={{ display: "flex", gap: "40px", textAlign: "right" }}>
                <span style={{ fontSize: "12px", color: "var(--text)" }}>{p.ordThisMonth.toLocaleString()}</span>
                <span style={{ fontSize: "12px", color: "var(--text)" }}>{p.smpThisMonth.toLocaleString()}</span>
                <span style={{ fontSize: "12px", color: "var(--text)" }}>{p.newSojae.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!selected && query && filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#999", padding: "20px" }}>검색 결과가 없어요 😅</div>
      )}

      {selected && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
          <button
            onClick={() => setSelected(null)}
            style={{ padding: "6px 12px", background: "#e5e7eb", border: "none", borderRadius: "4px", cursor: "pointer", marginBottom: "12px" }}
          >
            ← 목록으로
          </button>
          <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "12px 0", color: "var(--text)" }}>
            <span style={{ marginRight: "8px", fontSize: "13px", color: "#94a3b8" }}>{selected.productType}</span>
            {selected.name}
          </h2>
          {selected.pid && <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>PID: {selected.pid}</div>}
          {selected.sku && <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>SKU: {selected.sku}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>오늘 주문수</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>{selected.ordToday.toLocaleString()}</div>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>최근 7일 주문수</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>{selected.ord7.toLocaleString()}</div>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>최근 30일 주문수</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>{selected.ord30.toLocaleString()}</div>
            </div>
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>이번달 주문수</div>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>{selected.ordThisMonth.toLocaleString()}</div>
            </div>
          </div>

          <ProductDetailChart series={selected.dailySeries} />
        </div>
      )}

      {!query && !selected && (
        <div style={{ textAlign: "center", color: "#999", padding: "40px 20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
          <div style={{ fontSize: "14px", marginBottom: "6px" }}>제품명, PID, SKU를 입력해서 검색해보세요</div>
          <div style={{ fontSize: "12px" }}>총 {products.length}개 제품</div>
        </div>
      )}
    </div>
  );
}
