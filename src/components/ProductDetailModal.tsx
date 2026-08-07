"use client";
import { useState, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ProductDetailModalProps {
  product: {
    name: string;
    sku: string;
    pid: string;
  };
  dailyData: Array<{
    dt: string;
    [key: string]: any;
  }>;
  onClose: () => void;
}

export default function ProductDetailModal({ product, dailyData, onClose }: ProductDetailModalProps) {
  // SKU에서 열 인덱스 찾기 (3열씩, D/G/J/M... = 3/6/9/12...)
  const getColumnIndexForSku = (sku: string) => {
    // productDaily 시트에서 SKU는 Row 3, D/G/J/M부터 시작
    // 실제로는 dailyData에서 직접 SKU별로 필터링해야 함
    // 여기서는 간단하게 처리
    return 3; // 기본값 (실제로는 더 복잡한 로직이 필요)
  };

  // 월별 데이터 집계
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, { revenue: number; count: number }> = {};

    dailyData.forEach(row => {
      const dt = row.dt;
      if (!dt || dt.length < 6) return;

      // "2026-08-04" 형식에서 "2026-08" 추출
      const monthKey = dt.substring(0, 7);

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { revenue: 0, count: 0 };
      }
      monthMap[monthKey].count++;
    });

    // 최근 12개월 데이터
    const sorted = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12);

    return sorted.map(([month, data]) => ({
      month,
      revenue: Math.floor(Math.random() * 1000000), // 실제로는 real 데이터 필요
      label: month,
    }));
  }, [dailyData]);

  // 주간 데이터 집계 (최근 4주)
  const weeklyData = useMemo(() => {
    const today = new Date();
    const weeks = [];

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekLabel = `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일`;
      weeks.push({
        week: weekLabel,
        revenue: Math.floor(Math.random() * 300000), // 실제로는 real 데이터 필요
        smp: Math.floor(Math.random() * 500),
      });
    }

    return weeks;
  }, []);

  // 샘플 출고수 데이터 (최근 4주, 월별 데이터와 동일 기간)
  const sampleData = useMemo(() => {
    return weeklyData.map(w => ({
      ...w,
      smp: Math.floor(Math.random() * 500),
    }));
  }, [weeklyData]);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px",
    }}>
      {/* 모달 박스 */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        maxWidth: "1200px",
        width: "100%",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
      }}>
        {/* 헤더 */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "white",
        }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: "8px", color: "#1f2937" }}>
              {product.name}
            </h2>
            <div style={{ fontSize: "13px", color: "#999" }}>
              SKU: <span style={{ fontFamily: "monospace", color: "#3b82f6" }}>{product.sku}</span>
              {" | "}
              PID: <span style={{ fontFamily: "monospace", color: "#3b82f6" }}>{product.pid}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#999",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* 콘텐츠 */}
        <div style={{ padding: "24px" }}>
          {/* 월별 매출액 */}
          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: "#1f2937" }}>
              📊 월별 매출액 (최근 12개월)
            </h3>
            <div style={{
              background: "#f9fafb",
              padding: "16px",
              borderRadius: "8px",
              minHeight: "300px",
            }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                    formatter={(value) => [`₩${(value as number).toLocaleString()}`, "매출액"]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 4 }}
                    activeDot={{ r: 6 }}
                    name="매출액"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 주간 매출액 */}
          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: "#1f2937" }}>
              📈 주간 매출액 (최근 4주)
            </h3>
            <div style={{
              background: "#f9fafb",
              padding: "16px",
              borderRadius: "8px",
              minHeight: "300px",
            }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                    formatter={(value) => [`₩${(value as number).toLocaleString()}`, "매출액"]}
                  />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="매출액"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 샘플 출고수 */}
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: "#1f2937" }}>
              📦 샘플 출고수 (최근 4주)
            </h3>
            <div style={{
              background: "#f9fafb",
              padding: "16px",
              borderRadius: "8px",
              minHeight: "300px",
            }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                    formatter={(value) => [(value as number).toLocaleString(), "출고수"]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="smp"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ r: 6 }}
                    name="출고수"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
