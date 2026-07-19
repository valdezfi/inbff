import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import CopyField from "@/components/CopyField";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();

  const program = await db.findProgramById(id);
  if (!program || program.userId !== session!.userId) notFound();

  const [stores, affiliates, orders, commissions] = await Promise.all([
    db.findStoresByUserId(session!.userId),
    db.findAffiliatesByProgramId(id),
    db.findOrdersByProgramId(id),
    db.findCommissionsByProgramId(id),
  ]);

  const store = stores.find((s) => s.id === program.storeId);
  const clickCounts = await Promise.all(
    affiliates.map((a) => db.countClicksByAffiliateId(a.id))
  );
  const totalClicks = await db.countClicksByProgramId(id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${program.id}`;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-foreground/50">{store?.shopDomain}</p>
        <h1 className="text-xl font-semibold">{program.name}</h1>
        <p className="text-sm text-foreground/50 mt-1">
          {program.commissionRate}% commission on every referred order
        </p>
      </div>

      <div>
        <h2 className="font-medium mb-2">Invite affiliates</h2>
        <p className="text-sm text-foreground/60 mb-3">
          Share this link — anyone who fills it out gets their own unique referral link.
        </p>
        <CopyField value={inviteUrl} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Affiliates" value={affiliates.length} />
        <Stat label="Clicks" value={totalClicks} />
        <Stat label="Orders" value={orders.length} />
      </div>

      <div>
        <h2 className="font-medium mb-3">Affiliates</h2>
        {affiliates.length === 0 ? (
          <p className="text-sm text-foreground/60">
            No affiliates yet — share the invite link above.
          </p>
        ) : (
          <div className="border border-black/10 rounded-xl overflow-hidden divide-y divide-black/10">
            {affiliates.map((a, i) => {
              const earned = commissions
                .filter((c) => c.affiliateId === a.id)
                .reduce((s, c) => s + c.amount, 0);
              return (
                <div key={a.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{a.name}</p>
                    <p className="text-xs text-foreground/50">
                      {a.email} · code {a.referralCode} · {clickCounts[i]} clicks
                    </p>
                  </div>
                  <p className="text-sm font-medium">${earned.toFixed(2)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-medium mb-3">Recent orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-foreground/60">
            No orders attributed to this program yet.
          </p>
        ) : (
          <div className="border border-black/10 rounded-xl overflow-hidden divide-y divide-black/10">
            {orders.map((o) => {
              const affiliate = affiliates.find((a) => a.id === o.affiliateId);
              const commission = commissions.find((c) => c.orderId === o.id);
              return (
                <div
                  key={o.id}
                  className="px-5 py-4 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium">Order {o.shopifyOrderId}</p>
                    <p className="text-foreground/50">
                      via {affiliate?.name ?? "—"} ·{" "}
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>${o.amount.toFixed(2)}</p>
                    {commission && (
                      <p
                        className={`text-xs ${
                          commission.status === "paid"
                            ? "text-accent"
                            : "text-foreground/50"
                        }`}
                      >
                        ${commission.amount.toFixed(2)} commission · {commission.status}
                      </p>
                    )}
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-black/10 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-foreground/50 mt-1">{label}</p>
    </div>
  );
}
