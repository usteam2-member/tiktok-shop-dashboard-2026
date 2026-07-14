"use client";
import { useState, useEffect } from "react";
import { ProductItem } from "@/lib/useSheetData";
import ProductDetailChart from "@/components/ProductDetailChart";
import styles from "./ProductSearch.module.css";

interface KpiData {
  invite?: { target: number; current: number; rate: number };
  shipment?: { target: number; current: number; rate: number };
  video?: { target: number; current: number; rate: number };
}

interface Props {
  products: ProductItem[];
}

export default function ProductSearch({ products }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProductItem | null>(null);
  const [kpiMap, setKpiMap] = useState<Record<string, KpiData>>({});

  useEffect(() => {
    fetch("/api/kpi")
      .then(r => r.json())
      .then(d => setKpiMap(d.kpi || {}))
      .catch(() => setKpiMap({}));
  }, []);

  const filtered = query.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.pid.includes(query) ||
        p.sku.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const selectedKpi = selected ? kpiMap[selected.pid] : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.searchBox}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.input}
          placeholder="제품명, PID, SKU로 검색..."
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null); }}
        />
        {query && (
          <button className={styles.clear} onClick={() => { setQuery(""); setSelected(null); }}>✕</button>
        )}
      </div>

      {!selected && filtered.length > 0 && (
        <div className={styles.resultList}>
          <div className={styles.resultHeader}>
            <span>제품</span>
            <div className={styles.headerCols}>
              <span>이번달 주문</span>
              <span>이번달 샘플</span>
              <span>신규 소재</span>
            </div>
          </div>
          {filtered.map(p => (
            <div key={p.name} className={styles.resultRow} onClick={() => setSelected(p)}>
              <div className={styles.resultLeft}>
                <div className={styles.resultName}>{p.name}</div>
                {p.pid && <div className={styles.resultPid}>PID: {p.pid}</div>}
              </div>
              <div className={styles.resultCols}>
                <div className={styles.colItem}>
                  <span className={styles.colVal}>{p.ordThisMonth.toLocaleString()}</span>
                </div>
                <div className={styles.colItem}>
                  <span className={styles.colVal}>{p.smpThisMonth.toLocaleString()}</span>
                </div>
                <div className={styles.colItem}>
                  <span className={styles.colVal}>{p.newSojae.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!selected && query && filtered.length === 0 && (
        <div className={styles.noResult}>검색 결과가 없어요 😅</div>
      )}

      {selected && (
        <div className={styles.detail}>
          <button className={styles.back} onClick={() => setSelected(null)}>← 목록으로</button>
          <div className={styles.detailHeader}>
            <h2 className={styles.detailName}>{selected.name}</h2>
            {selected.pid && <div className={styles.detailMeta}>PID: {selected.pid}</div>}
            {selected.sku && <div className={styles.detailMeta}>SKU: {selected.sku}</div>}
          </div>

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>오늘 주문수</div>
              <div className={styles.kpiVal}>{selected.ordToday.toLocaleString()}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>최근 7일 주문수</div>
              <div className={styles.kpiVal}>{selected.ord7.toLocaleString()}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>최근 30일 주문수</div>
              <div className={styles.kpiVal}>{selected.ord30.toLocaleString()}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>이번달 주문수</div>
              <div className={styles.kpiVal}>{selected.ordThisMonth.toLocaleString()}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>이번달 샘플 출고</div>
              <div className={styles.kpiVal}>{selected.smpThisMonth.toLocaleString()}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>이번달 신규 소재</div>
              <div className={styles.kpiVal}>{selected.newSojae.toLocaleString()}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>이번달 매출 소재</div>
              <div className={styles.kpiVal}>{selected.revSojae.toLocaleString()}</div>
            </div>
          </div>

          {selectedKpi && (
            <div style={{ marginTop: "2rem", padding: "1.5rem", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #e0e0e0" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.5rem", color: "#333" }}>📊 KPI 달성 현황</h3>
              
              {selectedKpi.invite && (
                <div style={{ marginBottom: "1.5rem", backgroundColor: "white", padding: "1rem", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "600", color: "#333" }}>1️⃣ 초대 (Invite)</span>
                    <span style={{ fontWeight: "700", backgroundColor: "#f3f4f6", padding: "0.3rem 0.8rem", borderRadius: "4px", color: "#1f2937" }}>
                      {selectedKpi.invite.rate.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.75rem" }}>
                    목표: {selectedKpi.invite.target.toLocaleString()} | 달성: {selectedKpi.invite.current.toLocaleString()}
                  </div>
                  <div style={{ width: "100%", height: "24px", backgroundColor: "#e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
                    <div 
                      style={{ 
                        height: "100%", 
                        width: `${Math.min(selectedKpi.invite.rate, 100)}%`,
                        backgroundColor: "#3b82f6",
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>
                </div>
              )}

              {selectedKpi.shipment && (
                <div style={{ marginBottom: "1.5rem", backgroundColor: "white", padding: "1rem", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "600", color: "#333" }}>2️⃣ 출고 (Shipment)</span>
                    <span style={{ fontWeight: "700", backgroundColor: "#f3f4f6", padding: "0.3rem 0.8rem", borderRadius: "4px", color: "#1f2937" }}>
                      {selectedKpi.shipment.rate.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.75rem" }}>
                    목표: {selectedKpi.shipment.target.toLocaleString()} | 달성: {selectedKpi.shipment.current.toLocaleString()}
                  </div>
                  <div style={{ width: "100%", height: "24px", backgroundColor: "#e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
                    <div 
                      style={{ 
                        height: "100%", 
                        width: `${Math.min(selectedKpi.shipment.rate, 100)}%`,
                        backgroundColor: "#f59e0b",
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>
                </div>
              )}

              {selectedKpi.video && (
                <div style={{ marginBottom: "0", backgroundColor: "white", padding: "1rem", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "600", color: "#333" }}>3️⃣ 영상 (Video)</span>
                    <span style={{ fontWeight: "700", backgroundColor: "#f3f4f6", padding: "0.3rem 0.8rem", borderRadius: "4px", color: "#1f2937" }}>
                      {selectedKpi.video.rate.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.75rem" }}>
                    목표: {selectedKpi.video.target.toLocaleString()} | 달성: {selectedKpi.video.current.toLocaleString()}
                  </div>
                  <div style={{ width: "100%", height: "24px", backgroundColor: "#e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
                    <div 
                      style={{ 
                        height: "100%", 
                        width: `${Math.min(selectedKpi.video.rate, 100)}%`,
                        backgroundColor: "#8b5cf6",
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <ProductDetailChart series={selected.dailySeries} />
        </div>
      )}

      {!query && !selected && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <div className={styles.emptyText}>제품명, PID, SKU를 입력해서 검색해보세요</div>
          <div className={styles.emptyCount}>총 {products.length}개 제품</div>
        </div>
      )}
    </div>
  );
}
