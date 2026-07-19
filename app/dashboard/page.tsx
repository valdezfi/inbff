import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardOverview() {
  const session = await getSession();

  const [stores, programs] = await Promise.all([
    db.findStoresByUserId(session!.userId),
    db.findProgramsByUserId(session!.userId),
  ]);

  const programIds = programs.map((p) => p.id);
  const commissions = await db.findCommissionsByProgramIds(programIds);
  const pending = commissions.filter((c) => c.status === "pending");

  // Count orders across all programs
  const orderCounts = await Promise.all(
    programs.map((p) => db.findOrdersByProgramId(p.id))
  );
  const totalOrders = orderCounts.flat().length;

  if (stores.length === 0) {
    return (
      <div className="rounded-xl border border-black/10 p-10 text-center">
        <h1 className="text-xl font-semibold mb-2">Connect your Shopify store to get started</h1>
        <p className="text-foreground/60 mb-6 max-w-md mx-auto">
          Once your store is connected, you can create an affiliate program and start inviting affiliates.
        </p>
        <Link
          href="/dashboard/connect-shopify"
          className="inline-block px-6 py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent-dark transition-colors"
        >
          Connect store
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Stores connected" value={stores.length} />
        <Stat label="Active programs" value={programs.length} />
        <Stat label="Orders attributed" value={totalOrders} />
        <Stat
          label="Commissions pending"
          value={`$${pending.reduce((s, c) => s + c.amount, 0).toFixed(2)}`}
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your programs</h2>
        <Link href="/dashboard/programs/new" className="text-sm text-accent font-medium">
          + New program
        </Link>
      </div>

      {programs.length === 0 ? (
        <p className="text-foreground/60 text-sm">
          No affiliate programs yet — create one to start inviting affiliates.
        </p>
      ) : (
        <div className="divide-y divide-black/10 border border-black/10 rounded-xl overflow-hidden">
          {await Promise.all(
            programs.map(async (p) => {
              const store = stores.find((s) => s.id === p.storeId);
              const affiliates = await db.findAffiliatesByProgramId(p.id);
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/programs/${p.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-black/[.02] transition-colors"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-foreground/50">
                      {store?.shopDomain} · {p.commissionRate}% commission
                    </p>
                  </div>
                  <p className="text-sm text-foreground/50">
                    {affiliates.length} affiliate{affiliates.length === 1 ? "" : "s"}
                  </p>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/10 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-foreground/50 mt-1">{label}</p>
    </div>
  );
}
