import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ProgramsPage() {
  const session = await getSession();
  const [programs, stores] = await Promise.all([
    db.findProgramsByUserId(session!.userId),
    db.findStoresByUserId(session!.userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Programs</h1>
        <Link href="/dashboard/programs/new" className="text-sm text-accent font-medium">
          + New program
        </Link>
      </div>

      {programs.length === 0 ? (
        <p className="text-foreground/60 text-sm">No affiliate programs yet.</p>
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
