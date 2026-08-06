import { useState, useEffect } from "react";
import { DailyRow, ProductRow, SojaeRow, ProductTop10Item, ProductDailySeries, getProductType, filterByRange } from "./data";

export interface SheetData {
  daily: DailyRow[];
  products: ProductRow[];
  productTop10ByPeriod: Record<string, { revenue: ProductTop10Item[]; orders: ProductTop10Item[] }>;
  sojae: SojaeRow[];
  anomaliesByDate: Record<string, {
    increases: Array<{ name: string; sku: string; yesterday: number; today: number; changePercent: number }>;
    decreases: Array<{ name: string; sku: string; yesterday: number; today: number; changePercent: number }>;
  }>;
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
    
    const totalRevenueUsd = safeNum(row[8] || "0");

    result.push({
      dt,
      aff: safeNum(row[4] || "0"),
      smp: safeNum(row[5] || "0"),
      ord: safeNum(row[6] || "0"),
      krw: totalRevenueUsd,
      adCost: safeNum(row[12] || "0"),
      roas: safeNum(row[16] || "0"),
      unitPriceUsd: safeNum(row[17] || "0"),
    });
  }
  
  let lastValidIdx = -1;
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].krw > 0) {
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
  if (rows.length < 2) return [];
  
  const headerRow = rows[0];
  const revenueColIdx = headerRow.findIndex(h => h.includes("매출액(KRW)"));
  if (revenueColIdx < 0) return [];

  const products: Record<string, ProductRow> = {};
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= revenueColIdx) continue;

    const pidCol = row[0]?.trim();
    if (!pidCol || pidCol.startsWith("합계")) continue;

    const sku = row[2]?.trim() || "";
    const name = row[0]?.trim() || "";
    const revenue = safeNum(row[revenueColIdx] || "0");
    
    if (!name) continue;

    const key = `${pidCol}-${name}`;
    const productType = getProductType(sku);
    const displayName = `${name} ${productType}`.trim();
    
    if (!products[key]) {
      products[key] = {
        name: displayName,
        pid: pidCol,
        sku,
        productType,
        totalRevenue: revenue,
        ordToday: 0,
        ord7: 0,
        ord30: 0,
        ordThisMonth: 0,
        smpThisMonth: 0,
        newSojae: 0,
        revSojae: 0,
        dailySeries: [],
      };
    } else {
      products[key].totalRevenue += revenue;
    }
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

        let products: ProductRow[] = [];
        try {
          const productRows = await fetchSheet("1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24", "1578364048");
          products = parseProductData(productRows);
        } catch (err) {
          console.warn("Product sheet loading failed, using empty array");
          products = [];
        }

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
            
            const revenueColIdx = colIdx;
            const ordersColIdx = colIdx + 1;
            
            let rev1 = 0, rev7 = 0, rev30 = 0, rev90 = 0, revAll = 0;
            let ord1 = 0, ord7 = 0, ord30 = 0, ord90 = 0, ordAll = 0;
            
            // Row 6부터 (index 5부터) 데이터 - 역순으로 순회하면서 실제 데이터만 카운트
            const rows = productDailyRows.slice(5);
            
            let dataCount = 0; // 실제 데이터 행 개수
            
            for (let i = rows.length - 1; i >= 0; i--) {
              const row = rows[i];
              if (!row || row.length <= revenueColIdx) continue;
              
              const revenue = safeNum(row[revenueColIdx] || "0");
              const orders = safeNum(row[ordersColIdx] || "0");
              
              // 두 값이 모두 0이면 데이터가 없는 행 - 스킵
              if (revenue === 0 && orders === 0) continue;
              
              revAll += revenue;
              ordAll += orders;
              
              dataCount++;
              
              // 역순으로 세기: 가장 뒤의 데이터가 가장 최근
              if (dataCount === 1) {
                rev1 += revenue;
                ord1 += orders;
              }
              if (dataCount <= 7) {
                rev7 += revenue;
                ord7 += orders;
              }
              if (dataCount <= 30) {
                rev30 += revenue;
                ord30 += orders;
              }
              if (dataCount <= 90) {
                rev90 += revenue;
                ord90 += orders;
              }
            }
            
            if (colIdx === 3) {
              console.log(`📊 Product ${sku}: actualDataRows=${dataCount}, rev1=${rev1}, ord1=${ord1}, rev7=${rev7}, ord7=${ord7}, rev30=${rev30}, ord30=${ord30}, rev90=${rev90}, ord90=${ord90}`);
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

        // 제품별 TOP 10 (기간별, 매출액 기준)
        const generateTop10ByRevenue = (days: number | null): ProductTop10Item[] => {
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
            .sort((a, b) => b.revenue - a.revenue) // 매출액 기준 정렬
            .slice(0, 10);
        };

        // 제품별 TOP 10 (기간별, 주문수 기준)
        const generateTop10ByOrders = (days: number | null): ProductTop10Item[] => {
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
            .sort((a, b) => b.orders - a.orders) // 주문수 기준 정렬
            .slice(0, 10);
        };

        const productTop10ByPeriod = {
          "1": { revenue: generateTop10ByRevenue(1), orders: generateTop10ByOrders(1) },
          "7": { revenue: generateTop10ByRevenue(7), orders: generateTop10ByOrders(7) },
          "30": { revenue: generateTop10ByRevenue(30), orders: generateTop10ByOrders(30) },
          "90": { revenue: generateTop10ByRevenue(90), orders: generateTop10ByOrders(90) },
          "all": { revenue: generateTop10ByRevenue(null), orders: generateTop10ByOrders(null) },
        };

        // 📊 이상감지: 모든 날짜별 전일 대비 변화율 계산
        const calculateAnomaliesByDate = () => {
          const rows = productDailyRows.slice(5);
          if (rows.length < 2) return {};

          const anomaliesByDate: Record<string, any> = {};

          const codeRow = productDailyRows[2];
          const nameRow = productDailyRows[3];

          // 모든 인접한 두 행씩 비교 (i = 오늘, i-1 = 어제)
          for (let i = 1; i < rows.length; i++) {
            const todayRow = rows[i];
            const yesterdayRow = rows[i - 1];
            let todayDt = todayRow[0]?.trim() || "";

            if (!todayDt) continue;

            // todayDt 형식 표준화: "20260804" → "2026-08-04"
            if (todayDt.length === 8 && !todayDt.includes('-')) {
              todayDt = `${todayDt.substring(0, 4)}-${todayDt.substring(4, 6)}-${todayDt.substring(6, 8)}`;
            }

            const increases: any[] = [];
            const decreases: any[] = [];

            // D, G, J, M 등 3열씩 추출
            let increasesCount = 0, decreasesCount = 0;
            for (let colIdx = 3; colIdx < codeRow.length; colIdx += 3) {
              const sku = codeRow[colIdx]?.trim();
              if (!sku || sku === "") continue;

              const name = nameRow[colIdx]?.trim() || sku;
              const revenueColIdx = colIdx;

              const yesterdayRevenue = parseFloat(yesterdayRow[revenueColIdx] || "0") || 0;
              const todayRevenue = parseFloat(todayRow[revenueColIdx] || "0") || 0;

              if (yesterdayRevenue === 0) continue;

              const changePercent = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;

              const productType = getProductType(sku);
              const displayName = `${name} ${productType}`.trim();

              if (changePercent >= 10) {
                increases.push({
                  name: displayName,
                  sku,
                  yesterday: yesterdayRevenue,
                  today: todayRevenue,
                  changePercent,
                });
                increasesCount++;
              } else if (changePercent <= -10) {
                decreases.push({
                  name: displayName,
                  sku,
                  yesterday: yesterdayRevenue,
                  today: todayRevenue,
                  changePercent,
                });
                decreasesCount++;
              }
            }

            // 변화율 큰 순서대로 정렬
            increases.sort((a, b) => b.changePercent - a.changePercent);
            decreases.sort((a, b) => a.changePercent - b.changePercent);

            if (i <= 3) {
              console.log(`📊 [Calc] Row ${i} (${todayDt}): found +${increasesCount} -${decreasesCount}`);
            }

            anomaliesByDate[todayDt] = { increases, decreases };
          }

          return anomaliesByDate;
        };

        const anomaliesByDate = calculateAnomaliesByDate();
        
        // 로그: 각 날짜별 데이터 개수
        const sampleDates = Object.keys(anomaliesByDate).slice(0, 5);
        sampleDates.forEach(date => {
          const data = anomaliesByDate[date];
          console.log(`📊 ${date}: +${data.increases?.length || 0}, -${data.decreases?.length || 0}`);
        });
        console.log("📊 Anomalies by date - total dates:", Object.keys(anomaliesByDate).length);

        // 📊 제품 목록 생성 (productDaily 시트의 Row 3, 4에서 추출)
        console.log("📊 [useSheetData] productDailyRows length:", productDailyRows.length);
        if (productDailyRows.length > 0) {
          console.log("📊 [useSheetData] Row 0 (index 0, 처음 5개):", productDailyRows[0]?.slice(0, 5));
          console.log("📊 [useSheetData] Row 1 (index 1, 처음 5개):", productDailyRows[1]?.slice(0, 5));
          console.log("📊 [useSheetData] Row 2 (index 2, 처음 5개):", productDailyRows[2]?.slice(0, 5));
          console.log("📊 [useSheetData] Row 3 (index 3, 처음 5개):", productDailyRows[3]?.slice(0, 5));
        }

        const products: ProductRow[] = [];
        if (productDailyRows.length > 3) {
          const codeRow = productDailyRows[2]; // Row 3 (index 2): SKU
          const nameRow = productDailyRows[3]; // Row 4 (index 3): 제품명

          console.log("📊 [useSheetData] codeRow length:", codeRow?.length);
          console.log("📊 [useSheetData] nameRow length:", nameRow?.length);

          // D, G, J, M 등 3열씩 추출
          for (let colIdx = 3; colIdx < (codeRow?.length || 0); colIdx += 3) {
            const sku = codeRow[colIdx]?.trim();
            if (!sku || sku === "") continue;

            const name = nameRow?.[colIdx]?.trim() || sku;
            
            console.log(`📊 [useSheetData] Found product at col ${colIdx}: SKU=${sku}, Name=${name}`);
            
            products.push({
              name,
              sku,
            });
          }
        }

        console.log("📊 [useSheetData] Extracted products count:", products.length);
        if (products.length > 0) {
          console.log("📊 [useSheetData] Sample products:", products.slice(0, 3));
        }

        setData({
          daily,
          products,
          productTop10ByPeriod,
          sojae,
          anomaliesByDate,
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

export type { DailyRow, ProductRow, SojaeRow, ProductTop10Item, ProductDailySeries };
