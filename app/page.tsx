import Link from "next/link";

const STEPS = [
  { label: "Connect your Shopify store", detail: "Link your store domain in under a minute." },
  { label: "Create an affiliate program", detail: "Set a commission rate and give it a name." },
  { label: "Affiliates join", detail: "Each one gets a unique referral link automatically." },
  { label: "Customers click through", detail: "We remember who sent them for 30 days." },
  { label: "They buy something", detail: "Shopify notifies us the moment the order comes in." },
  { label: "Commission is calculated and paid", detail: "You review it, then mark it paid." },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="border-b border-black/10">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent mb-6">
            Affiliate programs for Shopify stores
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold leading-[1.05] max-w-2xl">
            Turn your Shopify store into an affiliate engine.
          </h1>
          <p className="mt-6 text-lg text-foreground/70 max-w-xl leading-relaxed">
            Connect your store, set a commission rate, and let affiliates bring you customers.
            We track every click, attribute every order, and calculate every payout automatically.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 rounded-full bg-accent text-white font-medium hover:bg-accent-dark transition-colors"
            >
              Connect your store
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-full border border-black/15 hover:border-black/30 transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-semibold mb-2">How it works</h2>
        <p className="text-foreground/60 mb-12 max-w-xl">
          Every order that comes in traces back to exactly one referral link, start to payout.
        </p>
        <ol className="space-y-8">
          {STEPS.map((step, i) => (
            <li key={step.label} className="flex gap-5 items-start">
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background font-mono text-xs">
                {i + 1}
              </div>
              <div>
                <h3 className="font-semibold">{step.label}</h3>
                <p className="text-foreground/60 mt-1">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-black/10">
        <div className="mx-auto max-w-5xl px-6 py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Ready to run your first program?</h2>
            <p className="text-foreground/60 mt-1">It takes about two minutes to set up.</p>
          </div>
          <Link href="/signup" className="px-6 py-3 rounded-full bg-accent text-white font-medium hover:bg-accent-dark transition-colors shrink-0">
            Get started
          </Link>
        </div>
      </section>
    </main>
  );
}
