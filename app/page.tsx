import { Nav } from "./components/landing/Nav";
import { Hero } from "./components/landing/Hero";
import { HowItWorks } from "./components/landing/HowItWorks";
import { Features } from "./components/landing/Features";
import { Pricing } from "./components/landing/Pricing";
import { ClosingCta } from "./components/landing/ClosingCta";
import { Footer } from "./components/landing/Footer";

export default function Home() {
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
