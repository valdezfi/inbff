import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import CopyField from "@/components/CopyField";
import ApplicantsPanel from "./ApplicantsPanel";
import ProgramActions from "./ProgramActions";
import {
  Users, MousePointer, ShoppingBag, TrendingUp,
  ArrowLeft, Store, Percent, Settings,
  CheckCircle2, Clock, Link2, Package, Globe, Lock,
  ChevronRight, ExternalLink,
} from "lucide-react";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }  = await params;
  const session = await getSession();

  const program = await db.findProgramById(id);
  if (!program || program.userId !== session!.userId) notFound();

  const [stores, affiliates, orders, commissions, applications, selectedProductIds] = await Promise.all([
    db.findStoresByUserId(session!.userId),
    db.findAffiliatesByProgramId(id),
    db.findOrdersByProgramId(id),
    db.findCommissionsByProgramIds([id]),
    db.findApplicationsByProgramId(id, "pending"),
    db.findProgramProductIds(id),
  ]);

  const store       = stores.find(s => s.id === program.storeId);
  const totalClicks = await db.countClicksByProgramId(id);
  const totalEarned = commissions.reduce((s, c) => s + c.amount, 0);
  const pendingAmt  = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);
  const clickCounts = await Promise.all(affiliates.map(a => db.countClicksByAffiliateId(a.id)));

  // Fetch product details for the selected products (if not allProducts)
  const storeProducts = !program.allProducts && selectedProductIds.length > 0
    ? await db.findProductsByStoreId(program.storeId)
    : [];
  const selectedProducts = storeProducts.filter(p => selectedProductIds.includes(p.id));

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${program.id}`;

  const statusColors: Record<string, string> = {
    active:  "badge-active",
    paused:  "badge-paused",
    draft:   "badge-draft",
    deleted: "badge-rejected",
  };

  return (
    <div className="space-y-6 stagger">

      {/* ── Back + header ─────────────────────────────────────────────────── */}
      <div>
        <Link href="/dashboard/programs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-4 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> All programs
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Store className="h-3.5 w-3.5" />
              <span>{store?.shopDomain ?? "No store"}</span>
              {store && (
                <a href={`https://${store.shopDomain}`} target="_blank" rel="noopener noreferrer"
                  className="text-indigo-500 hover:text-indigo-600">
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
              {program.name}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[program.status] ?? "badge-draft"}`}>
                {program.status}
              </span>
              {applications.length > 0 && (
                <span className="rounded-full bg-red-500 text-white px-2 py-0.5 text-xs font-bold animate-pulse">
                  {applications.length} pending
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
                <Percent className="h-3 w-3" />{program.commissionRate}%
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                {program.programType === "open"
                  ? <><Globe className="h-3 w-3" /> Open</>
                  : <><Lock className="h-3 w-3" /> Approval</>}
              </span>
              <span>{program.attributionWindowDays}d attribution window</span>
              <span>·</span>
              <span>{program.allProducts ? "All products" : `${selectedProductIds.length} product${selectedProductIds.length !== 1 ? "s" : ""}`}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/dashboard/programs/${id}/settings`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors card-shadow">
              <Settings className="h-3.5 w-3.5" /> Settings
            </Link>
            <ProgramActions programId={id} currentStatus={program.status} />
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { icon: Users,        label: "Affiliates",       value: affiliates.filter(a => a.status === "active").length, color: "text-indigo-600", bg: "bg-indigo-50", gradClass: "stat-indigo" },
          { icon: MousePointer, label: "Total Clicks",     value: totalClicks,                                           color: "text-violet-600", bg: "bg-violet-50", gradClass: "stat-violet" },
          { icon: ShoppingBag,  label: "Orders",           value: orders.length,                                         color: "text-emerald-600",bg: "bg-emerald-50",gradClass: "stat-emerald" },
          { icon: TrendingUp,   label: "Pending Payouts",  value: `$${pendingAmt.toFixed(2)}`,                           color: "text-amber-600",  bg: "bg-amber-50",  gradClass: "stat-amber" },
          { icon: TrendingUp,   label: "Total Earned",     value: `$${totalEarned.toFixed(2)}`,                          color: "text-emerald-600",bg: "bg-emerald-50",gradClass: "stat-emerald" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border border-slate-200/80 p-5 card-shadow ${s.gradClass}`}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} mb-3`}>
              <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
            </div>
            <p className="text-xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Affiliate invite link ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
            <Link2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Affiliate invite link</h2>
            <p className="text-xs text-slate-400">Share this — affiliates fill out their info and get a unique referral link instantly</p>
          </div>
        </div>
        <CopyField value={inviteUrl} />
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <a href={inviteUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            Preview join page <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-slate-300">·</span>
          <Link href="/marketplace" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
            Also listed in marketplace <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── Product scope ──────────────────────────────────────────────────── */}
      {!program.allProducts && selectedProducts.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                <Package className="h-4 w-4 text-violet-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Eligible products ({selectedProducts.length})
              </h2>
            </div>
            <Link href={`/dashboard/programs/${id}/settings`}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Edit →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {selectedProducts.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.title} className="h-8 w-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                    <Package className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{p.title}</p>
                  {p.price && <p className="text-[10px] text-slate-400">${p.price.toFixed(2)}</p>}
                </div>
              </div>
            ))}
            {selectedProducts.length > 8 && (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 p-2 text-xs text-slate-400">
                +{selectedProducts.length - 8} more
              </div>
            )}
          </div>
        </div>
      )}

      {program.allProducts && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2 text-sm text-emerald-800">
          <Globe className="h-4 w-4 text-emerald-600 shrink-0" />
          Affiliates earn commission on <strong>all products</strong> in your store.
          <Link href={`/dashboard/programs/${id}/settings`} className="ml-auto text-xs font-semibold text-emerald-700 hover:text-emerald-800">
            Change →
          </Link>
        </div>
      )}

      {/* ── Pending applicants ─────────────────────────────────────────────── */}
      {program.programType === "approval" && (
        <ApplicantsPanel programId={id} initialCount={applications.length} />
      )}

      {/* ── Affiliates table ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden card-shadow">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Affiliates</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              {affiliates.length}
            </span>
          </div>
          {pendingAmt > 0 && (
            <Link href="/dashboard/payouts"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700">
              ${pendingAmt.toFixed(2)} pending payouts →
            </Link>
          )}
        </div>
        {affiliates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-3">
              <Users className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No affiliates yet</p>
            <p className="text-xs text-slate-400 mt-1">Share the invite link above to get started.</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="col-span-2">Affiliate</div>
              <div className="text-center">Clicks</div>
              <div className="text-right">Earned</div>
            </div>
            <div className="divide-y divide-slate-100">
              {affiliates.map((a, i) => {
                const earned = commissions.filter(c => c.affiliateId === a.id).reduce((s, c) => s + c.amount, 0);
                return (
                  <div key={a.id} className="grid grid-cols-4 gap-4 px-6 py-3.5 items-center hover:bg-slate-50/80 transition-colors">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white shadow-sm">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                        <p className="text-xs text-slate-400 truncate">{a.email}</p>
                      </div>
                      {a.status === "paused" && (
                        <span className="text-[10px] rounded-full bg-amber-50 text-amber-600 px-1.5 py-0.5 font-medium">paused</span>
                      )}
                    </div>
                    <div className="text-center text-sm font-semibold text-slate-700">{clickCounts[i]}</div>
                    <div className="text-right text-sm font-bold text-emerald-600">${earned.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Recent orders ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden card-shadow">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <ShoppingBag className="h-4 w-4 text-emerald-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Recent orders</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              {orders.length}
            </span>
          </div>
          {orders.length > 0 && (
            <Link href="/dashboard/payouts" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View payouts →
            </Link>
          )}
        </div>
        {orders.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <ShoppingBag className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No orders attributed yet</p>
            <p className="text-xs text-slate-400 mt-1">Orders will appear here once affiliates drive sales.</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-4 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="col-span-2">Order</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Commission</div>
            </div>
            <div className="divide-y divide-slate-100">
              {orders.slice(0, 20).map(o => {
                const aff = affiliates.find(a => a.id === o.affiliateId);
                const com = commissions.find(c => c.orderId === o.id);
                return (
                  <div key={o.id} className="grid grid-cols-4 gap-4 px-6 py-3.5 items-center hover:bg-slate-50 transition-colors">
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-slate-800 font-mono">#{o.shopifyOrderId}</p>
                      <p className="text-xs text-slate-400">
                        {aff ? `via ${aff.name}` : "No referral"} · {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right text-sm font-bold text-slate-900">${o.amount.toFixed(2)}</div>
                    <div className="text-right">
                      {com ? (
                        <div>
                          <p className="text-sm font-bold text-slate-900">${com.amount.toFixed(2)}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${com.status === "paid" ? "badge-paid" : "badge-pending"}`}>
                            {com.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
