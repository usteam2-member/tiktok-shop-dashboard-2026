"use client";
import styles from "./TabBar.module.css";

const TABS = [
  { icon: "📊", label: "대시보드" },
  { icon: "📦", label: "제품별 매출" },
  { icon: "👤", label: "크리에이터" },
  { icon: "🎬", label: "소재 분석" },
  { icon: "📍", label: "지역별" },
  { icon: "📅", label: "월간 분석" },
  { icon: "📋", label: "데일리 리포트" },
];

export default function TabBar() {
  return (
    <div className={styles.bar}>
      {TABS.map((t, i) => (
        <div key={t.label} className={styles.tab + (i === 0 ? " " + styles.active : "")}>
          <span>{t.icon}</span>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}
