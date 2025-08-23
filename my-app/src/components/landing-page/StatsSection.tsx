"use client"

import { Card } from "@/components/ui/card"

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
            <Card key={stat.label} className="rounded-2xl border border-border/50 bg-card text-card-foreground backdrop-blur-sm shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-warm)] p-6 text-center">
              <div className="text-3xl font-serif font-bold text-gradient-nature mb-2">{stat.number}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
