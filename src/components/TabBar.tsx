"use client";
import { useRouter, usePathname } from "next/navigation";
import styles from "./TabBar.module.css";

const TABS = [
  { icon: "📊", label: "대시보드", href: "/dashboard" },
  { icon: "🔍", label: "제품별 상세정보", href: "/dashboard/products" },
{ icon: "🎯", label: "주력 제품 KPI 트래킹", href: "/dashboard/kpi-tracking" },
];

interface Props {
  activeTab?: string;
}

export default function TabBar({ activeTab }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className={styles.bar}>
      {TABS.map((t) => {
        let isActive = false;
        if (activeTab) {
          isActive = activeTab === t.label;
        } else {
          isActive = pathname === t.href;
        }
        return (
          <div
            key={t.label}
            className={styles.tab + (isActive ? " " + styles.active : "")}
            onClick={() => router.push(t.href)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}
