"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { fetchGmax, aggregateGmax, rankCorrelation, GmaxData, GmaxRow } from "@/lib/gmax";

Chart.register(...registerables);

// 색: 광고비(일반) = 파랑, boosting = 주황 (검증된 범주형 팔레트 1·2번)
const C_ADS = "#2a78d6";
const C_BOOST = "#eb6834";
// boosting 비중 구간 (주황 한 가지 색의 명도 단계 + 0%는 회색)
const SHARE_BUCKETS = [
  { label: "boosting 없음", min: 0, max: 0, color: "#b8bcc4" },
  { label: "1~30%", min: 0.000001, max: 0.3, color: "#f6b48f" },
  { label: "30~60%", min: 0.3, max: 0.6, color: "#eb6834" },
  { label: "60% 이상", min: 0.6, max: Infinity, color: "#a8400f" },
];
const bucketOf = (s: number) =>
  s === 0 ? SHARE_BUCKETS[0] : SHARE_BUCKETS.slice(1).find(b => s >= b.min && s < b.max) || SHARE_BUCKETS[3];

const won = (v: number) => "₩" + Math.round(v).toLocaleString("ko-KR");
const roiText = (r: number | null) => (r === null ? "-" : r.toFixed(2));
const shortWon = (v: number) =>
  v >= 1e8 ? (v / 1e8).toFixed(1) + "억" : v >= 1e4 ? Math.round(v / 1e4).toLocaleString("ko-KR") + "만" : Math.round(v).toString();

const card: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px",
  padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "20px",
};

// 막대 오른쪽에 "₩광고비 · ROI x.xx" 표시
const makeBarEndLabels = (rows: GmaxRow[]) => ({
  id: "gmaxBarEndLabels",
  afterDatasetsDraw(chart: Chart) {
    const metas = chart.data.datasets.map((_, i) => chart.getDatasetMeta(i)).filter(m => !m.hidden);
    if (!metas.length) return;
    const { ctx } = chart;
    ctx.save();
    ctx.font = "600 11px sans-serif";
    ctx.fillStyle = "#1f2937";
    ctx.textBaseline = "middle";
    const roiX = chart.width - 8; // ROI는 차트 맨 오른쪽에 오른쪽 정렬
    // ROI 열 제목
    ctx.textAlign = "right";
    ctx.fillStyle = "#64748b";
    ctx.fillText("ROI", roiX, chart.chartArea.top - 10);
    rows.forEach((r, i) => {
      const x = Math.max(...metas.map(m => (m.data[i] as any)?.x ?? 0));
      const y = (metas[0].data[i] as any)?.y;
      if (y === undefined) return;
      // 막대 바로 옆: Ads spend 금액
      ctx.textAlign = "left";
      ctx.fillStyle = "#1f2937";
      ctx.fillText(won(r.ads), x + 6, y);
      // 맨 오른쪽: ROI
      ctx.textAlign = "right";
      ctx.fillText(roiText(r.roi), roiX, y);
    });
    ctx.restore();
  },
});

export default function GmaxAds() {
  const [data, setData] = useState<GmaxData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"daily" | "monthly">("daily");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");

  useEffect(() => {
    fetchGmax()
      .then(d => {
        setData(d);
        const lastDate = d.days[d.days.length - 1]?.date || "";
        setDay(lastDate);
        setMonth(lastDate.slice(0, 7));
      })
      .catch(e => setError(e.message));
  }, []);

  const dates = useMemo(() => (data ? data.days.map(d => d.date).reverse() : []), [data]);
  const months = useMemo(() => Array.from(new Set(dates.map(d => d.slice(0, 7)))), [dates]);
  const period = mode === "daily" ? day : month;

  const rows = useMemo(() => (data && period ? aggregateGmax(data, period) : []), [data, period]);
  const top20 = useMemo(() => rows.slice(0, 20), [rows]);

  const total = useMemo(() => {
    const ads = rows.reduce((a, r) => a + r.ads, 0);
    const boost = rows.reduce((a, r) => a + r.boost, 0);
    const gmv = rows.reduce((a, r) => a + r.gmv, 0);
    return { ads, boost, gmv, roi: ads > 0 ? gmv / ads : null, share: ads > 0 ? boost / ads : 0 };
  }, [rows]);

  // 상관관계 (광고비가 있는 모든 제품 대상)
  const corr = useMemo(() => {
    const withRoi = rows.filter(r => r.roi !== null);
    return {
      n: withRoi.length,
      adsRoi: rankCorrelation(withRoi.map(r => r.ads), withRoi.map(r => r.roi as number)),
      boostRoi: rankCorrelation(withRoi.map(r => r.boostShare), withRoi.map(r => r.roi as number)),
    };
  }, [rows]);

  // ── 차트 1: Top 20 막대 (boosting + 그 외 광고비 = Ads spend) ──
  const barRef = useRef<HTMLCanvasElement>(null);
  const barChart = useRef<Chart | null>(null);
  useEffect(() => {
    barChart.current?.destroy();
    if (!barRef.current || !top20.length) return;
    barChart.current = new Chart(barRef.current, {
      type: "bar",
      plugins: [makeBarEndLabels(top20)],
      data: {
        labels: top20.map(r => r.name),
        datasets: [
          { label: "boosting", data: top20.map(r => r.boost), backgroundColor: C_BOOST, borderRadius: 0, borderSkipped: false, stack: "s" },
          { label: "광고비 (boosting 제외)", data: top20.map(r => r.ads - r.boost), backgroundColor: C_ADS, borderRadius: { topRight: 4, bottomRight: 4 } as any, borderSkipped: false, stack: "s" },
        ],
      },
      options: {
        indexAxis: "y",
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 170, top: 18 } }, // 오른쪽: 금액 + ROI 열, 위: ROI 제목
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 11 }, color: "#64748b", boxWidth: 12, boxHeight: 12 } },
          tooltip: {
            callbacks: {
              title: (items: any[]) => top20[items[0].dataIndex].name,
              label: () => "",
              afterBody: (items: any[]) => {
                const r = top20[items[0].dataIndex];
                return [
                  `Ads spend: ${won(r.ads)}`,
                  `  └ boosting: ${won(r.boost)} (${(r.boostShare * 100).toFixed(1)}%)`,
                  `GMV: ${won(r.gmv)}`,
                  `ROI: ${roiText(r.roi)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: { stacked: true, beginAtZero: true, ticks: { color: "#64748b", font: { size: 10 }, callback: (v: any) => shortWon(v as number) }, grid: { color: "#e2e6ea", lineWidth: 0.5 } },
          y: { stacked: true, ticks: { color: "#1f2937", font: { size: 11 } }, grid: { display: false } },
        },
      } as any,
    });
    return () => barChart.current?.destroy();
  }, [top20]);

  // ── 차트 2: 상관관계 산점도 (x = Ads spend, y = ROI, 색 = boosting 비중) ──
  const scRef = useRef<HTMLCanvasElement>(null);
  const scChart = useRef<Chart | null>(null);
  const scatter = useMemo(() => {
    const pts = rows.filter(r => r.roi !== null);
    // ROI 극단값(소액 광고 제품)이 축을 망가뜨리지 않도록 상위 5% 지점에서 자름
    const rois = pts.map(r => r.roi as number).sort((a, b) => a - b);
    const p95 = rois.length ? rois[Math.floor((rois.length - 1) * 0.95)] : 0;
    const cap = Math.max(1, Math.ceil(p95 * 1.2));
    return { pts, cap, clipped: pts.filter(r => (r.roi as number) > cap).length };
  }, [rows]);

  useEffect(() => {
    scChart.current?.destroy();
    if (!scRef.current || !scatter.pts.length) return;
    const { pts, cap } = scatter;
    scChart.current = new Chart(scRef.current, {
      type: "scatter",
      data: {
        datasets: SHARE_BUCKETS.map(b => {
          const members = pts.filter(r => bucketOf(r.boostShare) === b);
          return {
            label: b.max === 0 ? b.label : `boosting 비중 ${b.label}`,
            data: members.map(r => ({ x: r.ads, y: Math.min(r.roi as number, cap), row: r })),
            backgroundColor: b.color,
            borderColor: "#ffffff",
            borderWidth: 2,
            pointRadius: members.map(r => ((r.roi as number) > cap ? 7 : 6)),
            pointHoverRadius: 9,
            clip: false as any, // 맨 위 ▲ 표시가 잘리지 않도록
            pointStyle: members.map(r => ((r.roi as number) > cap ? "triangle" : "circle")) as any,
          };
        }),
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 11 }, color: "#64748b", usePointStyle: true, pointStyle: "circle" } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const r = (ctx.raw as any).row as GmaxRow;
                return [
                  r.name,
                  `Ads spend ${won(r.ads)} (boosting ${(r.boostShare * 100).toFixed(0)}%)`,
                  `GMV ${won(r.gmv)} · ROI ${roiText(r.roi)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            type: "logarithmic",
            title: { display: true, text: "Ads spend (로그 눈금)", color: "#64748b", font: { size: 11 } },
            ticks: { color: "#64748b", font: { size: 10 }, callback: v => { const n = v as number; if (n <= 0) return ""; const m = n / Math.pow(10, Math.floor(Math.log10(n))); return [1, 2, 5].some(k => Math.abs(m - k) < 0.01) ? shortWon(n) : ""; } },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
          y: {
            min: 0, max: cap,
            title: { display: true, text: "ROI (GMV ÷ Ads spend)", color: "#64748b", font: { size: 11 } },
            ticks: { color: "#64748b", font: { size: 10 } },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
        },
      },
    });
    return () => scChart.current?.destroy();
  }, [scatter]);

  const btn = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px",
    background: active ? "#1f2937" : "#e5e7eb", color: active ? "white" : "#1f2937", fontWeight: active ? 700 : 500,
  });

  if (error) return <div style={{ padding: 20, background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>⚠️ {error}</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Gmax 광고 데이터 불러오는 중...</div>;

  const corrText = (c: number | null) => {
    if (c === null) return { v: "-", d: "데이터 부족" };
    const a = Math.abs(c);
    const s = a < 0.2 ? "관계 거의 없음" : a < 0.4 ? "약한" : a < 0.7 ? "뚜렷한" : "강한";
    const dir = a < 0.2 ? "" : c > 0 ? " 양(+)의 관계" : " 음(−)의 관계";
    return { v: c.toFixed(2), d: s + dir };
  };
  const cAds = corrText(corr.adsRoi);
  const cBoost = corrText(corr.boostRoi);

  return (
    <div>
      {/* 기간 선택 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", padding: "12px 16px", background: "#f9fafb", borderRadius: "8px", marginBottom: "20px" }}>
        <button style={btn(mode === "daily")} onClick={() => setMode("daily")}>일별</button>
        <button style={btn(mode === "monthly")} onClick={() => setMode("monthly")}>월별</button>
        <div style={{ width: 1, height: 24, background: "#d1d5db" }} />
        {mode === "daily" ? (
          <select value={day} onChange={e => setDay(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}>
            {dates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}>
            {months.map(m => <option key={m} value={m}>{m.replace("-", "년 ")}월</option>)}
          </select>
        )}
        <span style={{ fontSize: 12, color: "#64748b" }}>광고비 집행 제품 {rows.length}개</span>
      </div>

      {/* 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {[
          { t: "Ads spend", v: won(total.ads), s: "boosting 포함" },
          { t: "그중 boosting", v: won(total.boost), s: `Ads spend의 ${(total.share * 100).toFixed(1)}%` },
          { t: "GMV", v: won(total.gmv), s: "광고 집행 제품 합계" },
          { t: "ROI", v: roiText(total.roi), s: "GMV ÷ Ads spend" },
        ].map(k => (
          <div key={k.t} style={{ ...card, marginBottom: 0, padding: "18px" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{k.t}</div>
            <div style={{ fontSize: 22, fontWeight: 700, whiteSpace: "nowrap" }}>{k.v}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* Top 20 */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          Ads spend Top 20 제품 ({mode === "daily" ? day : month.replace("-", "년 ") + "월"})
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          막대 전체 = Ads spend · 주황 = 그중 boosting · 막대 옆 = Ads spend 금액 · 맨 오른쪽 = ROI
        </div>
        {top20.length ? (
          <div style={{ position: "relative", height: Math.max(220, top20.length * 30 + 60) }}>
            <canvas ref={barRef} />
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "#999" }}>이 기간에 광고비 데이터가 없어요</div>
        )}
      </div>

      {/* 상관관계 */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>boosting · Ads spend · ROI 상관관계</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          점 하나 = 제품 하나 · 오른쪽일수록 광고비가 크고, 위쪽일수록 ROI가 높아요 · 색이 진할수록 boosting 비중이 커요
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 12 }}>
          {[
            { t: "Ads spend ↔ ROI", c: cAds, hint: "음(−)이면 광고비를 많이 쓴 제품일수록 ROI가 낮은 경향" },
            { t: "boosting 비중 ↔ ROI", c: cBoost, hint: "양(+)이면 boosting 비중이 높은 제품일수록 ROI가 높은 경향" },
          ].map(x => (
            <div key={x.t} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{x.t}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{x.c.v} <span style={{ fontSize: 12, fontWeight: 500, color: "#475569" }}>{x.c.d}</span></div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{x.hint}</div>
            </div>
          ))}
        </div>

        {scatter.pts.length ? (
          <div style={{ position: "relative", height: 380 }}>
            <canvas ref={scRef} />
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "#999" }}>이 기간에 광고비 데이터가 없어요</div>
        )}
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
          상관계수는 제품 {corr.n}개의 순위 기준(스피어만)으로 계산했어요. -1~1 사이이고 0에 가까울수록 관계가 없어요.
          {scatter.clipped > 0 && ` ROI ${scatter.cap} 초과 제품 ${scatter.clipped}개는 맨 위에 ▲로 표시했어요.`}
          {total.boost === 0 && " 이 기간에는 boosting 입력값이 없어요."}
        </div>
      </div>
    </div>
  );
}
