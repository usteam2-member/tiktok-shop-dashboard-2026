"use client";
import styles from "./Navbar.module.css";

interface NavbarProps {
  startDate: string;
  endDate: string;
}

export default function Navbar({ startDate, endDate }: NavbarProps) {
  return (
    <nav className={styles.nav}>
      <div className={styles.left}>
        <span className={styles.title}>TikTok Shop 매출 대시보드</span>
        <span className={styles.sub}>
          전체 데이터: 2026-01-01 ~ 2026-07-31&nbsp;&nbsp;
          <span className={styles.range}>조회 기간: {startDate} ~ {endDate}</span>
        </span>
      </div>
      <div className={styles.right}>
        <span className={styles.pill + " " + styles.prime}>● 성분에디터</span>
        <span className={styles.pill}>샵 분석</span>
        <span className={styles.pill}>제품별</span>
        <span className={styles.pill}>소재</span>
        <button className={styles.btn}>+ 리포트 내보내기</button>
      </div>
    </nav>
  );
}
