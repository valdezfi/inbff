import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import CopyField from "@/components/CopyField";
import ApplicantsPanel from "./ApplicantsPanel";
import {
  Users, MousePointer, ShoppingBag, TrendingUp,
  ArrowLeft, Store, Percent, Settings, Play, Pause,
  CheckCircle2, Clock, XCircle,
} from "lucide-react";

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params;
  const session = await getSession();

  const program = await db.findProgramById(id);
  if (!program || program.userId !== session!.userId) notFound();

  const [stores, affiliates, orders, commissions, applications] = await Promise.all([
    db.findStoresByUserId(session!.userId),
    db.findAffiliatesByProgramId(id),
    db.findOrdersByProgramId(id),
    db.findCommissionsByProgramId(id),
    db.findApplicationsByProgramId(id, "pending"),
  ]);

  const store       = stores.find(s => s.id === program.storeId);
  const totalClicks = await db.countClicksByProgramId(id);
  const totalEarned = commissions.reduce((s, c) => s + c.amount, 0);
  const pendingAmt  = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${program.id}`;

  const clickCounts = await Promise.all(affiliates.map(a => db.countClicksByAffiliateId(a.id)));

  const statusBadge = {
    active:  "bg-emerald-50 text-emerald-700",
    paused:  "bg-amber-50  text-amber-700",
    draft:   "bg-gray-100  text-gray-600",
    deleted: "bg-red-50    text-red-700",
  }[program.status] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="space-y-7 stagger">
      {/* Header */}
      <div>
        <Link href="/dashboard/programs" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> All programs
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Store className="h-3.5 w-3.5" />{store?.shopDomain}
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              {program.name}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge}`}>{program.status}</span>
              {applications.length > 0 && (
                <span className="rounded-full bg-red-500 text-white px-2 py-0.5 text-xs font-bold">{applications.length} pending</span>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                <Percent className="h-3 w-3" />{program.commissionRate}%
              </span>
              <span className="text-xs text-gray-500">{program.programType === "open" ? "Open program" : "Approval required"} · {program.attributionWindowDays}d window</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/dashboard/programs/${id}/settings`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Settings className="h-3.5 w-3.5" /> Settings
            </Link>
            <form action={`/api/programs/${id}/pause`} method="POST">
              <button type="submit"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${program.status === "active" ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
                {program.status === "active" ? <><Pause className="h-3.5 w-3.5" />Pause</> : <><Play className="h-3.5 w-3.5" />Resume</>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: Users,        label: "Affiliates",    value: affiliates.filter(a => a.status === "active").length, color: "text-blue-600",    bg: "bg-blue-50" },
          { icon: MousePointer, label: "Clicks",        value: totalClicks,   color: "text-violet-600", bg: "bg-violet-50" },
          { icon: ShoppingBag,  label: "Orders",        value: orders.length, color: "text-emerald-600",bg: "bg-emerald-50" },
          { icon: TrendingUp,   label: "Commissions",   value: `$${pendingAmt.toFixed(2)} pending`, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg} mb-3`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-xl font-semibold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Invite link */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Invite link</h2>
        <p className="text-xs text-gray-500 mb-3">Share with potential affiliates — they fill out their info and get a unique link instantly.</p>
        <CopyField value={inviteUrl} />
      </div>

      {/* Pending applicants */}
      {program.programType === "approval" && (
        <ApplicantsPanel programId={id} initialCount={applications.length} />
      )}

      {/* Affiliates table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Affiliates</h2>
          <span className="text-xs text-gray-500">{affiliates.length} total</span>
        </div>
        {affiliates.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">No affiliates yet — share the invite link above.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-4 gap-4 px-5 py-2.5 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <div className="col-span-2">Affiliate</div><div className="text-center">Clicks</div><div className="text-right">Earned</div>
            </div>
            {affiliates.map((a, i) => {
              const earned = commissions.filter(c => c.affiliateId === a.id).reduce((s, c) => s + c.amount, 0);
              return (
                <div key={a.id} className="grid grid-cols-4 gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{a.name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                      <p className="text-xs text-gray-500 truncate">{a.email}</p>
                    </div>
                    {a.status === "paused" && <span className="text-[10px] rounded-full bg-amber-50 text-amber-600 px-2 py-0.5">paused</span>}
                  </div>
                  <div className="text-center text-sm font-medium text-gray-700">{clickCounts[i]}</div>
                  <div className="text-right text-sm font-semibold text-emerald-700">${earned.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent orders</h2>
          {pendingAmt > 0 && <Link href="/dashboard/payouts" className="text-xs font-medium text-blue-600 hover:text-blue-700">${pendingAmt.toFixed(2)} pending payouts →</Link>}
        </div>
        {orders.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">No orders yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-4 gap-4 px-5 py-2.5 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <div className="col-span-2">Order</div><div className="text-right">Amount</div><div className="text-right">Commission</div>
            </div>
            {orders.map(o => {
              const aff = affiliates.find(a => a.id === o.affiliateId);
              const com = commissions.find(c => c.orderId === o.id);
              return (
                <div key={o.id} className="grid grid-cols-4 gap-4 px-5 py-3.5 items-center hover:bg-gray-50">
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-900">{o.shopifyOrderId}</p>
                    <p className="text-xs text-gray-500">via {aff?.name ?? "—"} · {new Date(o.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right text-sm font-medium text-gray-900">${o.amount.toFixed(2)}</div>
                  <div className="text-right">
                    {com ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">${com.amount.toFixed(2)}</p>
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${com.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{com.status}</span>
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
