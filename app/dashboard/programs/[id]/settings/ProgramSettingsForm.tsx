"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Trash2, CheckCircle2, Search, Package,
  Globe, ToggleLeft, ToggleRight, RefreshCw,
} from "lucide-react";
import type { AffiliateProgram } from "@/lib/types";

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 " +
  "focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 " +
  "transition-all bg-white";
const labelCls = "block text-sm font-semibold text-slate-700 mb-1.5";

const CATEGORIES = ["Electronics","Fashion","Beauty","Health","Sports","Home","Food","Travel","Finance","Education","Software","Gaming","Pets","Automotive","Other"];

type Product = { id: string; title: string; imageUrl: string | null; price: number | null; handle: string };

export default function ProgramSettingsForm({
  program,
  initialSelectedIds,
}: {
  program: AffiliateProgram;
  initialSelectedIds: string[];
}) {
  const router = useRouter();
  const [loading,  setLoading]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing,  setSyncing]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [saved,    setSaved]    = useState(false);

  // ── Program fields ─────────────────────────────────────────────────────────
  const [name,       setName]      = useState(program.name);
  const [description,setDesc]      = useState(program.description ?? "");
  const [category,   setCategory]  = useState(program.category);
  const [bannerUrl,  setBanner]    = useState(program.bannerUrl ?? "");
  const [rate,       setRate]      = useState(program.commissionRate);
  const [attrDays,   setAttrDays]  = useState(program.attributionWindowDays);
  const [pType,      setPType]     = useState(program.programType);
  const [threshold,  setThreshold] = useState(program.payoutThreshold);
  const [schedule,   setSchedule]  = useState<"manual"|"weekly"|"monthly">(program.payoutSchedule);
  const [currency,   setCurrency]  = useState(program.currency);

  // ── Product selection ──────────────────────────────────────────────────────
  const [allProducts,  setAllProducts]  = useState(program.allProducts);
  const [products,     setProducts]     = useState<Product[]>([]);
  const [productsLoad, setProductsLoad] = useState(false);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set(initialSelectedIds));
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    setProductsLoad(true);
    fetch(`/api/shopify/products?storeId=${program.storeId}`)
      .then(r => r.json())
      .then((d: Product[]) => setProducts(d ?? []))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoad(false));
  }, [program.storeId]);

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  function toggleProduct(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function syncProducts() {
    setSyncing(true);
    await fetch("/api/shopify/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: program.storeId }),
    });
    // Reload products
    const res = await fetch(`/api/shopify/products?storeId=${program.storeId}`);
    const data: Product[] = await res.json();
    setProducts(data ?? []);
    setSyncing(false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSaved(false);

    const body: Record<string, unknown> = {
      name, description: description || null, category,
      bannerUrl: bannerUrl || null, commissionRate: rate,
      programType: pType, attributionWindowDays: attrDays,
      payoutThreshold: threshold, payoutSchedule: schedule, currency,
      allProducts,
    };
    if (!allProducts) {
      body.productIds = [...selectedIds];
    }

    const res = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("Delete this program? All affiliate links will stop working. This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/programs/${program.id}`, { method: "DELETE" });
    router.push("/dashboard/programs");
    router.refresh();
  }

  return (
    <form onSubmit={onSave} className="space-y-6">

      {/* ── Program details ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest text-[11px]">Program details</h3>

        <div>
          <label className={labelCls}>Program name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea value={description} onChange={e => setDesc(e.target.value)}
            maxLength={300} rows={3} className={inputCls + " resize-none"}
            placeholder="Tell affiliates what your program is about…" />
          <p className="text-xs text-slate-400 mt-1">{description.length}/300</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Banner image URL</label>
            <input type="url" value={bannerUrl} onChange={e => setBanner(e.target.value)}
              className={inputCls} placeholder="https://..." />
          </div>
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────────────── */}
      <section className="space-y-3 border-t border-slate-100 pt-5">
        <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Eligible products</h3>
        <p className="text-xs text-slate-400">Choose which products affiliates earn commission on.</p>

        <button type="button" onClick={() => setAllProducts(!allProducts)}
          className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${allProducts ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-center gap-3">
            <Globe className={`h-4 w-4 ${allProducts ? "text-indigo-600" : "text-slate-400"}`} />
            <div className="text-left">
              <p className={`text-sm font-semibold ${allProducts ? "text-indigo-700" : "text-slate-700"}`}>All products</p>
              <p className="text-xs text-slate-400">Commission on any order from your store</p>
            </div>
          </div>
          {allProducts ? <ToggleRight className="h-5 w-5 text-indigo-600" /> : <ToggleLeft className="h-5 w-5 text-slate-300" />}
        </button>

        {!allProducts && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input type="text" placeholder="Search products…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedIds.size > 0 && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                    {selectedIds.size} selected
                  </span>
                )}
                <button type="button" onClick={syncProducts} disabled={syncing}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
                  title="Re-sync products from Shopify">
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing…" : "Sync"}
                </button>
              </div>
            </div>

            {productsLoad ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : products.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Package className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-400">No products found.</p>
                <p className="text-xs text-slate-400">
                  Connect your Shopify store and click Sync to load products.
                </p>
                <button type="button" onClick={syncProducts} disabled={syncing}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Sync products now
                </button>
              </div>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {filtered.map(p => {
                    const selected = selectedIds.has(p.id);
                    return (
                      <label key={p.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selected ? "bg-indigo-50/60" : "hover:bg-slate-50"}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleProduct(p.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0" />
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.title} className="h-9 w-9 rounded-lg object-cover shrink-0 border border-slate-200" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{p.title}</p>
                          <p className="text-xs text-slate-400">{p.price ? `$${p.price.toFixed(2)}` : "—"} · {p.handle}</p>
                        </div>
                        {selected && <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
                <div className="border-t border-slate-100 px-4 py-2 flex justify-between text-xs text-slate-400">
                  <span>{products.length} products · {selectedIds.size} selected</span>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSelectedIds(new Set(products.map(p => p.id)))}
                      className="text-indigo-600 hover:text-indigo-700 font-medium">All</button>
                    <button type="button" onClick={() => setSelectedIds(new Set())}
                      className="text-slate-500 hover:text-slate-700 font-medium">None</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Commission settings ───────────────────────────────────────── */}
      <section className="space-y-4 border-t border-slate-100 pt-5">
        <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Commission & payouts</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Commission rate (%)</label>
            <input type="number" min={0} max={100} step={0.5} value={rate}
              onChange={e => setRate(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Attribution window</label>
            <select value={attrDays} onChange={e => setAttrDays(Number(e.target.value))} className={inputCls}>
              {[7,14,30,60,90].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Program type</label>
          <select value={pType} onChange={e => setPType(e.target.value as "open"|"approval")} className={inputCls}>
            <option value="open">Open — anyone joins instantly</option>
            <option value="approval">Approval-based — you review applications</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Payout threshold</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
              <input type="number" min={0} value={threshold}
                onChange={e => setThreshold(Number(e.target.value))} className={inputCls + " pl-7"} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Schedule</label>
            <select value={schedule} onChange={e => setSchedule(e.target.value as typeof schedule)} className={inputCls}>
              <option value="manual">Manual</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
              {["USD","EUR","GBP","CAD","AUD","INR"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* ── Feedback ─────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Changes saved successfully.
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60 transition-all shadow-md">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save changes"}
      </button>

      {/* ── Danger zone ───────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 pt-5">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Danger zone</p>
        <button type="button" onClick={onDelete} disabled={deleting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors">
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete program
        </button>
        <p className="text-xs text-slate-400 mt-2 text-center">
          All affiliate links will stop working. This cannot be undone.
        </p>
      </div>
    </form>
  );
}
