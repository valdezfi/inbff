"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ArrowRight, ArrowLeft, Store, Percent,
  Clock, Package, CheckCircle2, Search, Tag,
  ToggleLeft, ToggleRight, Zap, Globe, Lock,
} from "lucide-react";

const CATEGORIES = [
  "Electronics","Fashion","Beauty","Health","Sports","Home","Food","Travel",
  "Finance","Education","Software","Gaming","Pets","Automotive","Other",
];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 " +
  "focus:ring-indigo-100 transition-all";

const labelCls = "block text-sm font-semibold text-slate-700 mb-1.5";

type Store = { id: string; shopDomain: string };
type Product = { id: string; title: string; imageUrl: string | null; price: number | null; handle: string };

type Step = "details" | "products" | "commission" | "publish";
const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "details",    label: "Details",    icon: Tag },
  { key: "products",   label: "Products",   icon: Package },
  { key: "commission", label: "Commission", icon: Percent },
  { key: "publish",    label: "Publish",    icon: Zap },
];

export default function NewProgramForm({ stores, initialStoreId }: {
  stores: Store[];
  initialStoreId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: Details ─────────────────────────────────────────────────────────
  const [storeId, setStoreId]           = useState(initialStoreId ?? stores[0]?.id ?? "");
  const [name, setName]                 = useState("");
  const [description, setDescription]   = useState("");
  const [category, setCategory]         = useState("Other");

  // ── Step 2: Products ────────────────────────────────────────────────────────
  const [products, setProducts]         = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [allProducts, setAllProducts]   = useState(true);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [search, setSearch]             = useState("");

  // ── Step 3: Commission ──────────────────────────────────────────────────────
  const [commissionRate, setCommissionRate]   = useState(10);
  const [programType, setProgramType]         = useState<"open" | "approval">("open");
  const [attributionDays, setAttributionDays] = useState(30);
  const [payoutThreshold, setPayoutThreshold] = useState(50);
  const [payoutSchedule, setPayoutSchedule]   = useState<"manual" | "weekly" | "monthly">("manual");
  const [currency, setCurrency]               = useState("USD");

  const store = stores.find(s => s.id === storeId);

  // Load products when entering the products step
  useEffect(() => {
    if (step !== "products" || !storeId) return;
    setProductsLoading(true);
    fetch(`/api/shopify/products?storeId=${storeId}`)
      .then(r => r.json())
      .then((data: Product[]) => setProducts(data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [step, storeId]);

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  function toggleProduct(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Create & publish program ─────────────────────────────────────────────
  async function createProgram(status: "draft" | "active") {
    setError(null);
    setLoading(true);

    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId, name: name.trim(), description: description.trim() || null,
        category, commissionRate: Number(commissionRate),
        programType, attributionWindowDays: Number(attributionDays),
        payoutThreshold: Number(payoutThreshold),
        payoutSchedule, currency,
        allProducts,
        status,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to create program."); setLoading(false); return null; }

    // Save product selection if specific products chosen
    if (!allProducts && selectedIds.size > 0) {
      await fetch(`/api/programs/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selectedIds] }),
      });
    }

    setLoading(false);
    return data.id as string;
  }

  async function onPublish() {
    const id = await createProgram("active");
    if (id) { router.push(`/dashboard/programs/${id}`); router.refresh(); }
  }

  async function onSaveDraft() {
    const id = await createProgram("draft");
    if (id) { router.push(`/dashboard/programs/${id}`); router.refresh(); }
  }

  // ── Step index ──────────────────────────────────────────────────────────────
  const stepIndex   = STEPS.findIndex(s => s.key === step);
  const isLastStep  = step === "publish";

  function canAdvance() {
    if (step === "details") return name.trim().length > 0 && !!storeId;
    if (step === "products") return true;
    if (step === "commission") return commissionRate > 0;
    return true;
  }

  function goNext() {
    if (step === "details")    setStep("products");
    if (step === "products")   setStep("commission");
    if (step === "commission") setStep("publish");
  }
  function goBack() {
    if (step === "products")   setStep("details");
    if (step === "commission") setStep("products");
    if (step === "publish")    setStep("commission");
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const done    = i < stepIndex;
          const current = s.key === step;
          return (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                current ? "bg-indigo-600 text-white shadow-md" :
                done    ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-100 text-slate-400"
              }`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 rounded ${done ? "bg-emerald-300" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Step 1: Details ─────────────────────────────────────────────── */}
      {step === "details" && (
        <div className="space-y-5">
          {stores.length > 1 && (
            <div>
              <label className={labelCls}>Which store is this program for?</label>
              <select value={storeId} onChange={e => setStoreId(e.target.value)} className={inputCls}>
                {stores.map(s => <option key={s.id} value={s.id}>{s.shopDomain}</option>)}
              </select>
            </div>
          )}
          {stores.length === 1 && (
            <div className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
              <Store className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="text-sm text-indigo-700 font-medium">{store?.shopDomain}</span>
            </div>
          )}

          <div>
            <label className={labelCls}>Program name <span className="text-red-500">*</span></label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Summer Creator Program" className={inputCls} maxLength={200} />
            <p className="text-xs text-slate-400 mt-1">{name.length}/200 characters</p>
          </div>

          <div>
            <label className={labelCls}>Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Tell affiliates what your program is about and what they'll be promoting…"
              className={inputCls + " resize-none h-24"} maxLength={300} />
            <p className="text-xs text-slate-400 mt-1">{description.length}/300 characters</p>
          </div>

          <div>
            <label className={labelCls}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Step 2: Products ────────────────────────────────────────────── */}
      {step === "products" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Choose which products affiliates earn commission on. Select specific products or
            include your entire store.
          </p>

          {/* All products toggle */}
          <button
            type="button"
            onClick={() => setAllProducts(!allProducts)}
            className={`w-full flex items-center justify-between rounded-xl border px-4 py-3.5 transition-all ${
              allProducts ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <Globe className={`h-5 w-5 ${allProducts ? "text-indigo-600" : "text-slate-400"}`} />
              <div className="text-left">
                <p className={`text-sm font-semibold ${allProducts ? "text-indigo-700" : "text-slate-700"}`}>
                  All products
                </p>
                <p className="text-xs text-slate-400">Affiliates earn on any product in your store</p>
              </div>
            </div>
            {allProducts
              ? <ToggleRight className="h-6 w-6 text-indigo-600" />
              : <ToggleLeft className="h-6 w-6 text-slate-300" />
            }
          </button>

          {!allProducts && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {/* Search */}
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input type="text" placeholder="Search products…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent" />
                {selectedIds.size > 0 && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>

              {productsLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading products…
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  {products.length === 0
                    ? "No products found. Make sure your store is connected and products are synced."
                    : "No products match your search."}
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {filteredProducts.map(p => {
                    const selected = selectedIds.has(p.id);
                    return (
                      <label key={p.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selected ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleProduct(p.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0" />
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.title} className="h-10 w-10 rounded-lg object-cover shrink-0 border border-slate-200" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                          <p className="text-xs text-slate-400">{p.price ? `$${p.price.toFixed(2)}` : "—"}</p>
                        </div>
                        {selected && <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-slate-100 px-4 py-2.5 flex justify-between text-xs text-slate-400">
                <span>{products.length} products total</span>
                <button type="button" onClick={() => setSelectedIds(new Set(products.map(p => p.id)))}
                  className="text-indigo-600 hover:text-indigo-700 font-medium">Select all</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Commission ───────────────────────────────────────────── */}
      {step === "commission" && (
        <div className="space-y-5">
          <div>
            <label className={labelCls}>Commission rate</label>
            <div className="relative">
              <input type="number" min={0} max={100} step={0.5} value={commissionRate}
                onChange={e => setCommissionRate(Number(e.target.value))}
                className={inputCls + " pr-8"} />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Affiliates earn <strong>{commissionRate}%</strong> on every order they refer.
            </p>
          </div>

          <div>
            <label className={labelCls}>Program type</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { v: "open",     icon: Globe, label: "Open",     desc: "Anyone can join instantly" },
                { v: "approval", icon: Lock,  label: "Approval", desc: "You review and approve affiliates" },
              ] as const).map(opt => (
                <button key={opt.v} type="button" onClick={() => setProgramType(opt.v)}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    programType === opt.v
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}>
                  <opt.icon className={`h-5 w-5 mt-0.5 shrink-0 ${programType === opt.v ? "text-indigo-600" : "text-slate-400"}`} />
                  <div>
                    <p className={`text-sm font-semibold ${programType === opt.v ? "text-indigo-700" : "text-slate-700"}`}>{opt.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Attribution window</label>
              <select value={attributionDays} onChange={e => setAttributionDays(Number(e.target.value))} className={inputCls}>
                {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">Cookie lifetime after a click</p>
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
                {["USD","EUR","GBP","CAD","AUD","INR"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Payout threshold</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input type="number" min={0} value={payoutThreshold}
                  onChange={e => setPayoutThreshold(Number(e.target.value))}
                  className={inputCls + " pl-7"} />
              </div>
              <p className="text-xs text-slate-400 mt-1">Minimum before payout is allowed</p>
            </div>
            <div>
              <label className={labelCls}>Payout schedule</label>
              <select value={payoutSchedule} onChange={e => setPayoutSchedule(e.target.value as typeof payoutSchedule)} className={inputCls}>
                <option value="manual">Manual</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Publish ──────────────────────────────────────────────── */}
      {step === "publish" && (
        <div className="space-y-5">
          {/* Summary card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Program summary</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                { label: "Store",       value: store?.shopDomain ?? "—" },
                { label: "Name",        value: name || "—" },
                { label: "Category",    value: category },
                { label: "Commission",  value: `${commissionRate}%` },
                { label: "Type",        value: programType === "open" ? "Open (anyone can join)" : "Approval required" },
                { label: "Products",    value: allProducts ? "All products" : `${selectedIds.size} selected` },
                { label: "Cookie",      value: `${attributionDays} days` },
                { label: "Min payout",  value: `$${payoutThreshold}` },
              ].map(r => (
                <div key={r.label} className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-semibold text-slate-800 text-right">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <strong>Publishing</strong> makes your program live in the marketplace so affiliates can discover and join it.
            You can pause it at any time from the program settings.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onSaveDraft} disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save as draft
            </button>
            <button type="button" onClick={onPublish} disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105 transition-all disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Publish program
            </button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {!isLastStep && (
        <div className="flex items-center justify-between mt-7 pt-5 border-t border-slate-100">
          {stepIndex > 0 ? (
            <button type="button" onClick={goBack}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : <div />}
          <button type="button" onClick={goNext} disabled={!canAdvance()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-all disabled:opacity-40 shadow-md">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
