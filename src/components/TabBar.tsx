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
    <div style={{ display: "flex", borderBottom: "3px solid #e5e7eb", background: "var(--card)", padding: "0" }}>
      {TABS.map((t) => {
        let isActive = false;
        
        if (activeTab) {
          isActive = activeTab === t.label;
        } else {
          // 더 구체적인 경로부터 확인 (순서 중요!)
          if (t.href === "/dashboard/products") {
            isActive = pathname === "/dashboard/products" || pathname.startsWith("/dashboard/products/");
          } else if (t.href === "/dashboard/kpi-tracking") {
            isActive = pathname === "/dashboard/kpi-tracking" || pathname.startsWith("/dashboard/kpi-tracking/");
          } else if (t.href === "/dashboard") {
            // /dashboard 정확히 (다른 것들과 겹치지 않게)
            isActive = pathname === "/dashboard";
          }
        }
        
        return (
          <div
            key={t.label}
            onClick={() => router.push(t.href)}
            style={{
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: isActive ? 800 : 500,
              color: isActive ? "#1f2937" : "#b0b9c3",
              background: isActive ? "#eff6ff" : "transparent",
              borderBottom: isActive ? "4px solid #3b82f6" : "none",
              transition: "all 0.3s ease",
              boxShadow: isActive ? "inset 0 -4px 0 #3b82f6, 0 2px 8px rgba(59, 130, 246, 0.2)" : "none",
              marginBottom: isActive ? "-3px" : "0",
            }}
          >
            <span style={{ 
              fontSize: "18px",
              opacity: isActive ? 1 : 0.6,
              transition: "all 0.3s ease",
            }}>
              {t.icon}
            </span>
            <span style={{ 
              textShadow: isActive ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
            }}>
              {t.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
