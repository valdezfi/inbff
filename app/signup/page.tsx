"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    router.push("/dashboard/connect-shopify");
    router.refresh();
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">Create your account</h1>
        <p className="text-foreground/60 mb-8 text-sm">Start running an affiliate program for your store.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <p className="text-xs text-foreground/50 mt-1">At least 8 characters.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-sm text-foreground/60 mt-6">
          Already have an account? <Link href="/login" className="text-accent font-medium">Log in</Link>
        </p>
      </div>
    </main>
  );
}
