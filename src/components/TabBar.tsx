"use client";
import { useRouter, usePathname } from "next/navigation";
import { regionOf, useRegion, withRegion, RegionKey } from "@/lib/region";

// 미국·영국 대시보드와 제품별 상세정보를 지역별로 나눠서 나란히 표시
const TABS: { icon: string; label: string; href: string; region: RegionKey }[] = [
  { icon: "🇺🇸", label: "미국 대시보드", href: "/dashboard", region: "us" },
  { icon: "🇬🇧", label: "영국 대시보드", href: "/dashboard", region: "uk" },
  { icon: "🔍", label: "미국 제품별 상세정보", href: "/dashboard/products", region: "us" },
  { icon: "🔍", label: "영국 제품별 상세정보", href: "/dashboard/products", region: "uk" },
];

interface Props {
  activeTab?: string;
}

export default function TabBar({ activeTab }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const region = useRegion(); // 지금 보고 있는 지역 (활성 탭 표시용)

  return (
    <div style={{ display: "flex", borderBottom: "3px solid #e5e7eb", background: "var(--card)", padding: "0" }}>
      {TABS.map((t) => {
        let isActive = false;
        
        if (activeTab) {
          isActive = activeTab === t.label;
        } else {
          // 더 구체적인 경로부터 확인 (순서 중요!)
          if (t.href === "/dashboard/products") {
            isActive = (pathname === "/dashboard/products" || pathname.startsWith("/dashboard/products/")) && t.region === region.key;
          } else if (t.href === "/dashboard") {
            // /dashboard 정확히 + 보고 있는 지역
            isActive = pathname === "/dashboard" && t.region === region.key;
          }
        }
        
        return (
          <div
            key={t.label}
            onClick={() => router.push(withRegion(t.href, regionOf(t.region)))}
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
            </span>
          </div>
        );
      })}
    </div>
  );
}
