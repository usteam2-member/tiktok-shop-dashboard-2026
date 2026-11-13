// 지역(미국·영국) 설정 — 두 파일 모두 같은 양식의 탭을 갖고 있고, 탭 gid만 다름
//  주소에 ?region=uk 가 있으면 영국, 없으면 미국

import { useSearchParams } from "next/navigation";

export type RegionKey = "us" | "uk";

export interface Region {
  key: RegionKey;
  label: string;
  flag: string;
  sheetId: string;
  dailyGid: string;    // GMV | Daily
  productGid: string;  // GMV | by Product
  sojaeGid: string;    // GMV | 소재
  gmaxGid: string;     // Gmax ads | by Product
  targetGid?: string;  // 매출 목표 (보고 > 월 목표)
  targetOpts?: { lastRow?: number; stopAtBlank?: boolean };
  currency: string;    // 현지 통화 (객단가 표시용)
  symbol: string;
  minDate?: string;    // 이 날짜("YYYYMMDD") 이전 일별 행은 무시 (영국 파일 위쪽에 미국 25년 데이터가 남아 있음)
  hasKpi: boolean;     // KPI 트랙킹 시트 연결 여부
}

export const REGIONS: Region[] = [
  {
    key: "us", label: "미국", flag: "🇺🇸",
    sheetId: "1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24",
    dailyGid: "1032420248", productGid: "1578364048", sojaeGid: "367495503", gmaxGid: "799909766",
    targetGid: "275604972",
    currency: "USD", symbol: "$", hasKpi: true,
  },
  {
    key: "uk", label: "영국", flag: "🇬🇧",
    sheetId: "1uwrbiCPg7OG7N38ZlYfClHeVD0gBI7RIeWLzpH7_hak",
    dailyGid: "0", productGid: "1578364048", sojaeGid: "803923784", gmaxGid: "1368594297",
    targetGid: "556675240", targetOpts: { stopAtBlank: true },
    currency: "GBP", symbol: "£", minDate: "20260101", hasKpi: false,
  },
];

export function regionOf(key: string | null | undefined): Region {
  return REGIONS.find(r => r.key === key) || REGIONS[0];
}

export function useRegion(): Region {
  const sp = useSearchParams();
  return regionOf(sp.get("region"));
}

export function sheetCsvUrl(sheetId: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

// 다른 페이지로 갈 때 지역 유지: 미국은 파라미터 없이, 영국은 ?region=uk
export function withRegion(path: string, region: Region, params?: URLSearchParams) {
  const p = new URLSearchParams(params);
  if (region.key !== "us") p.set("region", region.key); else p.delete("region");
  const q = p.toString();
  return q ? `${path}?${q}` : path;
}
