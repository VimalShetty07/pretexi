"use client";

import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/80", className)} aria-hidden />;
}

export function PageSkeleton({
  lines = 3,
  showCards = true,
}: {
  lines?: number;
  showCards?: boolean;
}) {
  return (
    <div className="protexi-dash-marketing flex flex-col gap-4" role="status" aria-live="polite">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SkeletonBlock className="mb-3 h-3 w-28" />
        <SkeletonBlock className="mb-2 h-8 w-64" />
        <SkeletonBlock className="h-3 w-48" />
      </div>
      {showCards ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
              <SkeletonBlock className="mb-3 h-3 w-16" />
              <SkeletonBlock className="mb-2 h-7 w-20" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
          ))}
        </div>
      ) : null}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBlock key={i} className={cn("mb-2 h-4", i === lines - 1 ? "mb-0 w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <AlertTriangle className="mb-3 h-5 w-5 text-red-600" />
      <p className="text-sm font-semibold text-red-700">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-8 items-center rounded-md border border-red-300 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-center">
      <Inbox className="mb-3 h-5 w-5 text-slate-400" />
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
