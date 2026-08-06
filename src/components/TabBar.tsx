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
    <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", background: "var(--card)" }}>
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
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "#1f2937" : "#94a3b8",
              background: isActive ? "#f0f9ff" : "transparent",
              borderBottom: isActive ? "3px solid #3b82f6" : "none",
              transition: "all 0.3s ease",
              boxShadow: isActive ? "0 2px 8px rgba(59, 130, 246, 0.1)" : "none",
              position: "relative",
            }}
          >
            <span style={{ fontSize: "16px" }}>{t.icon}</span>
            <span>{t.label}</span>
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  bottom: "-2px",
                  left: "0",
                  right: "0",
                  height: "3px",
                  background: "#3b82f6",
                  borderRadius: "2px 2px 0 0",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
