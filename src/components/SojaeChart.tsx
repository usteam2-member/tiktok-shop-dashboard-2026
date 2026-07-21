"use client";
import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { SojaeRow } from "@/lib/data";
import styles from "./ChartCard.module.css";

Chart.register(...registerables);

interface Props {
  data: SojaeRow[];
}

interface MonthlyData {
  month: string;
  newCount: number;
  revCount: number;
}

export default function SojaeChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    // 월별로 데이터 그룹화
    const monthMap: Record<string, { newCount: number; revCount: number }> = {};
    
    for (const row of data) {
      const month = row.dt.slice(0, 6); // YYYYMM
      if (!monthMap[month]) {
        monthMap[month] = { newCount: 0, revCount: 0 };
      }
      
      // name에 "신규" 또는 "매출" 포함 여부로 구분
      if (row.name.includes("신규")) {
        monthMap[month].newCount += row.count;
      } else {
        monthMap[month].revCount += row.count;
      }
    }

    // 월별 레이블 변환
    const MONTH_LABEL: Record<string, string> = {
      "2601":"1월","2602":"2월","2603":"3월","2604":"4월",
      "2605":"5월","2606":"6월","2607":"7월","2608":"8월",
      "2609":"9월","2610":"10월","2611":"11월","2612":"12월",
    };

    const sortedMonths = Object.keys(monthMap).sort();
    const labels = sortedMonths.map(m => MONTH_LABEL[m] || m);
    const newData = sortedMonths.map(m => monthMap[m].newCount);
    const revData = sortedMonths.map(m => monthMap[m].revCount);

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "신규 소재",
            data: newData,
            backgroundColor: "#1e293b",
            borderRadius: 4,
            borderSkipped: "bottom",
          },
          {
            label: "매출 소재",
            data: revData,
            backgroundColor: "#3b82f6",
            borderRadius: 4,
            borderSkipped: "bottom",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              font: { size: 11 },
              color: "#64748b",
              boxWidth: 10,
              boxHeight: 10,
              padding: 14,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#94a3b8", font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#94a3b8",
              font: { size: 10 },
              callback: (v) => (v as number).toLocaleString(),
            },
            grid: { color: "#e2e6ea", lineWidth: 0.5 },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [data]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>월별 소재 현황 (신규 · 매출 소재)</div>
      </div>
      <div style={{ position: "relative", height: 240 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
