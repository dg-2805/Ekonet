"use client"

import { CardSpotlight } from "@/components/ui/card-spotlight"

export default function StatsSection() {
  const stats = [
    { number: "2M+", label: "Animals Protected" },
    { number: "1,200+", label: "Partner NGOs" },
    { number: "~4min", label: "Avg. Response Time" },
    { number: "95%", label: "Success Rate" },
  ]
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <CardSpotlight 
              key={stat.label} 
              className="h-32 w-full shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-white/10 backdrop-blur-xl border border-white/20"
              color="rgba(34, 197, 94, 0.3)"
            >
              <div className="text-3xl font-serif font-bold text-gradient-nature mb-2 relative z-20">{stat.number}</div>
              <div className="text-sm text-muted-foreground relative z-20">{stat.label}</div>
            </CardSpotlight>
          ))}
        </div>
      </div>
    </section>
  )
}
