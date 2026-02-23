"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface RefInfo {
  completed: boolean;
  message?: string;
  referee_name?: string;
  employee_name?: string;
  employee_job_title?: string;
  referee_company?: string;
  employment_start?: string | null;
  employment_end?: string | null;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function VerifyPage() {
  const params = useParams();
  const token = params.token as string;
  const [info, setInfo] = useState<RefInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [confirmEmployment, setConfirmEmployment] = useState(true);
  const [confirmDates, setConfirmDates] = useState(true);
  const [confirmTitle, setConfirmTitle] = useState(true);
  const [recommend, setRecommend] = useState(true);
  const [rating, setRating] = useState(5);
  const [reasonForLeaving, setReasonForLeaving] = useState("");
  const [comments, setComments] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/bgverify/public/${token}`)
      .then((r) => r.json())
      .then((d) => {
        setInfo(d);
        if (d.completed) setSubmitted(true);
      })
      .catch(() => setError("Invalid or expired verification link."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/bgverify/public/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm_employment: confirmEmployment,
          confirm_dates: confirmDates,
          confirm_title: confirmTitle,
          recommend,
          rating,
          reason_for_leaving: reasonForLeaving || null,
          comments: comments || null,
          additional_comments: additionalComments || null,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await fetch(`${API_URL}/bgverify/public/${token}/decline`, { method: "POST" });
      setSubmitted(true);
      setInfo({ completed: true, message: "You have declined this reference request." });
    } catch {
      setError("Failed to decline.");
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-500" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ padding: 20 }}>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full" style={{ maxWidth: 500, padding: "40px 36px", textAlign: "center" }}>
          <XCircle className="mx-auto text-red-500" style={{ width: 48, height: 48, marginBottom: 16 }} />
          <h1 className="text-xl font-bold text-gray-900" style={{ marginBottom: 8 }}>Link Invalid</h1>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ padding: 20 }}>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full" style={{ maxWidth: 500, padding: "40px 36px", textAlign: "center" }}>
          <CheckCircle2 className="mx-auto text-emerald-500" style={{ width: 48, height: 48, marginBottom: 16 }} />
          <h1 className="text-xl font-bold text-gray-900" style={{ marginBottom: 8 }}>Thank You!</h1>
          <p className="text-sm text-gray-600">{info?.message || "Your reference has been submitted successfully."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ padding: "40px 20px" }}>
      <div className="mx-auto w-full" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200" style={{ padding: "32px 36px", marginBottom: 20 }}>
          <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
            <div className="flex items-center justify-center rounded-xl" style={{ width: 44, height: 44, background: "#dbeafe" }}>
              <CheckCircle2 style={{ width: 22, height: 22, color: "#2563eb" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Employment Reference Request</h1>
              <p className="text-sm text-gray-500">Background verification form</p>
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-200" style={{ padding: "16px 20px" }}>
            <p className="text-sm text-blue-800" style={{ marginBottom: 8 }}>
              You have been listed as a reference for <strong>{info?.employee_name}</strong> ({info?.employee_job_title}).
            </p>
            <div className="grid grid-cols-2" style={{ gap: 8, fontSize: 13 }}>
              <div><span className="text-blue-600">Your name:</span> <strong className="text-blue-900">{info?.referee_name}</strong></div>
              <div><span className="text-blue-600">Company:</span> <strong className="text-blue-900">{info?.referee_company}</strong></div>
              {info?.employment_start && (
                <div><span className="text-blue-600">Employed from:</span> <strong className="text-blue-900">{fmt(info.employment_start)}</strong></div>
              )}
              {info?.employment_end && (
                <div><span className="text-blue-600">Employed until:</span> <strong className="text-blue-900">{fmt(info.employment_end)}</strong></div>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200" style={{ padding: "28px 36px", marginBottom: 20 }}>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide" style={{ marginBottom: 20 }}>
              Verification Questions
            </h2>

            <div className="space-y-5">
              <ToggleField label={`Can you confirm ${info?.employee_name} was employed at ${info?.referee_company}?`} value={confirmEmployment} onChange={setConfirmEmployment} />
              <ToggleField label="Can you confirm the employment dates are correct?" value={confirmDates} onChange={setConfirmDates} />
              <ToggleField label="Can you confirm their job title is accurate?" value={confirmTitle} onChange={setConfirmTitle} />
              <ToggleField label="Would you recommend this person for employment?" value={recommend} onChange={setRecommend} />

              <div>
                <label className="block text-sm font-medium text-gray-800" style={{ marginBottom: 8 }}>
                  Overall Rating (1-10)
                </label>
                <div className="flex items-center" style={{ gap: 6 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n} type="button" onClick={() => setRating(n)}
                      className={`flex items-center justify-center rounded-lg border font-medium transition-colors cursor-pointer ${
                        n <= rating ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                      }`}
                      style={{ width: 36, height: 36, fontSize: 13 }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800" style={{ marginBottom: 6 }}>Reason for Leaving</label>
                <input
                  type="text" value={reasonForLeaving} onChange={(e) => setReasonForLeaving(e.target.value)}
                  placeholder="e.g. Career progression, contract ended..."
                  className="w-full rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-blue-400"
                  style={{ height: 40, padding: "0 14px" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800" style={{ marginBottom: 6 }}>Comments about the employee</label>
                <textarea
                  value={comments} onChange={(e) => setComments(e.target.value)} rows={3}
                  placeholder="Please share any relevant comments..."
                  className="w-full rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-blue-400 resize-none"
                  style={{ padding: "10px 14px" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800" style={{ marginBottom: 6 }}>Additional Comments <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={additionalComments} onChange={(e) => setAdditionalComments(e.target.value)} rows={2}
                  placeholder="Any additional information..."
                  className="w-full rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-blue-400 resize-none"
                  style={{ padding: "10px 14px" }}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-800" style={{ padding: "10px 16px", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button" onClick={handleDecline} disabled={declining}
              className="rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
              style={{ height: 44, padding: "0 20px" }}
            >
              {declining ? "Declining..." : "Decline to Provide Reference"}
            </button>
            <button
              type="submit" disabled={submitting}
              className="inline-flex items-center rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
              style={{ height: 44, padding: "0 24px", gap: 8 }}
            >
              {submitting && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
              {submitting ? "Submitting..." : "Submit Reference"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: 16 }}>
      <span className="text-sm text-gray-800">{label}</span>
      <div className="flex items-center shrink-0" style={{ gap: 6 }}>
        <button
          type="button" onClick={() => onChange(true)}
          className={`rounded-lg text-xs font-medium transition-colors cursor-pointer ${value ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          style={{ padding: "5px 14px" }}
        >
          Yes
        </button>
        <button
          type="button" onClick={() => onChange(false)}
          className={`rounded-lg text-xs font-medium transition-colors cursor-pointer ${!value ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          style={{ padding: "5px 14px" }}
        >
          No
        </button>
      </div>
    </div>
  );
}
