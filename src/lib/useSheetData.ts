import { useState, useEffect } from "react";
import { DailyRow, ProductRow, SojaeRow, ProductTop10Item, ProductDailySeries, getProductType, filterByRange } from "./data";

export interface SheetData {
  daily: DailyRow[];
  products: ProductRow[];
  productTop10ByPeriod: Record<string, ProductTop10Item[]>;
  sojae: SojaeRow[];
  updatedAt: string;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const cols: string[] = [];
    let inQuote = false;
    let cur = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function safeNum(v: string): number {
  const n = parseFloat(v.replace(/[,\s₩$%#]/g, ""));
  return isNaN(n) ? 0 : n;
}

async function fetchSheet(sheetId: string, gid: string) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch sheet ${gid}`);
  return parseCSV(await res.text());
}

function parseDailyData(rows: string[][]): DailyRow[] {
  if (rows.length < 3) return [];
  
  const result: DailyRow[] = [];
  
  // rows[0] = Row 1 (PID)
  // rows[1] = Row 4 (헤더)
  // rows[2]+ = Row 5+ (데이터)
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 10) continue;
    
    // B열 (row[1]) = 날짜 (YYMMDD 형식)
    let dt = row[1]?.trim();
    if (!dt || dt.length !== 6 || isNaN(parseInt(dt))) continue;
    
    // YYMMDD를 YYYYMMDD로 변환
    const yy = parseInt(dt.slice(0, 2));
    const mm = dt.slice(2, 4);
    const dd = dt.slice(4, 6);
    dt = `20${yy}${mm}${dd}`;
    
    // 열 인덱스 (0-based):
    // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, ..., M=12, ..., Q=16, R=17
    const totalRevenueUsd = safeNum(row[8] || "0");  // I열: 총 매출(USD)
    
    result.push({
      dt,
      aff: safeNum(row[4] || "0"),      // E열: affiliate_upload
      smp: safeNum(row[5] || "0"),      // F열: sample_orders
      ord: safeNum(row[6] || "0"),      // G열: orders
      krw: totalRevenueUsd,             // I열: 총 매출(USD) → krw 필드에 저장
      adCost: safeNum(row[12] || "0"),  // M열: GMV ads
      roas: safeNum(row[16] || "0"),    // Q열: ROAS
      unitPriceUsd: safeNum(row[17] || "0"), // R열: 객단가(USD)
    });
  }
  
  // 📌 총 매출(USD)이 0이 아닌 마지막 행까지만 필터링
  let lastValidIdx = -1;
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].krw > 0) {  // krw에 USD 값이 저장되어 있음
      lastValidIdx = i;
      break;
    }
  }
  
  if (lastValidIdx >= 0) {
    const filtered = result.slice(0, lastValidIdx + 1);
    console.log(`📊 Daily data: ${filtered.length} days, First: ${filtered[0].dt}, Last: ${filtered[lastValidIdx].dt}`);
    return filtered;
  }
  
  return result;
}

function parseProductData(rows: string[][]): ProductRow[] {
  if (rows.length < 5) return [];
  
  // Row 1 (index 0): 상품코드들 (D, G, J, M, P, S, V, ... 3열씩)
  // Row 2 (index 1): 각 상품코드별 헤더 (매출액(KRW), 주문수, 생품출고, ...)
  // Row 4 (index 3): 제품명들
  // Row 5+ (index 4+): 데이터
  
  const headerRow = rows[0]; // 상품코드 행
  const productNameRow = rows[3]; // 제품명 행 (Row 4)
  
  // D열(index 3)부터 시작, 3열씩 반복 (D, G, J, M, P, S, V, ...)
  const products: Record<string, ProductRow> = {};
  
  // 상품코드 추출 (D, G, J, M, P, S, V, ... 위치)
  for (let colIdx = 3; colIdx < headerRow.length; colIdx += 3) {
    const sku = headerRow[colIdx]?.trim();
    if (!sku || sku === "") continue;
    
    // 같은 열에서 제품명 가져오기 (Row 4)
    const productName = productNameRow[colIdx]?.trim() || sku;
    
    // 이 상품코드의 매출액 열 인덱스는 colIdx (매출액(KRW)가 첫 번째)
    const revenueColIdx = colIdx;
    
    // Row 5부터 (index 4부터) 데이터 합산
    let totalRevenue = 0;
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length <= revenueColIdx) continue;
      totalRevenue += safeNum(row[revenueColIdx] || "0");
    }
    
    if (totalRevenue === 0) continue; // 매출이 0이면 스킵
    
    const productType = getProductType(sku);
    const displayName = `${productName} ${productType}`.trim();
    
    products[sku] = {
      name: displayName,
      pid: sku,
      sku,
      productType,
      totalRevenue,
      ordToday: 0,
      ord7: 0,
      ord30: 0,
      ordThisMonth: 0,
      smpThisMonth: 0,
      newSojae: 0,
      revSojae: 0,
      dailySeries: [],
    };
  }

  return Object.values(products).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function parseSojaeData(rows: string[][]): SojaeRow[] {
  if (rows.length < 2) return [];
  const result: SojaeRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;
    const dt = row[0]?.trim();
    const name = row[1]?.trim();
    if (!dt || !name) continue;
    result.push({
      dt,
      name,
      count: safeNum(row[2]),
      revenue: safeNum(row[3]),
    });
  }
  return result;
}

export function useSheetData() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const dailyRows = await fetchSheet("1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24", "0");
        const daily = parseDailyData(dailyRows);

        // Product 데이터는 선택적으로 로드
        let products: ProductRow[] = [];
        try {
          const productRows = await fetchSheet("1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24", "1578364048");
          products = parseProductData(productRows);
        } catch (err) {
          console.warn("Product sheet loading failed, using empty array");
          products = [];
        }

        // Sojae 데이터도 선택적으로 로드
        let sojae: SojaeRow[] = [];
        try {
          const sojaeRows = await fetchSheet("1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24", "367495503");
          sojae = parseSojaeData(sojaeRows);
        } catch (err) {
          console.warn("Sojae sheet loading failed, using empty array");
          sojae = [];
        }

        // 제품별 일일 매출 데이터 로드
        let productDailyRows: string[][] = [];
        try {
          productDailyRows = await fetchSheet("1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24", "1578364048");
        } catch (err) {
          console.warn("Product daily sheet loading failed");
        }

        // 제품별 일일 매출 데이터 파싱
        const parseProductDailyData = () => {
          if (productDailyRows.length < 6) return {};
          
          // Row 3 (index 2): 상품코드 (D, G, J, M 등 3열씩)
          // Row 4 (index 3): 제품명
          // Row 5 (index 4): 헤더
          // Row 6+ (index 5+): 일일 데이터
          
          const codeRow = productDailyRows[2];
          const nameRow = productDailyRows[3];
          
          const productDaily: Record<string, { name: string; revenue1: number; revenue7: number; revenue30: number; revenue90: number; revenueAll: number; orders1: number; orders7: number; orders30: number; orders90: number; ordersAll: number }> = {};
          
          // D, G, J, M 등 3열씩 추출
          for (let colIdx = 3; colIdx < codeRow.length; colIdx += 3) {
            const sku = codeRow[colIdx]?.trim();
            if (!sku || sku === "") continue;
            
            const name = nameRow[colIdx]?.trim() || sku;
            const productType = getProductType(sku);
            const displayName = `${name} ${productType}`.trim();
            
            const revenueColIdx = colIdx; // 매출액(KRW) 열
            const ordersColIdx = colIdx + 1; // 주문수 열 (매출액 다음)
            
            let rev1 = 0, rev7 = 0, rev30 = 0, rev90 = 0, revAll = 0;
            let ord1 = 0, ord7 = 0, ord30 = 0, ord90 = 0, ordAll = 0;
            
            // Row 6부터 (index 5부터) 데이터
            for (let i = 5; i < productDailyRows.length; i++) {
              const row = productDailyRows[i];
              if (!row || row.length <= revenueColIdx) continue;
              
              const revenue = safeNum(row[revenueColIdx] || "0");
              const orders = safeNum(row[ordersColIdx] || "0");
              
              revAll += revenue;
              ordAll += orders;
              
              // 마지막 1일, 7일, 30일, 90일 계산 (역순)
              const daysFromEnd = productDailyRows.length - i - 1;
              if (daysFromEnd === 0) {
                rev1 += revenue;
                ord1 += orders;
              }
              if (daysFromEnd < 7) {
                rev7 += revenue;
                ord7 += orders;
              }
              if (daysFromEnd < 30) {
                rev30 += revenue;
                ord30 += orders;
              }
              if (daysFromEnd < 90) {
                rev90 += revenue;
                ord90 += orders;
              }
            }
            
            productDaily[sku] = {
              name: displayName,
              revenue1: rev1,
              revenue7: rev7,
              revenue30: rev30,
              revenue90: rev90,
              revenueAll: revAll,
              orders1: ord1,
              orders7: ord7,
              orders30: ord30,
              orders90: ord90,
              ordersAll: ordAll,
            };
          }
          
          return productDaily;
        };
        
        const productDaily = parseProductDailyData();

        // 제품별 TOP 10 (기간별)
        const generateTop10 = (days: number | null): ProductTop10Item[] => {
          const entries = Object.entries(productDaily);
          if (entries.length === 0) return [];
          
          let revenueKey: keyof typeof productDaily[string];
          let ordersKey: keyof typeof productDaily[string];
          
          if (days === 1) {
            revenueKey = "revenue1";
            ordersKey = "orders1";
          } else if (days === 7) {
            revenueKey = "revenue7";
            ordersKey = "orders7";
          } else if (days === 30) {
            revenueKey = "revenue30";
            ordersKey = "orders30";
          } else if (days === 90) {
            revenueKey = "revenue90";
            ordersKey = "orders90";
          } else {
            revenueKey = "revenueAll";
            ordersKey = "ordersAll";
          }
          
          return entries
            .map(([sku, data]) => ({
              name: data.name,
              pid: sku,
              sku,
              productType: getProductType(sku),
              revenue: data[revenueKey],
              orders: data[ordersKey],
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        };

        const productTop10ByPeriod = {
          "1": generateTop10(1),
          "7": generateTop10(7),
          "30": generateTop10(30),
          "90": generateTop10(90),
          "all": generateTop10(null),
        };

        setData({
          daily,
          products,
          productTop10ByPeriod,
          sojae,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { data, loading, error };
}

export interface Props {
  products: ProductRow[];
}

export type { DailyRow, ProductRow, SojaeRow, ProductTop10Item, ProductDailySeries };
