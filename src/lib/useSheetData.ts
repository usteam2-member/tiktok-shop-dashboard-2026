"use client";
import { useState, useEffect } from "react";
import { DailyRow, ProductRow, SojaeRow } from "./data";

export interface MonthlyTop10Item {
  name: string;
  orders: number;
}

export interface SheetData {
  daily: DailyRow[];
  top15: ProductRow[];
  monthlyTop10: Record<string, MonthlyTop10Item[]>;
  availableMonths: string[];
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
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  return { data, loading, error };
}
