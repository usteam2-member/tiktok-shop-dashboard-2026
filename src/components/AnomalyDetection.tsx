"use client";
import React from "react";

interface AnomalyItem {
  name: string;
  sku: string;
  yesterday: number;
  today: number;
  changePercent: number;
}

interface Props {
  increases: AnomalyItem[];
  decreases: AnomalyItem[];
  threshold: number;
  onThresholdChange: (threshold: number) => void;
}

export default function AnomalyDetection({ increases, decreases, threshold, onThresholdChange }: Props) {
  return (
    <div>
      {/* 변화율 선택 버튼 */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", padding: "12px 20px", background: "#f9fafb", borderRadius: "8px" }}>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#1f2937", marginRight: "12px" }}>변화율 기준:</span>
        {[10, 20, 30].map((t) => (
          <button
            key={t}
            onClick={() => onThresholdChange(t)}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: threshold === t ? "#3b82f6" : "#e5e7eb",
              color: threshold === t ? "white" : "#1f2937",
              fontWeight: threshold === t ? 600 : 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ±{t}%
          </button>
        ))}
      </div>

      {/* 증가/감소 제품 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", padding: "20px" }}>
        {/* 📈 증가 제품 */}
        <div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#059669",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📈 전일 대비 {threshold}% 이상 증가
            <span
              style={{
                background: "#059669",
                color: "white",
                borderRadius: "20px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {increases.length}개
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {increases.length === 0 ? (
              <div style={{ color: "#999", fontSize: "14px", padding: "20px", textAlign: "center" }}>
                증가한 제품이 없습니다
              </div>
            ) : (
              increases.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    padding: "16px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#065f46", marginBottom: "8px" }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#059669", marginBottom: "12px" }}>
                    {item.sku}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      marginBottom: "12px",
                      fontSize: "12px",
                    }}
                  >
                    <div>
                      <div style={{ color: "#999", marginBottom: "4px" }}>어제</div>
                      <div style={{ fontWeight: 600, color: "#1f2937" }}>
                        {(item.yesterday / 1e6).toFixed(1)}M
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#999", marginBottom: "4px" }}>오늘</div>
                      <div style={{ fontWeight: 600, color: "#059669" }}>
                        {(item.today / 1e6).toFixed(1)}M
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#dcfce7",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      textAlign: "center",
                      fontWeight: 600,
                      color: "#059669",
                      fontSize: "13px",
                    }}
                  >
                    ↑ +{item.changePercent.toFixed(1)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 📉 감소 제품 */}
        <div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#dc2626",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📉 전일 대비 {threshold}% 이상 감소
            <span
              style={{
                background: "#dc2626",
                color: "white",
                borderRadius: "20px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {decreases.length}개
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {decreases.length === 0 ? (
              <div style={{ color: "#999", fontSize: "14px", padding: "20px", textAlign: "center" }}>
                감소한 제품이 없습니다
              </div>
            ) : (
              decreases.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fca5a5",
                    borderRadius: "8px",
                    padding: "16px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#7f1d1d", marginBottom: "8px" }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#dc2626", marginBottom: "12px" }}>
                    {item.sku}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      marginBottom: "12px",
                      fontSize: "12px",
                    }}
                  >
                    <div>
                      <div style={{ color: "#999", marginBottom: "4px" }}>어제</div>
                      <div style={{ fontWeight: 600, color: "#1f2937" }}>
                        {(item.yesterday / 1e6).toFixed(1)}M
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#999", marginBottom: "4px" }}>오늘</div>
                      <div style={{ fontWeight: 600, color: "#dc2626" }}>
                        {(item.today / 1e6).toFixed(1)}M
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#fee2e2",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      textAlign: "center",
                      fontWeight: 600,
                      color: "#dc2626",
                      fontSize: "13px",
                    }}
                  >
                    ↓ -{Math.abs(item.changePercent).toFixed(1)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
