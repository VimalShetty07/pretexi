"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

/** Visa bucket counts — must match /dashboard/overview `visa_breakdown` */
export type VisaBreakdown = {
  expired: number;
  expiring_30: number;
  expiring_60: number;
  expiring_90: number;
  valid: number;
  no_visa: number;
};

/**
 * Bar chart using **live** API counts (no synthetic monthly series).
 * One bar per visa status bucket from the backend.
 */
export function VisaStatusBreakdownBarChart({ breakdown }: { breakdown: VisaBreakdown }) {
  const data = useMemo(
    () => ({
      labels: ["Expired", "≤30d", "31–60d", "61–90d", "Valid", "No visa"],
      datasets: [
        {
          label: "Workers",
          data: [
            breakdown.expired,
            breakdown.expiring_30,
            breakdown.expiring_60,
            breakdown.expiring_90,
            breakdown.valid,
            breakdown.no_visa,
          ],
          backgroundColor: [
            "#DC2626",
            "#F97316",
            "#FB923C",
            "#FBBF24",
            "#2563EB",
            "#94A3B8",
          ],
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.55,
          categoryPercentage: 0.65,
        },
      ],
    }),
    [breakdown]
  );

  const maxVal = Math.max(
    1,
    ...(data.datasets[0].data as number[])
  );

  return (
    <div className="h-[180px] w-full">
      <Bar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0F172A",
              titleColor: "#fff",
              bodyColor: "#94A3B8",
              cornerRadius: 8,
              padding: 10,
              callbacks: {
                label: (ctx) => ` ${ctx.parsed.y ?? 0} worker(s)`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { font: { size: 11, weight: 500 }, maxRotation: 45, minRotation: 0 },
            },
            y: {
              grid: { color: "#F1F5F9" },
              border: { display: false },
              ticks: {
                stepSize: maxVal <= 10 ? 1 : undefined,
                font: { size: 12 },
              },
              min: 0,
              suggestedMax: Math.max(5, maxVal + 1),
            },
          },
        }}
      />
    </div>
  );
}

/** @deprecated Use VisaStatusBreakdownBarChart with API breakdown — kept for typing searches */
export function ComplianceBarChart({ breakdown }: { breakdown: VisaBreakdown }) {
  return <VisaStatusBreakdownBarChart breakdown={breakdown} />;
}

export function VisaDoughnutChart({
  valid,
  expiring,
  expired,
  noVisa = 0,
}: {
  valid: number;
  expiring: number;
  expired: number;
  noVisa?: number;
}) {
  const data = useMemo(
    () => ({
      labels: ["Valid", "Expiring", "Expired", "No visa on file"],
      datasets: [
        {
          data: [
            Math.max(valid, 0),
            Math.max(expiring, 0),
            Math.max(expired, 0),
            Math.max(noVisa, 0),
          ],
          backgroundColor: ["#2563EB", "#BFDBFE", "#FCA5A5", "#E2E8F0"],
          borderColor: ["#2563EB", "#BFDBFE", "#F87171", "#CBD5E1"],
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    }),
    [valid, expiring, expired, noVisa]
  );

  const total = valid + expiring + expired + noVisa;

  const chartData = useMemo(() => {
    if (total <= 0) {
      return {
        labels: ["No data"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#E2E8F0"],
            borderColor: ["#CBD5E1"],
            borderWidth: 2,
            hoverOffset: 0,
          },
        ],
      };
    }
    return data;
  }, [data, total]);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="h-[140px] w-[140px] shrink-0">
        <Doughnut
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "#0F172A",
                titleColor: "#fff",
                bodyColor: "#94A3B8",
                cornerRadius: 8,
                padding: 10,
                enabled: total > 0,
              },
            },
          }}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex items-start gap-2">
          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#2563EB]" />
          <div>
            <div className="text-[13px] font-semibold text-[#0A0F1E]">Valid</div>
            <div className="text-[11px] text-[#94A3B8]">{valid} visas</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#BFDBFE]" />
          <div>
            <div className="text-[13px] font-semibold text-[#0A0F1E]">Expiring</div>
            <div className="text-[11px] text-[#94A3B8]">{expiring} visas</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#FCA5A5]" />
          <div>
            <div className="text-[13px] font-semibold text-[#0A0F1E]">Expired</div>
            <div className="text-[11px] text-[#94A3B8]">{expired} visas</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-[#CBD5E1] bg-[#E2E8F0]" />
          <div>
            <div className="text-[13px] font-semibold text-[#0A0F1E]">No visa on file</div>
            <div className="text-[11px] text-[#94A3B8]">{noVisa} workers</div>
          </div>
        </div>
      </div>
    </div>
  );
}
