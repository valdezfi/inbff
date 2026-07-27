import type { Metadata } from "next";
import CreatorsLanding from "./CreatorsLanding";

export const metadata: Metadata = {
  title: "For Creators — inBFF",
  description:
    "Join inBFF as a creator. Earn 5% on every sale you drive. Automatic payouts, real-time tracking, no minimums.",
};

export default function CreatorsPage() {
  return <CreatorsLanding />;
}
