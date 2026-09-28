"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchMonthSummaries, fetchProductMonthly, isOngoing, MonthSummary, ProductMonthly, REGIONS, ReportRegion } from "@/lib/report";
import { fetchGmax, aggregateGmaxRange, GmaxData } from "@/lib/gmax";

const UP = "#15803d";
const DOWN = "#9b2c2c";

const fmtInt = (v: number) => Math.round(v).toLocaleString("ko-KR");
const fmtManwon = (v: number) => `${Math.round(v / 10000).toLocaleString("ko-KR")}만원`;

interface Metric {
  label: string;
  get: (m: MonthSummary) => number | null;
  fmt: (v: number) => string;
  hint?: string;
}

const METRICS: Metric[] = [
  { label: "총 매출 (KRW)", get: m => m.revenue, fmt: fmtManwon },
  { label: "총 주문수", get: m => m.orders, fmt: fmtInt },
  { label: "객단가 (KRW)", get: m => m.aov, fmt: v => `${fmtInt(v)}원` },
  { label: "ROAS total", get: m => m.roasTotal, fmt: v => v.toFixed(2), hint: "총 매출 ÷ (GMV ads + Creative Boost)" },
];

// 증감: ↑ 초록 / ↓ 빨강 + 크기만큼 막대 (60% 이상이면 가득)
function Change({ pct }: { pct: number | null }) {
  if (pct === null || !isFinite(pct)) return <span style={{ color: "#cbd5e1" }}>-</span>;
  const up = pct >= 0;
  const color = up ? UP : DOWN;
  const width = Math.max(3, Math.min(1, Math.abs(pct) / 60) * 120);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
      <span style={{ color, fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {up ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}%
      </span>
      <span style={{ width: 120, display: "flex" }}>
        <span style={{ width, height: 6, borderRadius: 3, background: color }} />
      </span>
    </div>
  );
}

// 금액: 1억 이상 "8.9억", 그 아래 "8,201만원"
const fmtShort = (v: number) => (v >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : `${Math.round(v / 1e4).toLocaleString("ko-KR")}만원`);
const C_PREV = "#8bb8e8";
const C_CUR = "#1e4d8c";

const GRID = "36px minmax(180px, 1.3fr) 76px 32px minmax(160px, 2fr) 110px 100px 70px";
const typeOf = (sku: string) => (sku.startsWith("BD") ? "번들" : sku.startsWith("SB") ? "단품" : "");

// 제품별 매출: 선택 월 Top 10 × 전월 비교
// PID → 그 달 ROI (Gmax 광고 시트: 월 GMV 합 ÷ 월 Ads spend 합)
function roiByPid(gmax: GmaxData | null, m?: MonthSummary): Record<string, number> {
  const out: Record<string, number> = {};
  if (!gmax || !m) return out;
  for (const r of aggregateGmaxRange(gmax, `${m.key}-01`, `${m.key}-31`)) {
    if (r.pid && r.roi !== null && !(r.pid in out)) out[r.pid] = r.roi;
  }
  return out;
}

function ProductCompare({ data, gmax, cur, prev, label }: { data: ProductMonthly | null; gmax: GmaxData | null; cur: MonthSummary; prev?: MonthSummary; label: (m: MonthSummary) => string }) {
  const roiCur = roiByPid(gmax, cur);
  const roiPrev = roiByPid(gmax, prev);
  const roiText = (v: number | undefined) => (v === undefined ? "-" : v.toFixed(2));
  if (!data) return <div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>제품별 매출 불러오는 중...</div>;
  const curVals = data.revenue[cur.key];
  const prevVals = prev ? data.revenue[prev.key] : undefined;
  if (!curVals) return <div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>{cur.month}월 제품별 매출이 없어요</div>;

  const top = data.products
    .map((p, i) => ({ ...p, cur: curVals[i] || 0, prev: prevVals?.[i] || 0 }))
    .filter(r => r.cur > 0)
    .sort((a, b) => b.cur - a.cur)
    .slice(0, 10);
  const max = Math.max(1, ...top.flatMap(r => [r.cur, r.prev]));
  const bar = (v: number, color: string) => (
    <div style={{ height: 14, width: `${Math.max(v > 0 ? 0.6 : 0, (v / max) * 100)}%`, minWidth: v > 0 ? 3 : 0, background: color, borderRadius: 3 }} />
  );

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1c1917", marginBottom: 12 }}>제품별 매출</div>
      <div style={{ background: "#fdfcfb", border: "1px solid #e7e5e4", borderRadius: 10, padding: "14px 20px 6px" }}>
        {/* 범례 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: 13, color: "#57534e", paddingBottom: 12, borderBottom: "1px solid #e7e5e4" }}>
          {prev && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: C_PREV }} />{label(prev)}</span>}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: C_CUR }} />{label(cur)}</span>
          <span style={{ color: UP }}>↑ <span style={{ color: "#57534e" }}>증가</span></span>
          <span style={{ color: DOWN }}>↓ <span style={{ color: "#57534e" }}>감소</span></span>
        </div>

        {/* 열 제목 */}
        <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, padding: "12px 0 8px", borderBottom: "1px solid #e7e5e4", fontSize: 12, fontWeight: 500, color: "#a8a29e" }}>
          <div>#</div>
          <div>제품명</div>
          <div style={{ textAlign: "center" }}>구분</div>
          <div />
          <div />
          <div style={{ textAlign: "right" }}>매출액</div>
          <div style={{ textAlign: "right" }}>증감</div>
          <div style={{ textAlign: "right" }}>ROI</div>
        </div>
        {top.map((r, i) => {
          const pct = r.prev > 0 ? ((r.cur - r.prev) / r.prev) * 100 : null;
          return (
            <div key={r.pid || r.sku + i} style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 12, padding: "14px 0", borderBottom: i < top.length - 1 ? "1px solid #e7e5e4" : "none" }}>
              <div style={{ fontSize: 16, color: "#78716c" }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 15, color: "#1c1917", lineHeight: 1.35 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 2 }}>{r.sku}</div>
              </div>
              {/* 구분 열: SKU로 판단 (SB… = 단품, BD… = 번들) */}
              <div style={{ textAlign: "center" }}>
                {typeOf(r.sku) ? (
                  <span style={{
                    display: "inline-block", fontSize: 12, fontWeight: 600, padding: "3px 12px", borderRadius: 999,
                    background: typeOf(r.sku) === "번들" ? "#eef2ff" : "#f1f5f9", color: typeOf(r.sku) === "번들" ? "#4338ca" : "#475569",
                  }}>{typeOf(r.sku)}</span>
                ) : <span style={{ color: "#cbd5e1" }}>-</span>}
              </div>
              <div style={{ fontSize: 11, color: "#a8a29e", lineHeight: "22px", textAlign: "right" }}>
                {prev && <div>{prev.month}월</div>}
                <div>{cur.month}월</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {prev && bar(r.prev, C_PREV)}
                {bar(r.cur, C_CUR)}
              </div>
              <div style={{ fontSize: 13, color: "#57534e", textAlign: "right", lineHeight: "22px", fontVariantNumeric: "tabular-nums" }}>
                {prev && <div>{r.prev > 0 ? fmtShort(r.prev) : "-"}</div>}
                <div style={{ color: "#1c1917", fontWeight: 600 }}>{fmtShort(r.cur)}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: pct === null ? "#a8a29e" : pct >= 0 ? UP : DOWN }}>
                {pct === null ? (prev ? "신규" : "-") : `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct).toFixed(1)}%`}
              </div>
              {/* ROI: 위 = 전월, 아래 = 선택 월 */}
              <div style={{ fontSize: 13, textAlign: "right", lineHeight: "22px", fontVariantNumeric: "tabular-nums" }} title="Gmax 광고 시트 기준 GMV ÷ Ads spend">
                {prev && <div style={{ color: "#78716c" }}>{roiText(roiPrev[r.pid])}</div>}
                <div style={{ color: "#1c1917", fontWeight: 700 }}>{roiText(roiCur[r.pid])}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>출처: GMV | by Product 시트의 월별 &apos;마감 예상&apos; 행 · {cur.month}월 매출 Top 10 기준</div>
    </div>
  );
}

// 지역 하나의 데이터 상태
interface RegionData {
  region: ReportRegion;
  months: MonthSummary[] | null;
  products: ProductMonthly | null;
  gmax: GmaxData | null;          // 제품별 ROI용 (미국만)
  error: string | null;
}

const prevKeyOf = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

// 지역 한 곳: 주요 지표 표 + 제품별 매출
function RegionSection({ d, monthKey }: { d: RegionData; monthKey: string }) {
  const title = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "8px 0 12px" }}>
      <span>{d.region.flag}</span>{d.region.label}
    </div>
  );
  if (d.error) return <div style={{ marginBottom: 36 }}>{title}<div style={{ padding: 16, background: "#fee2e2", color: "#991b1b", borderRadius: 8, fontSize: 13 }}>⚠️ {d.error}</div></div>;
  if (!d.months) return <div style={{ marginBottom: 36 }}>{title}<div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>불러오는 중...</div></div>;

  const cur = d.months.find(m => m.key === monthKey);
  const prev = d.months.find(m => m.key === prevKeyOf(monthKey));
  if (!cur) return <div style={{ marginBottom: 36 }}>{title}<div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>이 달의 데이터가 없어요</div></div>;

  const colLabel = (m: MonthSummary) => `${m.month}월 ${isOngoing(m) ? "마감예상" : "마감"}`;
  const th: React.CSSProperties = { padding: "14px 12px", fontSize: 13, fontWeight: 500, color: "#78716c", borderBottom: "1px solid #e7e5e4" };
  const td: React.CSSProperties = { padding: "18px 12px", fontSize: 15, borderBottom: "1px solid #e7e5e4", fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ marginBottom: 44 }}>
      {title}
      <div style={{ background: "#fdfcfb", border: "1px solid #e7e5e4", borderRadius: 10, padding: "4px 20px 8px", overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>지표</th>
              <th style={{ ...th, textAlign: "right" }}>{prev ? colLabel(prev) : "전월"}</th>
              <th style={{ ...th, textAlign: "right" }}>{colLabel(cur)}</th>
              <th style={{ ...th, textAlign: "right" }}>증감({prev ? prev.month : "-"}→{cur.month}월)</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map(mt => {
              const a = prev ? mt.get(prev) : null;
              const b = mt.get(cur);
              const pct = a !== null && b !== null && a !== 0 ? ((b - a) / a) * 100 : null;
              return (
                <tr key={mt.label}>
                  <td style={{ ...td, fontWeight: 700, color: "#1c1917" }} title={mt.hint}>{mt.label}</td>
                  <td style={{ ...td, textAlign: "right", color: "#57534e" }}>{a === null ? "-" : mt.fmt(a)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#1c1917" }}>{b === null ? "-" : mt.fmt(b)}</td>
                  <td style={{ ...td, textAlign: "right" }}><Change pct={pct} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
        출처: {d.region.label} 시트 GMV | Daily의 월별 &apos;마감 예상&apos; 행 · ROAS total = 총 매출 ÷ (GMV ads + Creative Boost)
      </div>

      <ProductCompare data={d.products} gmax={d.gmax} cur={cur} prev={prev} label={colLabel} />
    </div>
  );
}

function MonthlyMeeting({ regions }: { regions: RegionData[] }) {
  // 선택할 수 있는 달 = 어느 지역이든 데이터가 있는 달
  const monthKeys = Array.from(new Set(regions.flatMap(r => (r.months || []).map(m => m.key)))).sort();
  const [key, setKey] = useState("");
  const selected = key || monthKeys[monthKeys.length - 1] || "";
  const [y, m] = selected ? selected.split("-").map(Number) : [0, 0];
  const [, pm] = selected ? prevKeyOf(selected).split("-").map(Number) : [0, 0];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>기준 월</span>
        <select value={selected} onChange={e => setKey(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}>
          {[...monthKeys].reverse().map(k => {
            const [yy, mm] = k.split("-").map(Number);
            return <option key={k} value={k}>{yy}년 {mm}월</option>;
          })}
        </select>
        {selected && <span style={{ fontSize: 12, color: "#94a3b8" }}>{y}년 {m}월 · {pm}월과 비교</span>}
      </div>
      {regions.map(d => <RegionSection key={d.region.key} d={d} monthKey={selected} />)}
    </div>
  );
}

const SUB_TABS = ["주요지표"] as const;

export default function Report() {
  const [tab, setTab] = useState<(typeof SUB_TABS)[number]>("주요지표");
  const [regions, setRegions] = useState<RegionData[]>(
    REGIONS.map(region => ({ region, months: null, products: null, gmax: null, error: null })),
  );

  useEffect(() => {
    const update = (key: string, patch: Partial<RegionData>) =>
      setRegions(rs => rs.map(r => (r.region.key === key ? { ...r, ...patch } : r)));
    for (const region of REGIONS) {
      fetchMonthSummaries(region).then(months => update(region.key, { months })).catch(e => update(region.key, { error: e.message }));
      fetchProductMonthly(region).then(products => update(region.key, { products })).catch(e => update(region.key, { error: e.message }));
    }
    // 제품별 ROI는 미국 Gmax 광고 시트만 있음
    fetchGmax().then(gmax => update("us", { gmax })).catch(() => {});
  }, []);

  const body = useMemo(() => {
    if (tab === "주요지표") return <MonthlyMeeting regions={regions} />;
    return null;
  }, [regions, tab]);

  return (
    <div>
      {/* 보고 탭 안의 하위 탭 */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        {SUB_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14,
              fontWeight: tab === t ? 700 : 500, color: tab === t ? "#0f172a" : "#94a3b8",
              borderBottom: tab === t ? "2px solid #0f172a" : "2px solid transparent", marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {body}
    </div>
  );
}
