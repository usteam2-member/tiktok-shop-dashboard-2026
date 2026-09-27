"use client";
import React from "react";

// 순위 표 공통 UI (매출 Top 10, Gmax Ads spend Top 20)
// 열: 순위 | 제품명(왼쪽) | ROI | 금액(오른쪽) | 막대
// 막대는 한 가지 색이거나, 여러 조각(예: boosting + 그 외 광고비)을 쌓아서 표시

export interface RankRow {
  name: string;
  roi: number | null;
  value: number;                                     // 금액 열 + 막대 길이
  segments?: { value: number; color: string }[];     // 막대를 나눠 칠할 때 (합 = value)
  hint?: string;                                     // 행에 마우스를 올리면 보이는 설명
}

export interface RankSummary {
  label: string;        // 예: "Top 10 합계"
  value: number;        // 합계 금액
  shareLabel?: string;  // 예: "샵 전체 매출 대비"
  share?: number | null; // 0~100 (%)
}

interface Props {
  title: string;
  subtitle?: React.ReactNode;
  rows: RankRow[];
  valueLabel: string;              // 금액 열 제목 (매출액 / Ads spend)
  barColor?: string;
  legend?: { label: string; color: string }[];
  summary?: RankSummary;
  footer?: React.ReactNode;
  emptyText?: string;
}

export const won = (v: number) => "₩" + Math.round(v).toLocaleString("ko-KR");
const ACCENT = "#2a78d6";

function SummaryBox({ s }: { s: RankSummary }) {
  const pct = s.share === null || s.share === undefined ? null : s.share;
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <div style={{ background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 10, padding: "10px 16px", minWidth: 190 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 2 }}>{s.label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{won(s.value)}</div>
      </div>
      {pct !== null && (
        <div style={{ background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 10, padding: "10px 16px", minWidth: 170 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 2 }}>{s.shareLabel}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{pct.toFixed(1)}%</div>
          <div style={{ height: 6, background: "#dbeafe", borderRadius: 3, marginTop: 6 }}>
            <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: ACCENT, borderRadius: 3 }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function RankTable({ title, subtitle, rows, valueLabel, barColor = ACCENT, legend, summary, footer, emptyText }: Props) {
  const max = Math.max(1, ...rows.map(r => r.value));
  const cols = "28px minmax(180px, 320px) 64px 140px minmax(120px, 1fr)";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 20 }}>
      {/* 제목 + 요약 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{subtitle}</div>}
          {legend && (
            <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
              {legend.map(l => (
                <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          )}
        </div>
        {summary && rows.length > 0 && <SummaryBox s={summary} />}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{emptyText || "데이터가 없어요"}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 560 }}>
            <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "0 4px 8px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
              <div>#</div>
              <div>제품명</div>
              <div style={{ textAlign: "right" }}>ROI</div>
              <div style={{ textAlign: "right" }}>{valueLabel}</div>
              <div />
            </div>
            {rows.map((r, i) => {
              const segs = r.segments && r.segments.length ? r.segments : [{ value: r.value, color: barColor }];
              return (
                <div
                  key={r.name + i}
                  title={r.hint}
                  style={{ display: "grid", gridTemplateColumns: cols, gap: 12, alignItems: "center", padding: "9px 4px", borderBottom: i < rows.length - 1 ? "1px solid #f1f5f9" : "none" }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? ACCENT : "#94a3b8" }}>{i + 1}</div>
                  <div style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.name}>{r.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.roi === null ? "#94a3b8" : "#334155" }}>
                    {r.roi === null ? "-" : r.roi.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{won(r.value)}</div>
                  <div style={{ height: 14, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ display: "flex", gap: 2, width: `${Math.max(1, (r.value / max) * 100)}%`, height: "100%" }}>
                      {segs.filter(s => s.value > 0).map((s, k) => (
                        <div key={k} style={{ flex: `${s.value} 0 0`, background: s.color, borderRadius: 3 }} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {footer && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>{footer}</div>}
    </div>
  );
}
