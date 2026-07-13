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
  updatedAt: string;
}

export function useSheetData() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/sheets")
      .then((r) => {
        if (!r.ok) throw new Error("데이터 로드 실패");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
