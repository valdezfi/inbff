import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Commission } from "@/lib/types";
import PayButton from "./PayButton";

export default async function PayoutsPage() {
  const session = await getSession();

  const programs = await db.findProgramsByUserId(session!.userId);
  const programIds = programs.map((p) => p.id);
  const commissions = await db.findCommissionsByProgramIds(programIds);

  const pending = commissions.filter((c) => c.status === "pending");
  const paid = commissions.filter((c) => c.status === "paid");

  // Pre-fetch affiliates for all programs in one pass
  const affiliatesByProgram = new Map(
    await Promise.all(
      programs.map(async (p) => [p.id, await db.findAffiliatesByProgramId(p.id)] as const)
    )
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Payouts</h1>
        <p className="text-sm text-foreground/60 mt-1">
          {process.env.STRIPE_SECRET_KEY
            ? "Clicking Pay executes a real Stripe transfer to the affiliate's connected account."
            : "Set STRIPE_SECRET_KEY to enable real Stripe payouts. Until then, clicking Pay marks the commission paid in the database only."}
        </p>
      </div>

      <div>
        <h2 className="font-medium mb-3">
          Pending — ${pending.reduce((s, c) => s + c.amount, 0).toFixed(2)}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-foreground/60">Nothing pending.</p>
        ) : (
          <div className="border border-black/10 rounded-xl overflow-hidden divide-y divide-black/10">
            {pending.map((c) => (
              <CommissionRow
                key={c.id}
                commission={c}
                programs={programs}
                affiliatesByProgram={affiliatesByProgram}
                showAction
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-medium mb-3">Paid</h2>
        {paid.length === 0 ? (
          <p className="text-sm text-foreground/60">No payouts yet.</p>
        ) : (
          <div className="border border-black/10 rounded-xl overflow-hidden divide-y divide-black/10">
            {paid.map((c) => (
              <CommissionRow
                key={c.id}
                commission={c}
                programs={programs}
                affiliatesByProgram={affiliatesByProgram}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommissionRow({
  commission,
  programs,
  affiliatesByProgram,
  showAction,
}: {
  commission: Commission;
  programs: { id: string; name: string }[];
  affiliatesByProgram: Map<string, { id: string; name: string }[]>;
  showAction?: boolean;
}) {
  const program = programs.find((p) => p.id === commission.programId);
  const affiliates = affiliatesByProgram.get(commission.programId) ?? [];
  const affiliate = affiliates.find((a) => a.id === commission.affiliateId);

  return (
    <div className="px-5 py-4 flex items-center justify-between text-sm">
      <div>
        <p className="font-medium">{affiliate?.name ?? "—"}</p>
        <p className="text-foreground/50">
          {program?.name}
          {commission.paidAt
            ? ` · paid ${new Date(commission.paidAt).toLocaleDateString()}`
            : ""}
          {commission.stripeTransferId
            ? ` · Stripe ${commission.stripeTransferId}`
            : ""}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <p className="font-medium">${commission.amount.toFixed(2)}</p>
        {showAction && <PayButton commissionId={commission.id} />}
      </div>
    </div>
  );
}
