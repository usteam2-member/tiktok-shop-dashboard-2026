"use client";
import { usePathname, useRouter } from "next/navigation";
import { REGIONS, useRegion, withRegion } from "@/lib/region";

interface Props {
  startDate: string;
  endDate: string;
}

export default function Navbar({ startDate, endDate }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const region = useRegion();

  return (
    <div style={{ background: "#1f2937", color: "white", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0" }}>TikTok Shop 매출 대시보드 · {region.flag} {region.label}</h1>
        <div style={{ fontSize: "12px", color: "#d1d5db" }}>조회 기간: {startDate} ~ {endDate}</div>
      </div>
      <div style={{ display: "flex", gap: "12px", fontSize: "12px", alignItems: "center" }}>
        {/* 지역 전환: 같은 화면을 미국 / 영국 시트로 (기간은 그 지역 기본값으로 다시 시작) */}
        <div style={{ display: "flex", background: "#374151", borderRadius: "6px", padding: "3px", gap: "3px" }}>
          {REGIONS.map(r => {
            const active = r.key === region.key;
            return (
              <button
                key={r.key}
                onClick={() => { if (!active) router.push(withRegion(pathname, r)); }}
                style={{
                  padding: "5px 12px", border: "none", borderRadius: "4px", cursor: active ? "default" : "pointer",
                  background: active ? "white" : "transparent", color: active ? "#1f2937" : "#d1d5db",
                  fontWeight: active ? 700 : 500, fontSize: "12px",
                }}
              >
                {r.flag} {r.label}
              </button>
            );
          })}
        </div>
        <button style={{ padding: "6px 12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>설정/에디터</button>
        <button style={{ padding: "6px 12px", background: "#6b7280", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>삼 문서</button>
        <button style={{ padding: "6px 12px", background: "#6b7280", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>재공할</button>
        <button style={{ padding: "6px 12px", background: "#6b7280", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>소개</button>
      </div>
    </div>
  );
}
