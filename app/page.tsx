import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LandingHero from "./components/landing/LandingHero";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  // Unified.to sometimes appends errors to the root URL — forward them.
  if (params.error) {
    redirect("/dashboard/connect-shopify?error=unified-integration-disabled");
  }

  const session = await getSession();

  return <LandingHero isLoggedIn={!!session} />;
}
