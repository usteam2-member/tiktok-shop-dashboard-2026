"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { DailyRow } from "@/lib/data";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface Props {
  data: DailyRow[];
  metric: "revenue" | "orders" | "samples" | "creatives";
}

const METRIC_CONFIG = {
  revenue:    { label: "매출",       color: "#3b82f6", y2: { label: "주문수", color: "#f59e0b", key: "ord" as keyof DailyRow } },
  orders:     { label: "주문수",     color: "#f59e0b", y2: null },
  samples:    { label: "샘플 출고",  color: "#10b981", y2: null },
  creatives:  { label: "소재 업로드",color: "#3b82f6", y2: { label: "샘플 출고", color: "#ef4444", key: "smp" as keyof DailyRow } },
};

const METRIC_KEY: Record<string, keyof DailyRow> = {
  revenue: "krw", orders: "ord", samples: "smp", creatives: "aff",
};

export default function DailyChart({ data, metric }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    chartRef.current?.destroy();

    const cfg = METRIC_CONFIG[metric];
    const key = METRIC_KEY[metric];
    const labels = data.map((r) => r.dt.slice(2, 4) + "/" + r.dt.slice(4, 6));
    const vals = data.map((r) => r[key] as number);

    const datasets: any[] = [
      {
        label: cfg.label,
        data: vals,
        borderColor: cfg.color,
        backgroundColor: cfg.color + "14",
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.35,
        yAxisID: "y",
      },
    ];

    const scales: any = {
      x: {
        ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 45, autoSkip: data.length > 60 },
        grid: { color: "#e2e6ea", lineWidth: 0.5 },
      },
      y: {
        position: "left",
        ticks: {
          color: "#94a3b8", font: { size: 10 },
          callback: (v: number) => metric === "revenue" ? (v / 1e6).toFixed(0) + "M" : v.toLocaleString(),
        },
        grid: { color: "#e2e6ea", lineWidth: 0.5 },
      },
    };

    if (cfg.y2) {
      datasets.push({
        label: cfg.y2.label,
        data: data.map((r) => r[cfg.y2!.key] as number),
        borderColor: cfg.y2.color,
        borderDash: metric === "creatives" ? [4, 4] : [],
        backgroundColor: "transparent",
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
        tension: 0.35,
        yAxisID: "y2",
      });
      scales.y2 = {
        position: "right",
        ticks: { color: cfg.y2.color, font: { size: 10 }, callback: (v: number) => v.toLocaleString() },
        grid: { display: false },
      };
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw as number;
                if (ctx.dataset.label === "매출") return "₩" + (v / 1e6).toFixed(1) + "M";
                return ctx.dataset.label + ": " + v.toLocaleString();
              },
            },
          },
        },
        scales,
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [data, metric]);

  const cfg = METRIC_CONFIG[metric];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>
          {metric === "revenue" && "일별 매출 & 주문수"}
          {metric === "creatives" && "일별 소재 업로드 & 샘플 출고"}
          {metric === "orders" && "일별 주문수 추이"}
          {metric === "samples" && "일별 샘플 출고 추이"}
        </div>
      </div>
      <div style={{ position: "relative", height: 220 }}>
        <canvas ref={canvasRef} />
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} style={{ background: cfg.color }} />
          {cfg.label}
        </span>
        {cfg.y2 && (
          <span className={styles.legendItem}>
            <span className={styles.legendLine} style={{
              background: metric === "creatives" ? "transparent" : cfg.y2.color,
              borderTop: metric === "creatives" ? `2px dashed ${cfg.y2.color}` : "none",
            }} />
            {cfg.y2.label}
          </span>
        )}
      </div>
    </div>
  );
}
