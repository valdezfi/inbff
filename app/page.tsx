import { redirect } from "next/navigation";
import { Nav } from "./components/landing/Nav";
import { Hero } from "./components/landing/Hero";
import { HowItWorks } from "./components/landing/HowItWorks";
import { Features } from "./components/landing/Features";
import { Pricing } from "./components/landing/Pricing";
import { ClosingCta } from "./components/landing/ClosingCta";
import { Footer } from "./components/landing/Footer";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  // Unified.to sometimes appends errors to the root URL instead of using
  // the error_redirect — catch them here and forward to the connect page.
  if (params.error) {
    redirect("/dashboard/connect-shopify?error=unified-integration-disabled");
  }

  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
