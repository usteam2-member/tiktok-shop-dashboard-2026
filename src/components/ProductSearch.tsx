"use client";
import { useState } from "react";
import { ProductItem } from "@/lib/useSheetData";
import ProductDetailChart from "@/components/ProductDetailChart";
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

      {/* 검색 결과 목록 */}
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

      {/* 상세 보기 */}
      {selected && (
        <div className={styles.detail}>
          <button className={styles.back} onClick={() => setSelected(null)}>← 목록으로</button>
          <div className={styles.detailHeader}>
            <h2 className={styles.detailName}>{selected.name}</h2>
            {selected.pid && <div className={styles.detailMeta}>PID: {selected.pid}</div>}
            {selected.sku && <div className={styles.detailMeta}>SKU: {selected.sku}</div>}
          </div>

          {/* KPI 카드 */}
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

          {/* 목표 vs 달성 KPI 테이블 */}
          {selected.kpi && (
            <div className={styles.kpiSection}>
              <h3 className={styles.kpiSectionTitle}>📊 목표 vs 달성 현황</h3>
              <div className={styles.kpiTableWrap}>
                {/* 초대 */}
                <div className={styles.kpiTable}>
                  <div className={styles.kpiTableHeader}>1️⃣ 초대</div>
                  <div className={styles.kpiTableBody}>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>목표</div>
                      <div className={styles.kpiTableValue}>{selected.kpi.invite.target.toLocaleString()}</div>
                    </div>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>달성</div>
                      <div className={styles.kpiTableValue}>{selected.kpi.invite.current.toLocaleString()}</div>
                    </div>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>달성률</div>
                      <div className={`${styles.kpiTableValue} ${styles.kpiTableRate}`}>
                        {selected.kpi.invite.rate.toFixed(1)}%
                      </div>
                    </div>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>초/부족</div>
                      <div className={`${styles.kpiTableValue} ${selected.kpi.invite.diff >= 0 ? styles.positive : styles.negative}`}>
                        {selected.kpi.invite.diff > 0 ? '+' : ''}{selected.kpi.invite.diff.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 출고 */}
                <div className={styles.kpiTable}>
                  <div className={styles.kpiTableHeader}>2️⃣ 출고</div>
                  <div className={styles.kpiTableBody}>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>목표</div>
                      <div className={styles.kpiTableValue}>{selected.kpi.shipment.target.toLocaleString()}</div>
                    </div>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>달성</div>
                      <div className={styles.kpiTableValue}>{selected.kpi.shipment.current.toLocaleString()}</div>
                    </div>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>출고율</div>
                      <div className={`${styles.kpiTableValue} ${styles.kpiTableRate}`}>
                        {selected.kpi.shipment.rate.toFixed(1)}%
                      </div>
                    </div>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>초/부족</div>
                      <div className={`${styles.kpiTableValue} ${selected.kpi.shipment.diff >= 0 ? styles.positive : styles.negative}`}>
                        {selected.kpi.shipment.diff > 0 ? '+' : ''}{selected.kpi.shipment.diff.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 영상 */}
                <div className={styles.kpiTable}>
                  <div className={styles.kpiTableHeader}>3️⃣ 영상</div>
                  <div className={styles.kpiTableBody}>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>목표</div>
                      <div className={styles.kpiTableValue}>{selected.kpi.video.target.toLocaleString()}</div>
                    </div>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>달성</div>
                      <div className={styles.kpiTableValue}>{selected.kpi.video.current.toLocaleString()}</div>
                    </div>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>달성률</div>
                      <div className={`${styles.kpiTableValue} ${styles.kpiTableRate}`}>
                        {selected.kpi.video.rate.toFixed(1)}%
                      </div>
                    </div>
                    <div className={styles.kpiTableRow}>
                      <div className={styles.kpiTableLabel}>완료 여부</div>
                      <div className={`${styles.kpiTableValue} ${selected.kpi.video.completed === 'O' ? styles.completed : styles.incomplete}`}>
                        {selected.kpi.video.completed === 'O' ? '✅ 완료' : '⏳ 진행중'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 추이 차트 */}
          <ProductDetailChart series={selected.dailySeries} />
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
