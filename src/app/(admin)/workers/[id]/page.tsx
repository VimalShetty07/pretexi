"use client";

import { useEffect, useMemo, useState, Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import DocumentChecklist, { type ChecklistItem } from "./checklist";
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock3,
  FileText,
  FolderOpen,
  FileSignature,
  Plus,
  LayoutDashboard,
  User,
  ClipboardList,
  ScrollText,
  ShieldCheck,
  Briefcase,
  Plane,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

interface WorkerDetail {
  id: string;
  name: string;
  job_title: string;
  email: string | null;
  phone?: string | null;
  nationality?: string | null;
  department: string | null;
  salary?: number;
  route?: string;
  work_location?: string | null;
  status: string;
  stage?: string;
  risk_level: string;
  visa_expiry: string | null;
  start_date?: string | null;
  /** Tenant that owns this worker — used for per-client checklist templates */
  organisation_id?: string | null;
}

type MainTab = "overview" | "details" | "checklist" | "records" | "bgverify";
type RecordsSub = "documents" | "files" | "contract";

function formatDetailDate(iso: string | null | undefined): string {
  return iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
}

function formatSalaryGbp(salary: number | null | undefined): string {
  if (salary == null || Number.isNaN(Number(salary))) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(
    Number(salary)
  );
}

function WorkerDetailInner() {
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>("overview");
  const [recordsSub, setRecordsSub] = useState<RecordsSub>("documents");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [bgRefName, setBgRefName] = useState("");
  const [bgRefEmail, setBgRefEmail] = useState("");
  const [bgRefs, setBgRefs] = useState<Array<{ id: string; referee_name: string; referee_email: string; status: string }>>([]);

  const loadAll = async () => {
    if (!token || !params?.id) return;
    try {
      setLoading(true);
      const [data, bg] = await Promise.all([
        api.get<WorkerDetail>(`/workers/${params.id}`, token),
        api.get<{ references: Array<{ id: string; referee_name: string; referee_email: string; status: string }> }>(
          `/bgverify/worker/${params.id}`,
          token
        ),
      ]);
      const orgForChecklist =
        data.organisation_id?.trim() || user?.organisation_id?.trim() || "";
      const checklistPath =
        orgForChecklist.length > 0
          ? `/workers/${params.id}/checklist?organisation_id=${encodeURIComponent(orgForChecklist)}`
          : `/workers/${params.id}/checklist`;
      const items = await api.get<ChecklistItem[]>(checklistPath, token);
      setWorker(data);
      setChecklist(items);
      setBgRefs(bg.references || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load worker");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, params?.id, user?.organisation_id]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "records" || t === "overview" || t === "details" || t === "checklist" || t === "bgverify") {
      setMainTab(t);
    }
  }, [searchParams]);

  const setTab = (tab: MainTab) => {
    setMainTab(tab);
    const u = new URLSearchParams(searchParams.toString());
    u.set("tab", tab);
    router.replace(`/workers/${params.id}?${u.toString()}`, { scroll: false });
  };

  const addReference = async () => {
    if (!token || !params?.id || !bgRefName || !bgRefEmail) return;
    await api.post(
      `/bgverify/worker/${params.id}/references`,
      { referee_name: bgRefName, referee_email: bgRefEmail, referee_company: "Previous Employer" },
      token
    );
    setBgRefName("");
    setBgRefEmail("");
    await loadAll();
  };

  const sendEmails = async () => {
    if (!token || !params?.id) return;
    await api.post(`/bgverify/worker/${params.id}/send-emails`, {}, token);
    await loadAll();
  };

  const verifiedDocs = checklist.filter((c) => c.status === "verified" || c.status === "not_applicable").length;
  const checklistPct = checklist.length > 0 ? Math.round((verifiedDocs / checklist.length) * 100) : 0;
  const rejectedDocs = checklist.filter((c) => c.status === "rejected").length;
  const inReviewDocs = checklist.filter((c) => c.status === "uploaded" || c.status === "not_started").length;
  const visaDays =
    worker?.visa_expiry ? Math.ceil((new Date(worker.visa_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const riskTone =
    worker?.risk_level === "critical"
      ? { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" }
      : worker?.risk_level === "high"
        ? { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" }
        : worker?.risk_level === "medium"
          ? { bg: "#fffbeb", border: "#fde68a", text: "#a16207" }
          : { bg: "#ecfdf3", border: "#bbf7d0", text: "#15803d" };

  const initials = useMemo(() => {
    if (!worker?.name) return "?";
    const parts = worker.name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }, [worker?.name]);

  const allFiles = useMemo(() => {
    const out: { name: string; date: string; item: string }[] = [];
    for (const item of checklist) {
      for (const d of item.documents) {
        out.push({
          name: d.file_name,
          date: d.upload_date || "",
          item: item.description,
        });
      }
    }
    return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [checklist]);

  if (loading) return <p className="text-sm text-gray-500">Loading employee…</p>;
  if (error || !worker) return <p className="text-sm text-red-600">{error || "Employee not found"}</p>;

  const isActive = worker.status?.toLowerCase() === "active";

  const mainTabs: { id: MainTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "details", label: "Details", icon: User },
    { id: "checklist", label: "Checklist", icon: ClipboardList },
    { id: "records", label: "Records", icon: ScrollText },
    { id: "bgverify", label: "BG verify", icon: ShieldCheck },
  ];

  return (
    <div className="flex w-full min-w-0 max-w-none flex-col gap-0">
      <div className="mb-4">
        <Link
          href="/workers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Employees
        </Link>
      </div>

      {/* Shell aligned with admin theme: #0F2050 top bar + blue accents */}
      <div className="overflow-hidden rounded-2xl border border-[#E8EEFF] bg-white shadow-[0_8px_32px_-12px_rgba(37,99,235,0.12)]">
        {/* Top band — matches protexi-adm-shell topnav */}
        <div className="relative overflow-hidden bg-[#0F2050] px-5 py-5 text-white md:px-8 md:py-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-100"
            style={{
              background: "radial-gradient(ellipse at 15% 50%, rgba(37, 99, 235, 0.35), transparent 55%)",
            }}
          />
          <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="flex min-w-0 gap-4">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold ring-2 ring-white/20">
                {initials}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight md:text-2xl">{worker.name}</h1>
                <p className="mt-1 text-sm text-white/75">
                  {worker.job_title}
                  {worker.department ? ` · ${worker.department}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      isActive ? "bg-emerald-400/25 text-emerald-100 ring-1 ring-emerald-300/40" : "bg-white/10 text-white/80 ring-1 ring-white/20"
                    }`}
                  >
                    {isActive ? "Active" : worker.status || "—"}
                  </span>
                  <span className="text-xs text-white/65">
                    {worker.email || "—"}
                    {visaDays != null && ` · Visa ${visaDays}d`}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary nav — same language as adm-tn-btn */}
            <nav className="flex flex-wrap gap-1 lg:justify-end">
              {mainTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors md:text-[13px] ${
                    mainTab === id
                      ? "bg-[rgba(37,99,235,0.45)] text-white ring-1 ring-white/25"
                      : "text-white/55 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 opacity-90" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content area — matches dashboard card surround */}
        <div className="border-t border-[#E8EEFF] bg-[#F8FAFF] px-4 py-6 md:px-8 md:py-8">
          {mainTab === "overview" && (
            <EmployeeDashboard
              worker={worker}
              checklist={checklist}
              bgRefs={bgRefs}
              verifiedDocs={verifiedDocs}
              rejectedDocs={rejectedDocs}
              inReviewDocs={inReviewDocs}
              checklistPct={checklistPct}
              visaDays={visaDays}
              riskTone={riskTone}
              onGoChecklist={() => setTab("checklist")}
              onGoBg={() => setTab("bgverify")}
              onGoDetails={() => setTab("details")}
            />
          )}

          {mainTab === "details" && (
            <div className="flex flex-col gap-8">
              <header className="border-b border-[#E8EEFF] pb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#3B82F6]">Employee record</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#0A0F1E] md:text-2xl">Details</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#64748B]">
                  Full field list grouped by area. Use the tabs above for checklist, files, and references.
                </p>
              </header>

              <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-2">
                <AspectCard title="Profile & contact" subtitle="Identity and how to reach this person" icon={User} barClass="bg-[#2563EB]">
                  <div className="divide-y divide-[#F0F4FF]">
                    <DashRow label="Full name" value={worker.name} />
                    <DashRow
                      label="Email"
                      value={
                        worker.email ? (
                          <a href={`mailto:${worker.email}`} className="text-[#2563EB] hover:underline">
                            {worker.email}
                          </a>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <DashRow label="Phone" value={worker.phone || "—"} />
                    <DashRow label="Nationality" value={worker.nationality || "—"} />
                  </div>
                </AspectCard>

                <AspectCard
                  title="Employment & role"
                  subtitle="Job, site, and contract-related fields"
                  icon={Briefcase}
                  barClass="bg-[#7C3AED]"
                >
                  <div className="divide-y divide-[#F0F4FF]">
                    <DashRow label="Job title" value={worker.job_title || "—"} />
                    <DashRow label="Department" value={worker.department || "—"} />
                    <DashRow label="Work location" value={worker.work_location || "—"} />
                    <DashRow label="Employment status" value={worker.status || "—"} />
                    <DashRow label="Onboarding stage" value={worker.stage || "—"} />
                    <DashRow label="Start date" value={formatDetailDate(worker.start_date)} />
                    <DashRow label="Salary (reported)" value={formatSalaryGbp(worker.salary)} />
                  </div>
                </AspectCard>

                <AspectCard title="Immigration" subtitle="Sponsor and visa dates" icon={Plane} barClass="bg-[#0D9488]">
                  <div className="divide-y divide-[#F0F4FF]">
                    <DashRow label="Immigration route" value={worker.route || "—"} />
                    <DashRow label="Visa expiry" value={formatDetailDate(worker.visa_expiry)} />
                    <DashRow
                      label="Days to expiry"
                      value={
                        worker.visa_expiry
                          ? (() => {
                              const d = Math.ceil(
                                (new Date(worker.visa_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                              );
                              if (d < 0) return `${Math.abs(d)} days overdue`;
                              return `${d} days`;
                            })()
                          : "—"
                      }
                    />
                  </div>
                </AspectCard>

                <AspectCard title="Risk & monitoring" subtitle="Compliance posture for this worker" icon={ShieldAlert} barClass="bg-[#DC2626]">
                  <div
                    className="rounded-xl border p-4"
                    style={{ background: riskTone.bg, borderColor: riskTone.border }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Risk level</p>
                    <p className="mt-1 text-2xl font-extrabold capitalize" style={{ color: riskTone.text }}>
                      {worker.risk_level}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-[#64748B]">
                      Keep documents and visa evidence aligned with this rating. Review checklist and records if level is elevated.
                    </p>
                  </div>
                </AspectCard>
              </div>
            </div>
          )}

          {mainTab === "checklist" && (
            <DocumentChecklist
              workerId={params.id}
              organisationId={worker.organisation_id?.trim() || user?.organisation_id || null}
              items={checklist}
              onRefresh={loadAll}
            />
          )}

          {mainTab === "records" && (
            <div className="space-y-5">
              {/* Sub-tabs */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1 border-b border-[#E8EEFF] pb-0">
                  {(
                    [
                      { id: "documents" as const, label: "Documents", icon: FileText },
                      { id: "files" as const, label: "Files", icon: FolderOpen },
                      { id: "contract" as const, label: "Contract", icon: FileSignature },
                    ] as const
                  ).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRecordsSub(id)}
                      className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                        recordsSub === id
                          ? "border-[#1D4ED8] font-bold text-[#1D4ED8]"
                          : "border-transparent text-slate-500 hover:text-[#1e293b]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setTab("checklist")}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] px-4 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.35)] transition hover:brightness-105 sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  Add / upload
                </button>
              </div>

              {recordsSub === "documents" && (
                <div className="overflow-hidden rounded-xl border border-[#E8EEFF] bg-white shadow-sm">
                  {checklist.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-500">No compliance items yet.</p>
                  ) : (
                    checklist.map((item, i) => (
                      <DocumentRow
                        key={item.id}
                        item={item}
                        isLast={i === checklist.length - 1}
                        hovered={hoverRow === item.id}
                        onHover={(v) => setHoverRow(v ? item.id : null)}
                        onOpen={() => setTab("checklist")}
                      />
                    ))
                  )}
                </div>
              )}

              {recordsSub === "files" && (
                <div className="overflow-hidden rounded-xl border border-[#E8EEFF] bg-white shadow-sm">
                  {allFiles.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-500">No uploaded files yet. Use Checklist to upload.</p>
                  ) : (
                    allFiles.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className={`flex items-center justify-between gap-4 px-4 py-3.5 md:px-5 ${i < allFiles.length - 1 ? "border-b border-slate-100" : ""}`}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{f.name}</p>
                            <p className="truncate text-xs text-slate-500">{f.item}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-slate-500">
                          {f.date ? new Date(f.date).toLocaleDateString("en-GB") : "—"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {recordsSub === "contract" && (
                <div className="rounded-xl border border-dashed border-[#E8EEFF] bg-white px-6 py-12 text-center">
                  <FileSignature className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">Contract & terms</p>
                  <p className="mt-1 text-xs text-slate-500">Link employment contracts here when available in Protexi.</p>
                </div>
              )}
            </div>
          )}

          {mainTab === "bgverify" && (
            <div className="rounded-xl border border-[#E8EEFF] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Reference checks</h3>
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Reference name"
                  value={bgRefName}
                  onChange={(e) => setBgRefName(e.target.value)}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Reference email"
                  value={bgRefEmail}
                  onChange={(e) => setBgRefEmail(e.target.value)}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)] hover:brightness-105"
                  onClick={addReference}
                >
                  Add reference
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#64748B] hover:border-[#3B82F6] hover:text-[#2563EB]"
                  onClick={sendEmails}
                >
                  Send emails
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {bgRefs.map((r) => (
                  <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-slate-900">{r.referee_name}</p>
                    <p className="text-xs text-slate-600">
                      {r.referee_email} · {r.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type RiskTone = { bg: string; border: string; text: string };

function EmployeeDashboard({
  worker,
  checklist,
  bgRefs,
  verifiedDocs,
  rejectedDocs,
  inReviewDocs,
  checklistPct,
  visaDays,
  riskTone,
  onGoChecklist,
  onGoBg,
  onGoDetails,
}: {
  worker: WorkerDetail;
  checklist: ChecklistItem[];
  bgRefs: Array<{ id: string; referee_name: string; referee_email: string; status: string }>;
  verifiedDocs: number;
  rejectedDocs: number;
  inReviewDocs: number;
  checklistPct: number;
  visaDays: number | null;
  riskTone: RiskTone;
  onGoChecklist: () => void;
  onGoBg: () => void;
  onGoDetails: () => void;
}) {
  const fmtDate = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

  const salaryStr =
    worker.salary != null && worker.salary !== undefined && !Number.isNaN(Number(worker.salary))
      ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(
          Number(worker.salary)
        )
      : "—";

  const topChecklist = [...checklist].slice(0, 5);

  return (
    <div className="flex flex-col">
      {/* KPI strip — multiple lenses */}
      <div className="rounded-2xl border border-[#E8EEFF] bg-white p-4 pb-10 shadow-sm md:p-5 md:pb-12">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <DashboardKpi label="Compliance" value={`${checklistPct}%`} sub={`${verifiedDocs}/${checklist.length} done`} tone="blue" />
          <DashboardKpi label="In review" value={String(inReviewDocs)} sub="Awaiting verification" tone="amber" />
          <DashboardKpi label="Rejected" value={String(rejectedDocs)} sub="Need re-upload" tone="rose" />
          <DashboardKpi label="Risk" value={worker.risk_level} sub="Posture" tone="slate" accentColor={riskTone.text} />
          <DashboardKpi label="Visa" value={visaDays == null ? "—" : `${visaDays}d`} sub="Days left" tone="teal" />
          <DashboardKpi label="References" value={String(bgRefs.length)} sub="BG verify" tone="indigo" />
        </div>
      </div>

      {/* Perspective grid — clear space below stats box */}
      <div className="mt-12 grid grid-cols-1 gap-5 md:mt-14 xl:grid-cols-2">
        <AspectCard
          title="Profile & contact"
          subtitle="Who to reach and how"
          icon={User}
          barClass="bg-[#2563EB]"
          action={
            <button type="button" onClick={onGoDetails} className="text-xs font-bold text-[#2563EB] hover:underline">
              All fields →
            </button>
          }
        >
          <div className="divide-y divide-[#F0F4FF]">
            <DashRow label="Full name" value={worker.name} />
            <DashRow label="Email" value={worker.email ? <a href={`mailto:${worker.email}`} className="text-[#2563EB] hover:underline">{worker.email}</a> : "—"} />
            <DashRow label="Phone" value={worker.phone || "—"} />
            <DashRow label="Nationality" value={worker.nationality || "—"} />
          </div>
        </AspectCard>

        <AspectCard title="Employment" subtitle="Role, location & contract context" icon={Briefcase} barClass="bg-[#7C3AED]">
          <div className="divide-y divide-[#F0F4FF]">
            <DashRow label="Job title" value={worker.job_title || "—"} />
            <DashRow label="Department" value={worker.department || "—"} />
            <DashRow label="Work location" value={worker.work_location || "—"} />
            <DashRow label="Employment status" value={worker.status || "—"} />
            <DashRow label="Onboarding stage" value={worker.stage || "—"} />
            <DashRow label="Start date" value={fmtDate(worker.start_date)} />
            <DashRow label="Salary (reported)" value={salaryStr} />
          </div>
        </AspectCard>

        <AspectCard title="Immigration & visa" subtitle="Sponsor compliance lens" icon={Plane} barClass="bg-[#0D9488]">
          <div className="divide-y divide-[#F0F4FF]">
            <DashRow label="Immigration route" value={worker.route || "—"} />
            <DashRow label="Visa expiry" value={fmtDate(worker.visa_expiry)} />
            <DashRow
              label="Countdown"
              value={visaDays == null ? "—" : visaDays < 0 ? `${Math.abs(visaDays)} days overdue` : `${visaDays} days remaining`}
            />
          </div>
        </AspectCard>

        <AspectCard
          title="Compliance & documents"
          subtitle="Checklist progress and latest items"
          icon={ClipboardList}
          barClass="bg-[#1D4ED8]"
          action={
            <button type="button" onClick={onGoChecklist} className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline">
              Open checklist <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          <div className="mb-4">
            <div className="mb-2 flex justify-between text-xs font-semibold text-[#64748B]">
              <span>Overall completion</span>
              <span className="text-[#0A0F1E]">{checklistPct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F0F4FF]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] transition-all duration-500"
                style={{ width: `${checklistPct}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-[#94A3B8]">
              {verifiedDocs} items complete · {inReviewDocs} awaiting review · {rejectedDocs} rejected
            </p>
          </div>
          {topChecklist.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">No checklist items yet.</p>
          ) : (
            <ul className="space-y-2">
              {topChecklist.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#F0F4FF] bg-[#FAFCFF] px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-medium text-[#0A0F1E]">{it.description}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      it.status === "verified" || it.status === "not_applicable"
                        ? "bg-emerald-100 text-emerald-800"
                        : it.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {it.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AspectCard>

        <AspectCard title="Risk & monitoring" subtitle="Sponsor risk posture" icon={ShieldAlert} barClass="bg-[#DC2626]">
          <div
            className="rounded-xl border p-4"
            style={{ background: riskTone.bg, borderColor: riskTone.border }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Current risk level</p>
            <p className="mt-1 text-2xl font-extrabold capitalize" style={{ color: riskTone.text }}>
              {worker.risk_level}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
              Use checklist, visa dates, and right-to-work evidence to keep this worker audit-ready. Escalate if risk is high or
              critical.
            </p>
          </div>
        </AspectCard>

        <AspectCard
          title="Background verification"
          subtitle="References and referee status"
          icon={ShieldCheck}
          barClass="bg-[#4F46E5]"
          action={
            <button type="button" onClick={onGoBg} className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:underline">
              Manage refs <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          {bgRefs.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">No references added yet. Add referees from the BG verify tab.</p>
          ) : (
            <ul className="space-y-2">
              {bgRefs.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E8EEFF] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0A0F1E]">{r.referee_name}</p>
                    <p className="truncate text-xs text-[#94A3B8]">{r.referee_email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1D4ED8]">
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AspectCard>
      </div>
    </div>
  );
}

function DashboardKpi({
  label,
  value,
  sub,
  tone,
  accentColor,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "blue" | "amber" | "rose" | "slate" | "teal" | "indigo";
  accentColor?: string;
}) {
  const tones: Record<string, string> = {
    blue: "from-[#EFF6FF] to-white border-[#BFDBFE]",
    amber: "from-[#FFFBEB] to-white border-[#FDE68A]",
    rose: "from-[#FFF1F2] to-white border-[#FECDD3]",
    slate: "from-[#F8FAFC] to-white border-[#E2E8F0]",
    teal: "from-[#F0FDFA] to-white border-[#99F6E4]",
    indigo: "from-[#EEF2FF] to-white border-[#C7D2FE]",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-3 shadow-sm ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">{label}</p>
      <p className="mt-1 truncate text-lg font-extrabold text-[#0A0F1E]" style={accentColor ? { color: accentColor } : undefined}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-medium leading-tight text-[#64748B]">{sub}</p>
    </div>
  );
}

function AspectCard({
  title,
  subtitle,
  icon: Icon,
  barClass,
  children,
  action,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  barClass: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#E8EEFF] bg-white shadow-sm">
      <div className={`absolute left-0 top-0 h-full w-1 ${barClass}`} />
      <div className="p-5 pl-5 sm:pl-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-[#0A0F1E]">{title}</h2>
              <p className="text-xs text-[#94A3B8]">{subtitle}</p>
            </div>
          </div>
          {action}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

function DashRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="shrink-0 text-[12px] font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</span>
      <span className="min-w-0 text-[14px] font-semibold leading-snug text-[#0A0F1E] sm:max-w-[58%] sm:text-right">{value}</span>
    </div>
  );
}

function DocumentRow({
  item,
  isLast,
  hovered,
  onHover,
  onOpen,
}: {
  item: ChecklistItem;
  isLast: boolean;
  hovered: boolean;
  onHover: (v: boolean) => void;
  onOpen: () => void;
}) {
  const dateStr = useMemo(() => {
    const dates = item.documents.map((d) => d.upload_date).filter(Boolean) as string[];
    if (dates.length === 0) return "—";
    const latest = [...dates].sort().reverse()[0];
    return new Date(latest).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  }, [item.documents]);

  const ok = item.status === "verified" || item.status === "not_applicable";
  const bad = item.status === "rejected";

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors md:gap-5 md:px-5 md:py-4 ${
        !isLast ? "border-b border-slate-100" : ""
      } ${hovered ? "bg-slate-50/90" : "bg-white"}`}
    >
      <span className="flex shrink-0 items-center justify-center">
        {ok ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        ) : bad ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
            <XCircle className="h-4 w-4" />
          </span>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Clock3 className="h-4 w-4" />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug text-slate-900">{item.description}</p>
        <p className="mt-0.5 text-xs text-slate-500">Item {item.item_number}</p>
      </div>
      <div className="hidden shrink-0 flex-col items-end text-right sm:flex">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Updated</span>
        <span className="text-sm text-slate-600">{dateStr}</span>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
    </button>
  );
}

export default function WorkerDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading employee…</p>}>
      <WorkerDetailInner />
    </Suspense>
  );
}
