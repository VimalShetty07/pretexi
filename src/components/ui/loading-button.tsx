"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
};

export function LoadingButton({
  loading = false,
  loadingLabel = "Loading...",
  children,
  icon,
  className,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <button className={cn(className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}
