"use client"

import HeroSection from "@/components/landing-page/HeroSection"
import StatsSection from "@/components/landing-page/StatsSection"
import FeaturesSection from "@/components/landing-page/FeaturesSection"
import Footer from "@/components/landing-page/Footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(/hero-wildlife-silhouettes.jpg)` }} />
      <div className="fixed inset-0 bg-gradient-to-br from-background/60 via-background/40 to-background/60" />
      <div className="hero-glow" />
      <div className="relative z-10 pt-10">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <Footer />
      </div>
    </div>
  )
}
