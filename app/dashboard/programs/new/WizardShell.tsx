"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Store, Percent, FileText, CreditCard, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import type { AffiliateProgram, ShopifyProduct } from "@/lib/types";

const STEPS = [
  { n: 1, label: "Products",   icon: Store },
  { n: 2, label: "Commission", icon: Percent },
  { n: 3, label: "Details",    icon: FileText },
  { n: 4, label: "Payout",     icon: CreditCard },
];

const inputCls = "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all bg-white";
const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

export default function WizardShell({
  step: initialStep, stores, draft, products,
}: {
  step: number;
  stores: { id: string; shopDomain: string }[];
  draft: AffiliateProgram | null;
  products: ShopifyProduct[];
}) {
  const router = useRouter();
  const [step, setStep]       = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(draft?.id ?? null);

  // Form state
  const [storeId,     setStoreId]     = useState(draft?.storeId     ?? stores[0]?.id ?? "");
  const [allProducts, setAllProducts] = useState(draft?.allProducts ?? true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rate,        setRate]        = useState(draft?.commissionRate        ?? 10);
  const [window_,     setWindow]      = useState(draft?.attributionWindowDays ?? 30);
  const [pType,       setPType]       = useState<"open"|"approval">(draft?.programType ?? "open");
  const [name,        setName]        = useState(draft?.name        ?? "");
  const [description, setDescription]= useState(draft?.description  ?? "");
  const [category,    setCategory]    = useState(draft?.category     ?? "Other");
  const [bannerUrl,   setBannerUrl]   = useState(draft?.bannerUrl    ?? "");
  const [threshold,   setThreshold]   = useState(draft?.payoutThreshold   ?? 50);
  const [schedule,    setSchedule]    = useState<"manual"|"weekly"|"monthly">(draft?.payoutSchedule ?? "manual");
  const [currency,    setCurrency]    = useState(draft?.currency           ?? "USD");

  async function saveStep(body: Record<string, unknown>, nextStep: number) {
    setLoading(true); setError(null);
    const isCreate = !programId;
    const url  = isCreate ? "/api/programs" : `/api/programs/${programId}`;
    const method = isCreate ? "POST" : "PATCH";

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, ...body }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
    if (isCreate) setProgramId(data.id);
    if (nextStep > 4) {
      // Publish
      const pid = programId ?? data.id;
      const pubRes = await fetch(`/api/programs/${pid}/publish`, { method: "POST" });
      if (!pubRes.ok) { const d = await pubRes.json(); setError(d.error ?? "Publish failed."); return; }
      router.push(`/dashboard/programs/${pid}`);
      router.refresh();
    } else {
      setStep(nextStep);
      router.replace(`/dashboard/programs/new?step=${nextStep}&id=${programId ?? data.id}`, { scroll: false });
    }
  }

  const canGoBack = step > 1;

  return (
    <div className="max-w-xl stagger">
      {/* Back */}
      <button onClick={() => router.push("/dashboard/programs")}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> All programs
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold border-2 transition-all ${
              step > s.n ? "bg-blue-600 border-blue-600 text-white" :
              step === s.n ? "border-blue-600 text-blue-600 bg-blue-50" :
              "border-gray-200 text-gray-400 bg-white"
            }`}>
              {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
            </div>
            <p className={`hidden sm:block ml-2 text-xs font-medium ${step === s.n ? "text-blue-600" : "text-gray-400"}`}>{s.label}</p>
            {i < STEPS.length - 1 && <div className={`mx-3 h-px w-8 ${step > s.n ? "bg-blue-600" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">

        {/* ── Step 1: Products ─────────────────────────── */}
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Choose eligible products</h2>
            <p className="text-sm text-gray-500 mb-6">Select which products affiliates can earn commission on.</p>

            {stores.length > 1 && (
              <div className="mb-4">
                <label className={labelCls}>Store</label>
                <select value={storeId} onChange={e => setStoreId(e.target.value)} className={inputCls}>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.shopDomain}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                <input type="radio" name="products" checked={allProducts} onChange={() => setAllProducts(true)} className="accent-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">All products</p>
                  <p className="text-xs text-gray-500">Commission applies to every product in the store</p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                <input type="radio" name="products" checked={!allProducts} onChange={() => setAllProducts(false)} className="accent-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Specific products</p>
                  <p className="text-xs text-gray-500 mb-3">Choose which products are eligible</p>
                  {!allProducts && (
                    products.length === 0 ? (
                      <p className="text-xs text-amber-600">No products synced yet. <button onClick={async () => { await fetch("/api/shopify/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId }) }); router.refresh(); }} className="underline">Sync now</button></p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 border border-gray-200 rounded-lg p-2">
                        {products.map(p => (
                          <label key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(x => x !== p.id))} className="accent-blue-600 shrink-0" />
                            {p.imageUrl && <img src={p.imageUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{p.title}</p>
                              {p.price && <p className="text-[10px] text-gray-400">${p.price}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <button onClick={() => saveStep({ allProducts, productIds: allProducts ? [] : selectedIds }, 2)}
              disabled={loading || (!allProducts && selectedIds.length === 0)}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <>Next: Commission <ArrowRight className="h-4 w-4" /></>}
            </button>
          </>
        )}

        {/* ── Step 2: Commission ───────────────────────── */}
        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Commission settings</h2>
            <p className="text-sm text-gray-500 mb-6">Set how much affiliates earn and how long their referral lasts.</p>

            <div className="space-y-5">
              <div>
                <label className={labelCls}>Commission rate</label>
                <div className="relative">
                  <input type="number" min={0} max={100} step={0.5} value={rate} onChange={e => setRate(Number(e.target.value))} className={inputCls + " pr-8"} />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Affiliates earn {rate}% on every eligible order.</p>
              </div>

              <div>
                <label className={labelCls}>Attribution window</label>
                <select value={window_} onChange={e => setWindow(Number(e.target.value))} className={inputCls}>
                  {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">If someone buys within {window_} days of clicking, the affiliate gets credit.</p>
              </div>

              <div>
                <label className={labelCls}>Program type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[["open", "Open", "Anyone joins instantly"], ["approval", "Approval-based", "You review applicants"]].map(([val, title, desc]) => (
                    <label key={val} className={`flex flex-col gap-1 rounded-xl border-2 p-4 cursor-pointer transition-all ${pType === val ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
                      <input type="radio" name="ptype" value={val} checked={pType === val} onChange={() => setPType(val as "open"|"approval")} className="sr-only" />
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Back</button>
              <button onClick={() => saveStep({ commissionRate: rate, attributionWindowDays: window_, programType: pType }, 3)}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <>Next: Details <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Details ──────────────────────────── */}
        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Program details</h2>
            <p className="text-sm text-gray-500 mb-6">This is what affiliates see in the marketplace listing.</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Program name <span className="text-red-500">*</span></label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Creator Referral Program" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Short description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={300} rows={3} placeholder="What products are you selling? Who is your ideal affiliate?" className={inputCls + " resize-none"} />
                <p className="text-right text-[10px] text-gray-400 mt-1">{description.length}/300</p>
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                  {["Fashion","Tech","Health","Beauty","Home","Food","Other"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Banner image URL (optional)</label>
                <input type="url" value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="https://..." className={inputCls} />
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Back</button>
              <button onClick={() => saveStep({ name: name.trim(), description: description || null, category, bannerUrl: bannerUrl || null }, 4)}
                disabled={loading || !name.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <>Next: Payout <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Payout + Publish ─────────────────── */}
        {step === 4 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Payout settings</h2>
            <p className="text-sm text-gray-500 mb-6">Set when and how affiliates get paid.</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Minimum payout threshold</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input type="number" min={0} step={1} value={threshold} onChange={e => setThreshold(Number(e.target.value))} className={inputCls + " pl-7"} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Affiliates must earn at least ${threshold} before they can request a payout.</p>
              </div>
              <div>
                <label className={labelCls}>Payout schedule</label>
                <select value={schedule} onChange={e => setSchedule(e.target.value as "manual"|"weekly"|"monthly")} className={inputCls}>
                  <option value="manual">Manual — you trigger payouts</option>
                  <option value="weekly">Weekly — automatic every Monday</option>
                  <option value="monthly">Monthly — automatic on the 1st</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
                  {["USD","EUR","GBP","CAD","AUD"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2 text-sm">
              <p className="font-semibold text-blue-900 mb-1">Program summary</p>
              {[
                ["Commission", `${rate}%`],
                ["Attribution window", `${window_} days`],
                ["Type", pType === "open" ? "Open — instant join" : "Approval-based"],
                ["Payout threshold", `$${threshold}`],
                ["Schedule", schedule],
                ["Currency", currency],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-blue-800">
                  <span className="text-blue-600">{k}</span><span className="font-medium">{v}</span>
                </div>
              ))}
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Back</button>
              <button onClick={() => saveStep({ payoutThreshold: threshold, payoutSchedule: schedule, currency }, 5)}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all disabled:opacity-60">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</> : <>Publish program 🚀</>}
              </button>
            </div>
          </>
        )}
      </div>
      <p className="text-center text-xs text-gray-400 mt-4">Your program will appear in the public marketplace once published.</p>
    </div>
  );
}
