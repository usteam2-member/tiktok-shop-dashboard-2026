"use client";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  startDate: string;
  endDate: string;
  activeQuick: number | null;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onQuick: (days: number | null) => void;
}

const QUICK = [
  { label: "3일", days: 3 },
  { label: "7일", days: 7 },
  { label: "30일", days: 30 },
  { label: "90일", days: 90 },
  { label: "전체", days: null },
];

export default function FilterBar({
  startDate, endDate, activeQuick,
  onStartChange, onEndChange, onQuick,
}: FilterBarProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        {QUICK.map((q) => (
          <button
            key={q.label}
            className={styles.quick + (activeQuick === q.days ? " " + styles.active : "")}
            onClick={() => onQuick(q.days)}
          >
            {q.label}
          </button>
        ))}
        <div className={styles.divider} />
        <input
          type="date"
          className={styles.dateInput}
          value={startDate}
          min="2026-01-01"
          max="2026-07-31"
          onChange={(e) => onStartChange(e.target.value)}
        />
        <span className={styles.sep}>~</span>
        <input
          type="date"
          className={styles.dateInput}
          value={endDate}
          min="2026-01-01"
          max="2026-07-31"
          onChange={(e) => onEndChange(e.target.value)}
        />
      </div>
      <div className={styles.right}>
        {startDate} ~ {endDate} · <strong>{days}일</strong>
      </div>
    </div>
  );
}
