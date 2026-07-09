"use client";
import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { ProductDailySeries } from "@/lib/useSheetData";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface Props {
  series: ProductDailySeries[];
}

const TABS = ["데일리", "위클리", "먼슬리", "전체"];

const MONTH_LABEL: Record<string, string> = {
  "2601":"1월","2602":"2월","2603":"3월","2604":"4월",
  "2605":"5월","2606":"6월","2607":"7월","2608":"8월",
  "2609":"9월","2610":"10월","2611":"11월","2612":"12월",
};

function filterByTab(series: ProductDailySeries[], tab: string) {
  const all = [...series].sort((a, b) => a.dt.localeCompare(b.dt));
  const last = all[all.length - 1];
  if (!last) return { labels: [], ordData: [], smpData: [], revData: [] };

  const lastDate = new Date(
    2000 + parseInt(last.dt.slice(0, 2)),
    parseInt(last.dt.slice(2, 4)) - 1,
    parseInt(last.dt.slice(4, 6))
  );

  let filtered = all;

  if (tab === "데일리") {
    // 최근 14일
    filtered = all.filter(r => {
      const y = 2000+parseInt(r.dt.slice(0,2)), m = parseInt(r.dt.slice(2,4))-1, d = parseInt(r.dt.slice(4,6));
      return Math.round((lastDate.getTime() - new Date(y,m,d).getTime()) / 86400000) < 14;
    });
    return {
      labels: filtered.map(r => r.dt.slice(2,4) + "/" + r.dt.slice(4,6)),
      ordData: filtered.map(r => r.ord),
      smpData: filtered.map(r => r.smp),
      revData: filtered.map(r => r.rev),
    };
  }

  if (tab === "위클리") {
    // 최근 90일 → 7일 단위 합산
    const recent = all.filter(r => {
      const y = 2000+parseInt(r.dt.slice(0,2)), m = parseInt(r.dt.slice(2,4))-1, d = parseInt(r.dt.slice(4,6));
      return Math.round((lastDate.getTime() - new Date(y,m,d).getTime()) / 86400000) < 90;
    });
    const labels: string[] = [];
    const ordData: number[] = [];
    const smpData: number[] = [];
    const revData: number[] = [];
    for (let i = 0; i < recent.length; i += 7) {
      const chunk = recent.slice(i, i + 7);
      labels.push(chunk[0].dt.slice(2,4) + "/" + chunk[0].dt.slice(4,6));
      ordData.push(chunk.reduce((a, r) => a + r.ord, 0));
      smpData.push(chunk.reduce((a, r) => a + r.smp, 0));
      revData.push(chunk.reduce((a, r) => a + r.rev, 0));
    }
    return { labels, ordData, smpData, revData };
  }

  if (tab === "먼슬리") {
    // 월별 합산
    const monthMap: Record<string, ProductDailySeries[]> = {};
    for (const r of all) {
      const m = r.dt.slice(0, 4);
      if (!monthMap[m]) monthMap[m] = [];
      monthMap[m].push(r);
    }
    const labels: string[] = [];
    const ordData: number[] = [];
    const smpData: number[] = [];
    const revData: number[] = [];
    for (const [m, chunk] of Object.entries(monthMap).sort()) {
      labels.push(MONTH_LABEL[m] || m);
      ordData.push(chunk.reduce((a, r) => a + r.ord, 0));
      smpData.push(chunk.reduce((a, r) => a + r.smp, 0));
      revData.push(chunk.reduce((a, r) => a + r.rev, 0));
    }
    return { labels, ordData, smpData, revData };
  }

  // 전체 - 월별
  const monthMap: Record<string, ProductDailySeries[]> = {};
  for (const r of all) {
    const m = r.dt.slice(0, 4);
    if (!monthMap[m]) monthMap[m] = [];
    monthMap[m].push(r);
  }
  const labels: string[] = [];
  const ordData: number[] = [];
  const smpData: number[] = [];
  const revData: number[] = [];
  for (const [m, chunk] of Object.entries(monthMap).sort()) {
    labels.push(MONTH_LABEL[m] || m);
    ordData.push(chunk.reduce((a, r) => a + r.ord, 0));
    smpData.push(chunk.reduce((a, r) => a + r.smp, 0));
    revData.push(chunk.reduce((a, r) => a + r.rev, 0));
  }
  return { labels, ordData, smpData, revData };
}

function MiniChart({ title, labels, data, color }: {
  title: string; labels: string[]; data: number[]; color: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !labels.length) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: title,
          data,
          backgroundColor: color + "cc",
          borderRadius: 3,
          borderSkipped: "bottom",
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#94a3b8", font: { size: 9 }, maxRotation: 30, autoSkip: true }, grid: { display: false } },
          y: { ticks: { color: "#94a3b8", font: { size: 9 }, callback: (v) => (v as number).toLocaleString() }, grid: { color: "#e2e6ea", lineWidth: 0.5 } },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [labels, data]);

  return (
    <div className={styles.card}>
      <div className={styles.header}><div className={styles.title}>{title}</div></div>
      <div style={{ position: "relative", height: 180 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default function ProductDetailChart({ series }: Props) {
  const [activeTab, setActiveTab] = useState("데일리");
  const { labels, ordData, smpData, revData } = filterByTab(series, activeTab);

  return (
    <div style={{ marginTop: 24 }}>
      {/* 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              fontSize: 12, padding: "5px 14px",
              borderRadius: 6, border: "1px solid",
              borderColor: activeTab === t ? "#3b82f6" : "#e2e6ea",
              background: activeTab === t ? "#3b82f6" : "#fff",
              color: activeTab === t ? "#fff" : "#64748b",
              cursor: "pointer", fontWeight: activeTab === t ? 600 : 400,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 차트 3개 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <MiniChart title="주문수" labels={labels} data={ordData} color="#3b82f6" />
        <MiniChart title="샘플 출고수" labels={labels} data={smpData} color="#10b981" />
        <MiniChart title="매출 (KRW)" labels={labels} data={revData} color="#8b5cf6" />
      </div>
    </div>
  );
}
