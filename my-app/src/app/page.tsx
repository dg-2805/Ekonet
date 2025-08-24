"use client"

import HeroSection from "@/components/landing-page/HeroSection"
import StatsSection from "@/components/landing-page/StatsSection"
import FeaturesSection from "@/components/landing-page/FeaturesSection"
import Footer from "@/components/landing-page/Footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
      {/* Video Background */}
      <div className="fixed inset-0 opacity-20">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          onLoadedMetadata={(e) => {
            e.currentTarget.playbackRate = 0.5; // Play at half speed
          }}
        >
          <source src="/bg-wild.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="fixed inset-0 bg-gradient-to-br from-background/40 via-background/25 to-background/40" />
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
