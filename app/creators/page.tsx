import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import CreatorsLanding from "./CreatorsLanding";

export const metadata: Metadata = {
  title: "For Creators — inBFF",
  description:
    "Join inBFF as a creator. Earn 5% on every sale you drive. Automatic payouts, real-time tracking, no minimums.",
};

export default async function CreatorsPage() {
  const session = await getSession();
  const navUser = session
    ? { id: session.userId, name: "", email: "", role: session.role }
    : null;
  return <CreatorsLanding navUser={navUser} />;
}
