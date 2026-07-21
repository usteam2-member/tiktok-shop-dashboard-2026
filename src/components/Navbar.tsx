"use client";
import { useRouter, usePathname } from "next/navigation";

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
    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
      {TABS.map((t) => {
        let isActive = false;
        if (activeTab) {
          isActive = activeTab === t.label;
        } else {
          if (t.href === "/dashboard") {
            isActive = pathname === "/dashboard";
          } else {
            isActive = pathname.startsWith(t.href);
          }
        }
        return (
          <div
            key={t.label}
            onClick={() => router.push(t.href)}
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--text)" : "var(--muted)",
              borderBottom: isActive ? "2px solid #3b82f6" : "none",
              transition: "all 0.2s",
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}
