"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";

export default function PortalBgVerifyPage() {
  const { token } = useAuth();
  const [workerId, setWorkerId] = useState<string>("");
  const [refs, setRefs] = useState<Array<{ id: string; referee_name: string; referee_email: string; status: string }>>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const me = await api.get<{ id: string }>("/portal/me", token);
      setWorkerId(me.id);
      const bg = await api.get<{ references: Array<{ id: string; referee_name: string; referee_email: string; status: string }> }>(`/bgverify/worker/${me.id}`, token);
      setRefs(bg.references || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const add = async () => {
    if (!token || !workerId || !name || !email) return;
    await api.post(`/bgverify/worker/${workerId}/references`, {
      referee_name: name,
      referee_email: email,
      referee_company: "Previous Employer",
    }, token);
    setName("");
    setEmail("");
    await load();
  };

  if (loading) return <p className="text-sm text-white/80">Loading BG verification...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Background Verification</h1>
        <p className="text-sm text-white/70 mt-1">Add referee details for employment verification.</p>
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        <h3 className="text-sm font-semibold text-gray-900">Add Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 8, marginTop: 8 }}>
          <input className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900" style={{ height: 38, padding: "0 12px" }} placeholder="Reference name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded-xl border border-gray-300 bg-white text-sm text-gray-900" style={{ height: 38, padding: "0 12px" }} placeholder="Reference email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="rounded-lg bg-brand-600 text-white text-xs px-3 py-2" style={{ marginTop: 8 }} onClick={add}>Add Reference</button>
      </div>

      <div className="data-card" style={{ padding: 14 }}>
        <h3 className="text-sm font-semibold text-gray-900">Reference Status</h3>
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {refs.length === 0 ? (
            <p className="text-sm text-gray-500">No references added yet.</p>
          ) : (
            refs.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-gray-50" style={{ padding: "8px 10px" }}>
                <p className="text-sm font-semibold text-gray-900">{r.referee_name}</p>
                <p className="text-xs text-gray-600">{r.referee_email} · {r.status}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
