"use client";
import React, { useEffect, useMemo, useState } from "react";
import { fetchKpi, elapsedDays, eom, usToday, KpiData, KpiMonth } from "@/lib/kpi";

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "-" : Math.round(v).toLocaleString("ko-KR"));
const GOOD = "#15803d";
const BAD = "#b91c1c";
const ACCENT = "#2a78d6";

// +/- 표시: ▲ 초과(초록) / ▼ 부족(빨강) — 색만으로 구분하지 않도록 기호 함께
function Delta({ v, size = 12 }: { v: number | null; size?: number }) {
  if (v === null) return <span style={{ color: "#cbd5e1" }}>-</span>;
  const r = Math.round(v);
  if (r === 0) return <span style={{ color: "#64748b", fontSize: size }}>0</span>;
  const up = r > 0;
  return (
    <span style={{ color: up ? GOOD : BAD, fontWeight: 700, fontSize: size, whiteSpace: "nowrap" }}>
      {up ? "▲" : "▼"} {Math.abs(r).toLocaleString("ko-KR")}
    </span>
  );
}

// KPI 기준 막대: KPI를 항상 같은 위치(가로 2/3 지점)에 두고
//  진한 파랑 = Today, 연한 파랑 = EOM 예상, 검은 눈금 = KPI(100%)
//  KPI의 150%를 넘으면 오른쪽 끝에서 잘리고 ▸ 표시
const KPI_POS = 2 / 3;
function KpiBar({ kpi, today, eomV, height = 10, showKpi = true }: { kpi: number | null; today: number; eomV: number | null; height?: number; showKpi?: boolean }) {
  const [hover, setHover] = useState(false);
  const hasKpi = kpi !== null && kpi > 0;
  const rate = (v: number | null) => (hasKpi && v !== null ? `${Math.round((v / (kpi as number)) * 100)}%` : "");
  const w = (v: number) => `${Math.min(100, (v / (kpi as number)) * KPI_POS * 100)}%`;
  const over = hasKpi && Math.max(today, eomV ?? 0) > (kpi as number) / KPI_POS;

  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {showKpi && (
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>
          KPI <strong style={{ color: "#0f172a", fontSize: 12 }}>{hasKpi ? fmt(kpi) : "없음"}</strong>
        </div>
      )}
      {hasKpi ? (
        <div style={{ position: "relative", height, background: "#f1f5f9", borderRadius: 3, cursor: "default" }}>
          {eomV !== null && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: w(eomV), background: "#bfdbfe", borderRadius: 3 }} />}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: w(today), background: ACCENT, borderRadius: 3 }} />
          <div style={{ position: "absolute", left: `${KPI_POS * 100}%`, top: -3, bottom: -3, width: 2, marginLeft: -1, background: "#0f172a" }} />
          {over && <span style={{ position: "absolute", right: -9, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: ACCENT }}>▸</span>}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#94a3b8" }}>Today {fmt(today)} · EOM {fmt(eomV)}</div>
      )}
      {hover && (
        <div style={{
          position: "absolute", zIndex: 20, left: "50%", bottom: "calc(100% + 6px)", transform: "translateX(-50%)",
          background: "#0f172a", color: "#fff", borderRadius: 6, padding: "8px 10px", fontSize: 12, lineHeight: 1.6,
          whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", pointerEvents: "none",
        }}>
          <div>KPI <strong>{hasKpi ? fmt(kpi) : "없음"}</strong></div>
          <div><span style={{ display: "inline-block", width: 8, height: 8, background: ACCENT, borderRadius: 2, marginRight: 6 }} />Today <strong>{fmt(today)}</strong> {rate(today) && <span style={{ color: "#cbd5e1" }}>({rate(today)})</span>}</div>
          <div><span style={{ display: "inline-block", width: 8, height: 8, background: "#bfdbfe", borderRadius: 2, marginRight: 6 }} />EOM 예상 <strong>{fmt(eomV)}</strong> {rate(eomV) && <span style={{ color: "#cbd5e1" }}>({rate(eomV)})</span>}</div>
        </div>
      )}
    </div>
  );
}

export default function KpiTracking() {
  const [data, setData] = useState<KpiData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKpi()
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  // 항상 당월 블록 (없으면 시트의 가장 최근 월)
  const today = usToday();
  const month: KpiMonth | undefined =
    data?.months.find(m => m.year === today.year && m.month === today.month) ?? data?.months[data.months.length - 1];
  const { elapsed, daysInMonth } = month ? elapsedDays(month.year, month.month, today) : { elapsed: 0, daysInMonth: 30 };

  // 제품 × 단계별 계산값
  const rows = useMemo(() => {
    if (!month) return [];
    return month.products.map(p => ({
      ...p,
      calc: p.cells.map(c => {
        const e = eom(c.today, elapsed, daysInMonth);
        const hasKpi = c.kpi !== null && c.kpi > 0;
        return { kpi: hasKpi ? c.kpi : null, today: c.today, eom: e, delta: hasKpi && e !== null ? e - (c.kpi as number) : null };
      }),
    }));
  }, [month, elapsed, daysInMonth]);

  // 단계별 합계 (KPI가 있는 제품 기준)
  const totals = useMemo(() => {
    if (!data) return [];
    return data.stages.map((_, s) => {
      const withKpi = rows.filter(r => r.calc[s].kpi !== null);
      const kpi = withKpi.reduce((a, r) => a + (r.calc[s].kpi as number), 0);
      const today = withKpi.reduce((a, r) => a + r.calc[s].today, 0);
      const e = eom(today, elapsed, daysInMonth);
      const behind = withKpi.filter(r => (r.calc[s].delta ?? 0) < 0).length;
      return { kpi, today, eom: e, delta: e !== null ? e - kpi : null, count: withKpi.length, behind };
    });
  }, [data, rows, elapsed, daysInMonth]);

  if (error) return <div style={{ padding: 20, background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>⚠️ {error}</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>KPI 데이터 불러오는 중...</div>;
  if (!month) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>KPI 데이터가 없어요</div>;

  const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" };
  const sub = ["KPI 대비 Today · EOM 예상", "+/-"];
  const nameW = 230;
  const barW = 190;
  const deltaW = 76;

  // 'Order' 단계 위치 (담당자별 주문수 목표 총합용)
  const orderIdx = data.stages.findIndex(st => st.label.trim().toLowerCase() === "order");

  // 담당자별로 묶기
  const groups: { owner: string; note: string; items: typeof rows }[] = [];
  for (const r of rows) {
    const g = groups[groups.length - 1];
    if (g && g.owner === r.owner) g.items.push(r);
    else groups.push({ owner: r.owner, note: r.ownerNote, items: [r] });
  }

  return (
    <div>
      {/* 기준 안내 (필터 없음: 항상 당월 실시간) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "12px 16px", background: "#f9fafb", borderRadius: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{month.year}년 {month.month}월</span>
        {/* 기준일 = 미국 오늘 − 1 (데이터가 채워진 날). 경과 일수 = 기준일 */}
        <span style={{ fontSize: 14, fontWeight: 700, color: "#b91c1c" }}>
          {elapsed > 0 ? `기준일 : ${month.month}/${elapsed}일` : "기준일 : 이번 달 데이터 대기 중"}
        </span>
      </div>

      {/* 단계별 요약 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, marginBottom: 20 }}>
        {data.stages.map((st, s) => {
          const t = totals[s];
          const rate = t.eom !== null && t.kpi > 0 ? (t.eom / t.kpi) * 100 : null;
          return (
            <div key={st.key} style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{s + 1}. {st.label}</div>
                {rate !== null && <div style={{ fontSize: 12, fontWeight: 700, color: rate >= 100 ? GOOD : BAD }}>달성 예상 {rate.toFixed(0)}%</div>}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(t.eom)}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>EOM 예상 / KPI {fmt(t.kpi)}</span>
              </div>
              <div style={{ marginTop: 6 }}><KpiBar kpi={t.kpi} today={t.today} eomV={t.eom} height={10} showKpi={false} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: "#64748b" }}>
                <span>Today <strong style={{ color: "#0f172a" }}>{fmt(t.today)}</strong></span>
                <Delta v={t.delta} size={13} />
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>KPI 있는 제품 {t.count}개 중 {t.behind}개 부족 예상</div>
            </div>
          );
        })}
      </div>

      {/* 제품 × 단계 표 */}
      <div style={{ ...card, padding: 0 }}>
        <div style={{ padding: "16px 20px 10px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>제품별 KPI 진행</div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: nameW + (barW + deltaW) * data.stages.length, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ position: "sticky", left: 0, background: "#f8fafc", textAlign: "left", padding: "8px 12px 8px 20px", width: nameW, borderBottom: "1px solid var(--border)", fontSize: 11, color: "#64748b" }}>제품명</th>
                {data.stages.map((st, s) => (
                  <th key={st.key} colSpan={2} style={{ background: s % 2 ? "#f8fafc" : "#eff6ff", padding: "8px 6px 4px", fontSize: 12, fontWeight: 700, color: "#334155", borderLeft: "2px solid #fff" }}>
                    {s + 1}. {st.label}
                  </th>
                ))}
              </tr>
              <tr>
                {data.stages.map((st, s) =>
                  sub.map((h, k) => (
                    <th key={st.key + h} style={{ background: s % 2 ? "#f8fafc" : "#eff6ff", padding: "2px 12px 8px", textAlign: k === 0 ? "left" : "right", fontSize: 10, fontWeight: 600, color: "#64748b", width: k === 0 ? barW : deltaW, borderBottom: "1px solid var(--border)", borderLeft: k === 0 ? "2px solid #fff" : undefined }}>
                      {h}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <React.Fragment key={g.owner + g.items[0].name}>
                  <tr>
                    <td colSpan={1 + 4 * data.stages.length} style={{ padding: "10px 20px 6px", background: "#fff", borderTop: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>👤 {g.owner || "담당자 미지정"}</span>
                      {orderIdx >= 0 && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", marginLeft: 12 }}>
                          주문수 목표 총합 : {fmt(g.items.reduce((a, r) => a + (r.calc[orderIdx].kpi ?? 0), 0))}
                        </span>
                      )}
                    </td>
                  </tr>
                  {g.items.map(r => (
                    <tr key={r.pid + r.name} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td title={`${r.name}${r.pid ? ` · PID ${r.pid}` : ""}`} style={{ position: "sticky", left: 0, background: "var(--card)", padding: "8px 12px 8px 20px", maxWidth: nameW, lineHeight: 1.35, color: "#0f172a" }}>
                        {r.name}
                      </td>
                      {r.calc.map((c, s) => (
                        <React.Fragment key={s}>
                          <td style={{ padding: "8px 16px 8px 12px", borderLeft: "2px solid #f1f5f9", width: barW }}>
                            <KpiBar kpi={c.kpi} today={c.today} eomV={c.eom} />
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", width: deltaW }}><Delta v={c.delta} /></td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 20px 16px", fontSize: 11, color: "#94a3b8" }}>
          KPI가 비어 있거나 0인 칸은 +/-를 표시하지 않아요. 시트의 % 열은 표시하지 않아요.
        </div>
      </div>
    </div>
  );
}
