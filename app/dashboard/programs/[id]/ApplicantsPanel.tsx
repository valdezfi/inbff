"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, User } from "lucide-react";

interface Applicant {
  id: string; userId: string; status: string; pitch: string | null;
  appliedAt: string; userName: string; userEmail: string;
}

export default function ApplicantsPanel({ programId, initialCount }: { programId: string; initialCount: number }) {
  const router = useRouter();
  const [apps, setApps]   = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]   = useState(initialCount > 0);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/programs/${programId}/applications?status=pending`)
      .then(r => r.json())
      .then(setApps)
      .catch(console.error);
  }, [open, programId]);

  async function handle(appId: string, action: "approve" | "reject") {
    setActing(appId);
    await fetch(`/api/programs/${programId}/applications/${appId}/${action}`, { method: "POST" });
    setActing(null);
    setApps(prev => prev.filter(a => a.id !== appId));
    router.refresh();
  }

  if (initialCount === 0 && apps.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-100 transition-colors">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-900">
            Pending applications ({apps.length || initialCount})
          </span>
        </div>
        <span className="text-xs text-amber-600">{open ? "Hide" : "Review"}</span>
      </button>

      {open && (
        <div className="border-t border-amber-200 divide-y divide-amber-200">
          {apps.length === 0 ? (
            <p className="px-5 py-4 text-sm text-amber-700">No pending applications.</p>
          ) : (
            apps.map(app => (
              <div key={app.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{app.userName}</p>
                  <p className="text-xs text-gray-500">{app.userEmail}</p>
                  {app.pitch && <p className="text-xs text-gray-600 mt-1.5 italic">"{app.pitch}"</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(app.appliedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handle(app.id, "approve")} disabled={acting === app.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-60">
                    {acting === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Approve
                  </button>
                  <button onClick={() => handle(app.id, "reject")} disabled={acting === app.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60">
                    {acting === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
