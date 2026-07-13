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

function processData(series: ProductDailySeries[], tab: string) {
  const all = [...series].sort((a, b) => a.dt.localeCompare(b.dt));
  if (!all.length) return { labels: [], ordData: [], smpData: [], revData: [] };

  const last = all[all.length - 1];
  const lastDate = new Date(
    2000 + parseInt(last.dt.slice(0, 2)),
    parseInt(last.dt.slice(2, 4)) - 1,
    parseInt(last.dt.slice(4, 6))
  );

  const diffDays = (dt: string) => {
    const y = 2000+parseInt(dt.slice(0,2)), m = parseInt(dt.slice(2,4))-1, d = parseInt(dt.slice(4,6));
    return Math.round((lastDate.getTime() - new Date(y,m,d).getTime()) / 86400000);
  };

  // 데일리: 최근 14일 1일 단위
  if (tab === "데일리") {
    const filtered = all.filter(r => diffDays(r.dt) < 14);
    return {
      labels: filtered.map(r => r.dt.slice(2,4) + "/" + r.dt.slice(4,6)),
      ordData: filtered.map(r => r.ord),
      smpData: filtered.map(r => r.smp),
      revData: filtered.map(r => r.rev),
    };
  }

  // 위클리: 최근 7일 1일 단위
  if (tab === "위클리") {
    const filtered = all.filter(r => diffDays(r.dt) < 7);
    return {
      labels: filtered.map(r => r.dt.slice(2,4) + "/" + r.dt.slice(4,6)),
      ordData: filtered.map(r => r.ord),
      smpData: filtered.map(r => r.smp),
      revData: filtered.map(r => r.rev),
    };
  }

  // 먼슬리: 최근 30일 1일 단위
  if (tab === "먼슬리") {
    const filtered = all.filter(r => diffDays(r.dt) < 30);
    return {
      labels: filtered.map(r => r.dt.slice(2,4) + "/" + r.dt.slice(4,6)),
      ordData: filtered.map(r => r.ord),
      smpData: filtered.map(r => r.smp),
      revData: filtered.map(r => r.rev),
    };
  }

  // 전체 - 월별 합산
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

function OrderRevenueChart({ labels, ordData, revData, isMontly }: {
  labels: string[]; ordData: number[]; revData: number[]; isMontly?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !labels.length) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "주문수",
            data: ordData,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.07)",
            borderWidth: 2, pointRadius: 2, fill: true, tension: 0.35,
            yAxisID: "yLeft",
          },
          {
            label: "매출(KRW)",
            data: revData,
            borderColor: "#8b5cf6",
            backgroundColor: "transparent",
            borderWidth: 1.5, pointRadius: 2, fill: false, tension: 0.35,
            yAxisID: "yRight",
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: true, position: "bottom", labels: { font: { size: 11 }, color: "#64748b", boxWidth: 20, boxHeight: 2, padding: 14 } },
          tooltip: { callbacks: { label: (ctx) => {
            const v = ctx.raw as number;
            if (ctx.dataset.label === "매출(KRW)") return ` 매출: ₩${(v/1e6).toFixed(1)}M`;
            return ` 주문수: ${v.toLocaleString()}`;
          }}},
        },
        scales: {
          x: { 
            ticks: { 
              color: "#94a3b8", 
              font: { size: isMontly ? 8 : 10 }, 
              maxRotation: isMontly ? 45 : 30,
              autoSkip: false,
            }, 
            grid: { color: "#e2e6ea", lineWidth: 0.5 } 
          },
          yLeft: { position: "left", ticks: { color: "#3b82f6", font: { size: 10 }, callback: (v) => (v as number).toLocaleString() }, grid: { color: "#e2e6ea", lineWidth: 0.5 } },
          yRight: { position: "right", ticks: { color: "#8b5cf6", font: { size: 10 }, callback: (v) => (v as number / 1e6).toFixed(0) + "M" }, grid: { display: false } },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [labels, ordData, revData, isMontly]);

  return (
    <div className={styles.card}>
      <div className={styles.header}><div className={styles.title}>주문수 & 매출</div></div>
      <div style={{ position: "relative", height: 220 }}><canvas ref={canvasRef} /></div>
    </div>
  );
}

function SampleChart({ labels, smpData, isMontly }: { labels: string[]; smpData: number[]; isMontly?: boolean; }) {
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
          label: "샘플 출고수",
          data: smpData,
          backgroundColor: "#10b981aa",
          borderRadius: 3,
          borderSkipped: "bottom",
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { 
            ticks: { 
              color: "#94a3b8", 
              font: { size: isMontly ? 8 : 10 },
              maxRotation: isMontly ? 45 : 30,
              autoSkip: false,
            }, 
            grid: { display: false } 
          },
          y: { ticks: { color: "#10b981", font: { size: 10 }, callback: (v) => (v as number).toLocaleString() }, grid: { color: "#e2e6ea", lineWidth: 0.5 } },
        },
      },
    });
    return () => { chartRef.current?.destroy(); };
  }, [labels, smpData, isMontly]);

  return (
    <div className={styles.card}>
      <div className={styles.header}><div className={styles.title}>샘플 출고수</div></div>
      <div style={{ position: "relative", height: 220 }}><canvas ref={canvasRef} /></div>
    </div>
  );
}

export default function ProductDetailChart({ series }: Props) {
  const [activeTab, setActiveTab] = useState("데일리");
  const { labels, ordData, smpData, revData } = processData(series, activeTab);
  const isMontly = activeTab === "먼슬리";

  const tabLabel = activeTab === "데일리" ? "최근 14일 (1일 단위)" :
    activeTab === "위클리" ? "최근 7일 (1일 단위)" :
    activeTab === "먼슬리" ? "최근 30일 (1일 단위)" : "전체 (월별)";

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              fontSize: 12, padding: "5px 14px", borderRadius: 6, border: "1px solid",
              borderColor: activeTab === t ? "#3b82f6" : "#e2e6ea",
              background: activeTab === t ? "#3b82f6" : "#fff",
              color: activeTab === t ? "#fff" : "#64748b",
              cursor: "pointer", fontWeight: activeTab === t ? 600 : 400,
            }}>{t}</button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{tabLabel}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <OrderRevenueChart labels={labels} ordData={ordData} revData={revData} isMontly={isMontly} />
        <SampleChart labels={labels} smpData={smpData} isMontly={isMontly} />
      </div>
    </div>
  );
}
