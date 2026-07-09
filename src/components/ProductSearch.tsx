"use client";
import { useState } from "react";
import { ProductItem } from "@/lib/useSheetData";
import styles from "./ProductSearch.module.css";

interface Props {
  products: ProductItem[];
}

export default function ProductSearch({ products }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProductItem | null>(null);

  const filtered = query.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.pid.includes(query) ||
        p.sku.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className={styles.wrap}>
      {/* 검색창 */}
      <div className={styles.searchBox}>
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

      {/* 검색 결과 목록 */}
      {!selected && filtered.length > 0 && (
        <div className={styles.resultList}>
          {filtered.map(p => (
            <div key={p.name} className={styles.resultRow} onClick={() => setSelected(p)}>
              <div className={styles.resultName}>{p.name}</div>
              <div className={styles.resultMeta}>
                <span>7일 주문: <b>{p.ord7.toLocaleString()}</b></span>
                <span>이번달 주문: <b>{p.ordThisMonth.toLocaleString()}</b></span>
                <span>이번달 샘플: <b>{p.smpThisMonth.toLocaleString()}</b></span>
              </div>
              {p.sku && <div className={styles.resultSku}>SKU: {p.sku} {p.pid && `· PID: ${p.pid.slice(0,8)}...`}</div>}
            </div>
          ))}
        </div>
      )}

      {!selected && query && filtered.length === 0 && (
        <div className={styles.noResult}>검색 결과가 없어요 😅</div>
      )}

      {/* 상세 보기 */}
      {selected && (
        <div className={styles.detail}>
          <button className={styles.back} onClick={() => setSelected(null)}>← 목록으로</button>
          <h2 className={styles.detailName}>{selected.name}</h2>
          {selected.sku && <div className={styles.detailMeta}>SKU: {selected.sku}</div>}
          {selected.pid && <div className={styles.detailMeta}>PID: {selected.pid}</div>}

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
        </div>
      )}

      {/* 초기 화면 */}
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
