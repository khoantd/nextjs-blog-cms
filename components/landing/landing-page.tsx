import { HeroSection } from "./hero-section";
import { FeaturesSection } from "./features-section";
import { StatsSection } from "./stats-section";
import { HowItWorksSection } from "./how-it-works-section";
import { Footer } from "./footer";

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <HowItWorksSection />
      <Footer />
    </div>
  );
}
