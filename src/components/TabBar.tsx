"use client";
import { useRouter, usePathname } from "next/navigation";
import { regionOf, useRegion, withRegion, RegionKey } from "@/lib/region";

// 미국 대시보드 · 영국 대시보드를 나란히 두고, 제품별 상세정보는 보고 있던 지역 그대로 이동
const TABS: { icon: string; label: string; href: string; region?: RegionKey }[] = [
  { icon: "🇺🇸", label: "미국 대시보드", href: "/dashboard", region: "us" },
  { icon: "🇬🇧", label: "영국 대시보드", href: "/dashboard", region: "uk" },
  { icon: "🔍", label: "제품별 상세정보", href: "/dashboard/products" },
];

interface Props {
  activeTab?: string;
}

export default function TabBar({ activeTab }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const region = useRegion(); // 페이지를 옮겨도 지역 유지

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
          } else if (t.href === "/dashboard") {
            // /dashboard 정확히 + 보고 있는 지역
            isActive = pathname === "/dashboard" && t.region === region.key;
          }
        }
        
        return (
          <div
            key={t.label}
            onClick={() => router.push(withRegion(t.href, t.region ? regionOf(t.region) : region))}
            style={{
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              fontSize: "14px",
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
              {/* 제품별 상세정보는 어느 지역 데이터인지 표시 */}
              {!t.region && <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 600, color: isActive ? "#3b82f6" : "#b0b9c3" }}>{region.flag} {region.label}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
