"use client";
import styles from "./TabBar.module.css";

const TABS = [
  { icon: "📊", label: "대시보드" },
  { icon: "📦", label: "제품별 매출" },
  { icon: "📅", label: "월간 분석" },
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
