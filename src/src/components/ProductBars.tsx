"use client";
import { ProductRow } from "@/lib/data";
import styles from "./ProductBars.module.css";
import cardStyles from "./ChartCard.module.css";

interface Props { data: ProductRow[]; }

export default function ProductBars({ data }: Props) {
  if (!data.length) return null;
  const max = data[0].total;
  return (
    <div className={cardStyles.card}>
      <div className={cardStyles.header}>
        <div className={cardStyles.title}>제품별 누적 매출 TOP 15</div>
        <span className={styles.badge}>2026 전체</span>
      </div>
      <div className={styles.list}>
        {data.map((p, i) => (
          <div key={p.name} className={styles.row}>
            <span className={styles.rank}>{i + 1}</span>
            <span className={styles.name} title={p.name}>{p.name}</span>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${(p.total / max) * 100}%`, opacity: 1 - i * 0.035 }} />
            </div>
            <span className={styles.val}>₩{(p.total / 1e6).toFixed(0)}M</span>
          </div>
        ))}
      </div>
    </div>
  );
}
