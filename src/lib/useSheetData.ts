"use client";
import { useState, useEffect } from "react";
import { DailyRow, SojaeRow } from "./data";

export interface ProductTop10Item {
  name: string;
  orders: number;
}

export interface ProductDailySeries {
  dt: string;
  ord: number;
  smp: number;
  rev: number;
}

export interface KpiMetric {
  target: number;
  current: number;
  rate: number;
  diff: number;
}

export interface KpiVideoMetric {
  target: number;
  current: number;
  rate: number;
  completed: string;
}

export interface KpiData {
  product: string;
  invite: KpiMetric;
  shipment: KpiMetric;
  video: KpiVideoMetric;
}

export interface ProductItem {
  name: string;
  pid: string;
  sku: string;
  ordToday: number;
  ord7: number;
  ord30: number;
  ordThisMonth: number;
  smpThisMonth: number;
  newSojae: number;
  revSojae: number;
  dailySeries: ProductDailySeries[];
  // 새 KPI 데이터
  kpi?: KpiData;
}

export interface SheetData {
  daily: DailyRow[];
  productTop10ByPeriod: {
    "1": ProductTop10Item[];
    "7": ProductTop10Item[];
    "30": ProductTop10Item[];
    "90": ProductTop10Item[];
    "all": ProductTop10Item[];
  };
  products: ProductItem[];
  sojae: SojaeRow[];
  kpi: Record<string, KpiData>;
  updatedAt: string;
}

export function useSheetData() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/sheets").then(r => {
        if (!r.ok) throw new Error("데이터 로드 실패");
        return r.json();
      }),
      fetch("/api/kpi").then(r => {
        if (!r.ok) throw new Error("KPI 데이터 로드 실패");
        return r.json();
      }),
    ])
      .then(([sheetData, kpiData]) => {
        // KPI 데이터를 products에 매핑
        const productsWithKpi = sheetData.products.map((p: ProductItem) => ({
          ...p,
          kpi: kpiData.kpi[p.pid],
        }));

        setData({
          ...sheetData,
          products: productsWithKpi,
          kpi: kpiData.kpi,
        });
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
