"use client";
import { useState } from "react";
import { ProductRow } from "@/lib/data";
import ProductDetailChart from "@/components/ProductDetailChart";
import styles from "./ProductSearch.module.css";

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
                <div className={styles.resultName}>
                  <span style={{ marginRight: "6px", fontSize: "11px", color: "#94a3b8" }}>
                    {p.productType}
                  </span>
                  {p.name}
                </div>
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
            <h2 className={styles.detailName}>
              <span style={{ marginRight: "8px", fontSize: "14px", color: "#94a3b8" }}>
                {selected.productType}
              </span>
              {selected.name}
            </h2>
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
