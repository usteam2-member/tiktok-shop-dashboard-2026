"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchGmax, aggregateGmaxRange, lastCompleteDate, GmaxData } from "@/lib/gmax";

interface Props {
  startDate: string;  // "YYYY-MM-DD"
  endDate: string;
  shopTotal?: number; // 같은 기간 샵 전체 매출 (비교용)
}

const won = (v: number) => "₩" + Math.round(v).toLocaleString("ko-KR");

// 매출액 Top 10 — 데이터: Gmax 광고 시트의 제품별 GMV / Ads spend
// 열: 순위 | 제품명(왼쪽) | ROI | 매출액(오른쪽) | 매출 막대
export default function ProductTopTable({ startDate, endDate, shopTotal }: Props) {
  const [data, setData] = useState<GmaxData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGmax().then(setData).catch(e => setError(e.message));
  }, []);

  const top = useMemo(() => {
    if (!data) return [];
    return aggregateGmaxRange(data, startDate, endDate)
      .filter(r => r.gmv > 0)
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 10);
  }, [data, startDate, endDate]);

  const lastDate = useMemo(() => (data ? lastCompleteDate(data) : ""), [data]);
  const max = top[0]?.gmv || 1;
  const sum = top.reduce((a, r) => a + r.gmv, 0);
  const share = shopTotal && shopTotal > 0 ? (sum / shopTotal) * 100 : null;

  const cols = "28px minmax(180px, 320px) 64px 140px minmax(120px, 1fr)";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>매출액 Top 10 제품</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            {startDate} ~ {endDate} · Gmax 광고 시트 GMV 기준
          </div>
        </div>
        {top.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "right" }}>
            Top 10 합계 <strong style={{ color: "var(--text)" }}>{won(sum)}</strong>
            {share !== null && <> · 샵 전체의 <strong style={{ color: "var(--text)" }}>{share.toFixed(1)}%</strong></>}
          </div>
        )}
      </div>

      {error && <div style={{ padding: 16, color: "#991b1b", background: "#fee2e2", borderRadius: 6 }}>⚠️ {error}</div>}
      {!error && !data && <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>불러오는 중...</div>}
      {data && top.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>이 기간에 매출 데이터가 없어요</div>}

      {top.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 560 }}>
            {/* 헤더 */}
            <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "0 4px 8px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
              <div>#</div>
              <div>제품명</div>
              <div style={{ textAlign: "right" }}>ROI</div>
              <div style={{ textAlign: "right" }}>매출액</div>
              <div />
            </div>
            {/* 행 */}
            {top.map((r, i) => (
              <div
                key={r.name + i}
                title={`Ads spend ${won(r.ads)}`}
                style={{
                  display: "grid", gridTemplateColumns: cols, gap: 12, alignItems: "center",
                  padding: "10px 4px", borderBottom: i < top.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? "#2a78d6" : "#94a3b8" }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.name}>
                  {r.name}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.roi === null ? "#94a3b8" : "#334155" }}>
                  {r.roi === null ? "-" : r.roi.toFixed(2)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>
                  {won(r.gmv)}
                </div>
                <div style={{ height: 14, background: "#f1f5f9", borderRadius: 4 }}>
                  <div style={{ width: `${Math.max(1, (r.gmv / max) * 100)}%`, height: "100%", background: "#2a78d6", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && lastDate && endDate > lastDate && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
          Gmax 광고 시트는 {lastDate}까지 모든 제품이 입력돼 있어요. 이후 날짜는 일부 제품만 반영될 수 있어요.
        </div>
      )}
    </div>
  );
}
