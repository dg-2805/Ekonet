"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden min-h-screen flex items-center">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-8">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">
              Protect • Report • Resolve
            </span>
          </div>
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold leading-tight mb-6 text-foreground">
            <span className="text-gradient-nature">Wildlife</span>{" "}
            <span className="text-foreground">Rescue</span>
            <br />
            <span className="text-foreground">in</span>{" "}
            <span className="text-gradient-nature">Seconds</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            Connect citizens with NGOs instantly. Report wildlife emergencies
            with precision, track rescue progress, and make a real difference in
            conservation efforts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="px-12 py-4 rounded-full relative bg-white/10 backdrop-blur-xl text-white text-base font-semibold tracking-wide hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 border border-white/20 group">
              <div className="absolute inset-x-0 h-px w-1/2 mx-auto -top-px shadow-2xl bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              <span className="relative z-20">Report Emergency</span>
            </button>
            <button className="px-12 py-4 rounded-full relative bg-white/10 backdrop-blur-xl text-white text-base font-semibold tracking-wide hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 border border-white/20 group">
              <div className="absolute inset-x-0 h-px w-1/2 mx-auto -top-px shadow-2xl bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              <span className="relative z-20">NGO Dashboard</span>
            </button>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 mt-16 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full" />
              <span>Verified NGO Network</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-secondary rounded-full" />
              <span>Anonymous Reporting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent rounded-full" />
              <span>Real-time Tracking</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
