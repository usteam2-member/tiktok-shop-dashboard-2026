"use client";
import { ProductRow } from "@/lib/data";
import styles from "./ProductBars.module.css";
import cardStyles from "./ChartCard.module.css";

interface Props {
  data: ProductRow[];
}

export default function ProductBars({ data }: Props) {
  if (!data.length) return null;
  
  // 매출 기준 TOP 15
  const top15 = data.slice(0, 15);
  const max = top15[0]?.totalRevenue || 1;

  return (
    <div className={cardStyles.card}>
      <div className={cardStyles.header}>
        <div className={cardStyles.title}>제품별 누적 매출 TOP 15</div>
        <span className={styles.badge}>2026 전체</span>
      </div>
      <div className={styles.list}>
        {top15.map((p, i) => (
          <div key={p.name} className={styles.row}>
            <span className={styles.rank}>
              {i === 0 && "🥇"}
              {i === 1 && "🥈"}
              {i === 2 && "🥉"}
              {i > 2 && i + 1}
            </span>
            <div className={styles.nameContainer}>
              <span className={styles.productType}>{p.productType}</span>
              <span className={styles.name} title={p.name}>{p.name}</span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{
                  width: `${(p.totalRevenue / max) * 100}%`,
                  opacity: 1 - i * 0.035,
                }}
              />
            </div>
            <span className={styles.val}>₩{(p.totalRevenue / 1e6).toFixed(0)}M</span>
          </div>
        ))}
      </div>
    </div>
  );
}
