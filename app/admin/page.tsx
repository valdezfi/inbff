import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  TrendingUp,
  DollarSign,
  Users,
  Store,
  ShoppingBag,
  ShieldCheck,
  Activity,
  AlertTriangle
} from "lucide-react";

export default async function PlatformAdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== "platform_admin") {
    redirect("/auth/login");
  }

  const stats = await db.getPlatformAdminStats();
  const { programs: activePrograms } = await db.findActivePrograms({});

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Platform Administrator Portal
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Global Overview</h1>
            <p className="text-slate-500 text-sm mt-1">
              Real-time multi-brand performance, GMV processing, and platform fees.
            </p>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Total GMV</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">${stats.totalGmv.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-400 mt-1">Processed across all brands</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Platform Take</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-indigo-600">${stats.totalPlatformRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-400 mt-1">Platform revenue cut</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Attributed sales</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Brands</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.activeBrands.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Connected Shopify stores</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Creators</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.activeCreators.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Affiliate marketers</p>
          </div>
        </div>

        {/* Active Campaigns Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Active Campaigns & Brand Programs</h2>
              <p className="text-xs text-slate-500">Live multi-tenant programs operating across the network</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-600">Network Operational</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">Program Name</th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Commission</th>
                  <th className="py-3 px-6">Type</th>
                  <th className="py-3 px-6">Attribution Window</th>
                  <th className="py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activePrograms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                      No active affiliate programs found.
                    </td>
                  </tr>
                ) : (
                  activePrograms.map((prog) => (
                    <tr key={prog.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-900">{prog.name}</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {prog.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-emerald-600">{prog.commissionRate}%</td>
                      <td className="py-4 px-6 capitalize">{prog.programType}</td>
                      <td className="py-4 px-6">{prog.attributionWindowDays} days</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fraud Monitoring & System Health Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
              <Activity className="w-4 h-4" />
              Automated Fraud & Refund Protection
            </div>
            <p className="text-slate-300 text-xs max-w-xl">
              All order webhooks verify HMAC signatures, discount codes are isolated per-creator, and refunded orders automatically reverse commission accruals.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-sm text-xs text-white border border-white/10 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              HMAC Validation Active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
