"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";

interface KpiItem {
  pid: string;
  product: string;
  invite: { target: number; current: number; rate: number };
  shipment: { target: number; current: number; rate: number };
  video: { target: number; current: number; rate: number };
  avgRate: number;
}

export default function KpiTrackingPage() {
  const [kpiData, setKpiData] = useState<KpiItem[]>([]);
  const [filteredData, setFilteredData] = useState<KpiItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kpi")
      .then(r => r.json())
      .then(d => {
        const items: KpiItem[] = Object.entries(d.kpi || {}).map(([pid, data]: any) => {
          const avgRate = (data.invite.rate + data.shipment.rate + data.video.rate) / 3;
          return {
            pid,
            product: data.product,
            invite: data.invite,
            shipment: data.shipment,
            video: data.video,
            avgRate,
          };
        });
        setKpiData(items);
        setFilteredData(items);
        setLoading(false);
      })
      .catch(() => {
        setKpiData([]);
        setFilteredData([]);
        setLoading(false);
      });
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setFilteredData(kpiData);
    } else {
      const filtered = kpiData.filter(item =>
        item.product.toLowerCase().includes(value.toLowerCase()) ||
        item.pid.includes(value)
      );
      setFilteredData(filtered);
    }
  };

  // TOP 5 (달성도 높은 순)
  const top5 = [...kpiData].sort((a, b) => b.avgRate - a.avgRate).slice(0, 5);

  // URGENT (달성도 낮은 순)
  const urgent = [...kpiData].sort((a, b) => a.avgRate - b.avgRate).slice(0, 5);

  if (loading) {
    return <div className={styles.container}>로딩 중...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🎯 주력 제품 KPI 트래킹</h1>

      {/* 검색창 */}
      <div className={styles.searchBox}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.searchInput}
          placeholder="제품명 또는 PID로 검색..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
        />
        {query && (
          <button className={styles.clearBtn} onClick={() => handleSearch("")}>
            ✕
          </button>
        )}
      </div>

      {/* 검색 결과 */}
      {query && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🔍 검색 결과 ({filteredData.length}개)</h2>
          <div className={styles.productGrid}>
            {filteredData.map(item => (
              <KpiCard key={item.pid} item={item} />
            ))}
          </div>
          {filteredData.length === 0 && (
            <div className={styles.noResult}>검색 결과가 없습니다</div>
          )}
        </div>
      )}

      {!query && (
        <>
          {/* TOP 5 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>📈 TOP 5 (달성도 높은 순)</h2>
            <div className={styles.productGrid}>
              {top5.map(item => (
                <KpiCard key={item.pid} item={item} />
              ))}
            </div>
          </div>

          {/* URGENT */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>🔴 URGENT (달성도 낮은 순)</h2>
            <div className={styles.productGrid}>
              {urgent.map(item => (
                <KpiCard key={item.pid} item={item} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ item }: { item: KpiItem }) {
  const getRateColor = (rate: number) => {
    if (rate >= 80) return "#10b981";
    if (rate >= 50) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.productName}>{item.product}</div>
          <div className={styles.productPid}>PID: {item.pid}</div>
        </div>
        <div className={styles.avgRate} style={{ color: getRateColor(item.avgRate) }}>
          {item.avgRate.toFixed(1)}%
        </div>
      </div>

      <div className={styles.kpiRow}>
        <div className={styles.kpiLabel}>초대</div>
        <div className={styles.kpiBar}>
          <div
            className={styles.kpiBarFill}
            style={{ width: `${Math.min(item.invite.rate, 100)}%`, backgroundColor: "#3b82f6" }}
          />
        </div>
        <span className={styles.kpiPercent}>{item.invite.rate.toFixed(0)}%</span>
      </div>

      <div className={styles.kpiRow}>
        <div className={styles.kpiLabel}>출고</div>
        <div className={styles.kpiBar}>
          <div
            className={styles.kpiBarFill}
            style={{ width: `${Math.min(item.shipment.rate, 100)}%`, backgroundColor: "#f59e0b" }}
          />
        </div>
        <span className={styles.kpiPercent}>{item.shipment.rate.toFixed(0)}%</span>
      </div>

      <div className={styles.kpiRow}>
        <div className={styles.kpiLabel}>영상</div>
        <div className={styles.kpiBar}>
          <div
            className={styles.kpiBarFill}
            style={{ width: `${Math.min(item.video.rate, 100)}%`, backgroundColor: "#8b5cf6" }}
          />
        </div>
        <span className={styles.kpiPercent}>{item.video.rate.toFixed(0)}%</span>
      </div>
    </div>
  );
}
