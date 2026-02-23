"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  ClipboardList,
  CheckCircle2,
  Upload,
  XCircle,
  FileCheck,
  Loader2,
  User,
  Briefcase,
  Mail,
  Phone,
} from "lucide-react";
import Link from "next/link";

interface WorkerProfile {
  name: string;
  job_title: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  nationality: string | null;
  status: string;
  visa_expiry: string | null;
}

interface ChecklistSummaryItem {
  id: string;
  item_number: number;
  description: string;
  status: string;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function PortalPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [checklist, setChecklist] = useState<ChecklistSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [prof, cl] = await Promise.all([
        api.get<WorkerProfile>("/portal/me", token ?? undefined),
        api.get<ChecklistSummaryItem[]>("/portal/checklist", token ?? undefined),
      ]);
      setProfile(prof);
      setChecklist(cl);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 80 }}>
        <Loader2 className="animate-spin text-brand-500" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 40 }}>
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-800" style={{ padding: "12px 16px", fontSize: 13 }}>
          No employee profile linked to your account.
        </div>
      </div>
    );
  }

  const verified = checklist.filter((i) => i.status === "verified" || i.status === "not_applicable").length;
  const uploaded = checklist.filter((i) => i.status === "uploaded").length;
  const rejected = checklist.filter((i) => i.status === "rejected").length;
  const notStarted = checklist.length - verified - uploaded - rejected;
  const pct = checklist.length > 0 ? Math.round((verified / checklist.length) * 100) : 0;
  const visaDays = daysUntil(profile.visa_expiry);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 tracking-tight">My Dashboard</h1>
      <p className="text-sm text-[var(--muted-foreground)]" style={{ marginTop: 4, marginBottom: 24 }}>
        Welcome back, {profile.name}
      </p>

      {/* Profile card */}
      <div
        className="bg-white rounded-2xl border border-[var(--border)]"
        style={{ padding: "24px 28px", marginBottom: 20 }}
      >
        <div className="flex items-center" style={{ gap: 18 }}>
          <div
            className="flex items-center justify-center rounded-2xl bg-brand-100 text-brand-600 font-bold shrink-0"
            style={{ width: 56, height: 56, fontSize: 18 }}
          >
            {profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-brand-900">{profile.name}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{profile.job_title}</p>
          </div>
        </div>
        <div
          className="flex items-center flex-wrap border-t border-[var(--border)]"
          style={{ marginTop: 16, paddingTop: 14, gap: 24 }}
        >
          {profile.email && (
            <div className="flex items-center text-sm text-brand-800" style={{ gap: 6 }}>
              <Mail className="text-[var(--muted-foreground)]" style={{ width: 14, height: 14 }} />
              {profile.email}
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center text-sm text-brand-800" style={{ gap: 6 }}>
              <Phone className="text-[var(--muted-foreground)]" style={{ width: 14, height: 14 }} />
              {profile.phone}
            </div>
          )}
          {profile.department && (
            <div className="flex items-center text-sm text-brand-800" style={{ gap: 6 }}>
              <Briefcase className="text-[var(--muted-foreground)]" style={{ width: 14, height: 14 }} />
              {profile.department}
            </div>
          )}
          {profile.nationality && (
            <div className="flex items-center text-sm text-brand-800" style={{ gap: 6 }}>
              <User className="text-[var(--muted-foreground)]" style={{ width: 14, height: 14 }} />
              {profile.nationality}
            </div>
          )}
        </div>
      </div>

      {/* Visa alert */}
      {visaDays !== null && visaDays <= 90 && visaDays > 0 && (
        <div
          className="flex items-center rounded-xl bg-amber-50 border border-amber-200 text-amber-800"
          style={{ padding: "12px 18px", marginBottom: 20, gap: 10, fontSize: 13 }}
        >
          <XCircle style={{ width: 16, height: 16 }} className="shrink-0" />
          <span>Your visa expires on <strong>{fmt(profile.visa_expiry)}</strong> ({visaDays} days remaining). Contact HR if you need to extend.</span>
        </div>
      )}

      {/* Document compliance summary */}
      <div
        className="bg-white rounded-2xl border border-[var(--border)]"
        style={{ padding: "20px 24px", marginBottom: 20 }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <ClipboardList style={{ width: 18, height: 18 }} className="text-brand-600" />
            <h3 className="text-sm font-semibold text-brand-900">Document Compliance</h3>
          </div>
          <Link
            href="/portal/documents"
            className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
          >
            Upload Documents →
          </Link>
        </div>

        {/* Progress bar */}
        <div className="rounded-full bg-gray-100 overflow-hidden" style={{ height: 8, marginBottom: 14 }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? "#10b981" : pct >= 50 ? "#3b82f6" : "#f59e0b",
            }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5" style={{ gap: 12 }}>
          <div className="text-center">
            <div className="text-lg font-bold text-brand-900">{checklist.length}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-600">{verified}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Verified</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{uploaded}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Awaiting Review</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{rejected}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Rejected</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-500">{notStarted}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Pending</div>
          </div>
        </div>

        {pct === 100 && (
          <div
            className="flex items-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700"
            style={{ padding: "10px 14px", marginTop: 16, gap: 8, fontSize: 13 }}
          >
            <CheckCircle2 style={{ width: 16, height: 16 }} />
            <span className="font-medium">All documents verified — you are fully compliant!</span>
          </div>
        )}

        {/* Pending items quick list */}
        {notStarted > 0 && (
          <div style={{ marginTop: 16 }}>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide" style={{ marginBottom: 8 }}>
              <Upload style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
              Documents you need to upload ({notStarted})
            </p>
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {checklist
                .filter((i) => i.status === "not_started")
                .slice(0, 8)
                .map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-200 text-amber-800"
                    style={{ padding: "4px 10px", fontSize: 11, gap: 4 }}
                    title={item.description}
                  >
                    <FileCheck style={{ width: 11, height: 11 }} />
                    #{item.item_number}
                  </span>
                ))}
              {notStarted > 8 && (
                <span className="inline-flex items-center rounded-lg bg-gray-100 text-gray-600" style={{ padding: "4px 10px", fontSize: 11 }}>
                  +{notStarted - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Rejected items */}
        {rejected > 0 && (
          <div style={{ marginTop: 16 }}>
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide" style={{ marginBottom: 8 }}>
              <XCircle style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
              Rejected — please re-upload ({rejected})
            </p>
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {checklist
                .filter((i) => i.status === "rejected")
                .map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center rounded-lg bg-red-50 border border-red-200 text-red-800"
                    style={{ padding: "4px 10px", fontSize: 11, gap: 4 }}
                    title={item.description}
                  >
                    <FileCheck style={{ width: 11, height: 11 }} />
                    #{item.item_number}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
