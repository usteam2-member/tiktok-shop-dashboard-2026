import { useState, useEffect } from "react";
import { DailyRow, ProductRow, SojaeRow, ProductTop10Item, ProductDailySeries, getProductType } from "./data";

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
    if (!row || row.length < 9) continue;
    
    // B열 (row[1]) = 날짜 (YYMMDD 형식)
    let dt = row[1]?.trim();
    if (!dt || dt.length !== 6 || isNaN(parseInt(dt))) continue;
    
    // YYMMDD를 YYYYMMDD로 변환
    const yy = parseInt(dt.slice(0, 2));
    const mm = dt.slice(2, 4);
    const dd = dt.slice(4, 6);
    dt = `20${yy}${mm}${dd}`;
    
    // 열 인덱스 (0-based):
    // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, ..., M=12, ..., Q=16, R=17
    result.push({
      dt,
      aff: safeNum(row[4] || "0"),      // E열: affiliate_upload
      smp: safeNum(row[5] || "0"),      // F열: sample_orders
      ord: safeNum(row[6] || "0"),      // G열: orders
      krw: safeNum(row[7] || "0"),      // H열: 매출_계약(KRW)
      adCost: safeNum(row[12] || "0"),  // M열: GMV ads
      roas: safeNum(row[16] || "0"),    // Q열: ROAS
      unitPriceUsd: safeNum(row[17] || "0"), // R열: 객단가(USD)
    });
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

    const name = row.slice(1, revenueColIdx).filter(c => c.trim()).join(" ").trim();
    const sku = row[1]?.trim() || "";
    const revenue = safeNum(row[revenueColIdx] || "0");
    
    if (!name || !pidCol) continue;

    const key = `${pidCol}-${name}`;
    if (!products[key]) {
      products[key] = {
        name,
        pid: pidCol,
        sku,
        productType: getProductType(sku),
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

        const productRows = await fetchSheet("1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24", "1578364048");
        const products = parseProductData(productRows);

        const sojaeRows = await fetchSheet("1hWShfZvys3FrsF0xGe4eJrCpTzJbueFDq5UMu8SQV24", "367495503");
        const sojae = parseSojaeData(sojaeRows);

        // 제품별 TOP 10
        const generateTop10 = (days: number | null): ProductTop10Item[] => {
          return products
            .slice(0, 10)
            .map(p => ({
              name: p.name,
              pid: p.pid,
              sku: p.sku,
              productType: p.productType,
              revenue: p.totalRevenue,
            }))
            .sort((a, b) => b.revenue - a.revenue);
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
