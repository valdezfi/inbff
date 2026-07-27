"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { AffiliateProgram } from "@/lib/types";

const inputCls = "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all bg-white";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

export default function ProgramSettingsForm({ program }: { program: AffiliateProgram }) {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  const [name,        setName]       = useState(program.name);
  const [description, setDesc]       = useState(program.description ?? "");
  const [category,    setCategory]   = useState(program.category);
  const [bannerUrl,   setBanner]     = useState(program.bannerUrl ?? "");
  const [rate,        setRate]       = useState(program.commissionRate);
  const [window_,     setWindow]     = useState(program.attributionWindowDays);
  const [pType,       setPType]      = useState(program.programType);
  const [threshold,   setThreshold]  = useState(program.payoutThreshold);
  const [schedule,    setSchedule]   = useState<"manual"|"weekly"|"monthly">(program.payoutSchedule);
  const [currency,    setCurrency]   = useState(program.currency);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSaved(false);
    const res = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null, category, bannerUrl: bannerUrl || null, commissionRate: rate, programType: pType, attributionWindowDays: window_, payoutThreshold: threshold, payoutSchedule: schedule, currency }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
    setSaved(true);
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("Delete this program? This action cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/programs/${program.id}`, { method: "DELETE" });
    router.push("/dashboard/programs");
    router.refresh();
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div><label className={labelCls}>Program name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Description</label><textarea value={description} onChange={e => setDesc(e.target.value)} maxLength={300} rows={3} className={inputCls + " resize-none"} /></div>
      <div><label className={labelCls}>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
          {["Fashion","Tech","Health","Beauty","Home","Food","Other"].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div><label className={labelCls}>Banner URL</label><input type="url" value={bannerUrl} onChange={e => setBanner(e.target.value)} className={inputCls} placeholder="https://..." /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelCls}>Commission rate (%)</label><input type="number" min={0} max={100} step={0.5} value={rate} onChange={e => setRate(Number(e.target.value))} className={inputCls} /></div>
        <div><label className={labelCls}>Attribution window</label>
          <select value={window_} onChange={e => setWindow(Number(e.target.value))} className={inputCls}>
            {[7,14,30,60,90].map(d => <option key={d} value={d}>{d} days</option>)}
          </select>
        </div>
      </div>
      <div><label className={labelCls}>Program type</label>
        <select value={pType} onChange={e => setPType(e.target.value as "open"|"approval")} className={inputCls}>
          <option value="open">Open — anyone joins instantly</option>
          <option value="approval">Approval-based</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelCls}>Payout threshold ($)</label><input type="number" min={0} value={threshold} onChange={e => setThreshold(Number(e.target.value))} className={inputCls} /></div>
        <div><label className={labelCls}>Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
            {["USD","EUR","GBP","CAD","AUD"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div><label className={labelCls}>Payout schedule</label>
        <select value={schedule} onChange={e => setSchedule(e.target.value as "manual"|"weekly"|"monthly")} className={inputCls}>
          <option value="manual">Manual</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
        </select>
      </div>

      {error  && <p className="text-sm text-red-600">{error}</p>}
      {saved  && <p className="text-sm text-emerald-600">✓ Changes saved.</p>}

      <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save changes"}
      </button>

      <div className="border-t border-gray-100 pt-5">
        <button type="button" onClick={onDelete} disabled={deleting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors">
          <Trash2 className="h-4 w-4" /> Delete program
        </button>
      </div>
    </form>
  );
}
