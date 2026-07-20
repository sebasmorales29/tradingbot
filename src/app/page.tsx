import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Method } from "@/components/landing/Method";
import { StartCTA } from "@/components/landing/StartCTA";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="flex-1">
      <Nav />
      <Hero />
      <HowItWorks />
      <Method />
      <StartCTA />
      <Footer />
    </main>
  );
}
