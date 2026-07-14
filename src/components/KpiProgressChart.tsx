"use client";
import styles from "./KpiProgressChart.module.css";

interface KpiMetric {
  target: number;
  current: number;
  rate: number;
}

interface Props {
  invite: KpiMetric;
  shipment: KpiMetric;
  video: KpiMetric;
}

export default function KpiProgressChart({ invite, shipment, video }: Props) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>📊 KPI 목표 vs 달성 현황</h3>
      
      <div className={styles.kpiItems}>
        {/* 초대 */}
        <div className={styles.kpiItem}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>1️⃣ 초대 (Invite)</span>
            <span className={styles.kpiRate}>{invite.rate.toFixed(1)}%</span>
          </div>
          <div className={styles.kpiInfo}>
            <span>목표: {invite.target.toLocaleString()}</span>
            <span>달성: {invite.current.toLocaleString()}</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${Math.min(invite.rate, 100)}%`, backgroundColor: "#3b82f6" }}
            />
          </div>
        </div>

        {/* 출고 */}
        <div className={styles.kpiItem}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>2️⃣ 출고 (Shipment)</span>
            <span className={styles.kpiRate}>{shipment.rate.toFixed(1)}%</span>
          </div>
          <div className={styles.kpiInfo}>
            <span>목표: {shipment.target.toLocaleString()}</span>
            <span>달성: {shipment.current.toLocaleString()}</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${Math.min(shipment.rate, 100)}%`, backgroundColor: "#f59e0b" }}
            />
          </div>
        </div>

        {/* 영상 */}
        <div className={styles.kpiItem}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>3️⃣ 영상 (Video)</span>
            <span className={styles.kpiRate}>{video.rate.toFixed(1)}%</span>
          </div>
          <div className={styles.kpiInfo}>
            <span>목표: {video.target.toLocaleString()}</span>
            <span>달성: {video.current.toLocaleString()}</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${Math.min(video.rate, 100)}%`, backgroundColor: "#8b5cf6" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
