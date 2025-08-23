"use client"

import { Card } from "@/components/ui/card"

export default function FeaturesSection() {
  const features = [
    { title: "Real-time NGO Routing", description: "Our smart system instantly connects you with the nearest verified NGOs, ensuring rapid response to wildlife emergencies." },
    { title: "Privacy-First Reporting", description: "Report incidents with complete anonymity or create an account for progress tracking. Your privacy is our priority." },
    { title: "Impact Dashboard", description: "Track rescue progress, view success stories, and see real-time impact through beautiful, intuitive dashboards." },
    { title: "Emergency Alerts", description: "Automated notifications ensure NGOs receive critical information instantly, reducing response times dramatically." },
    { title: "Mobile-First Design", description: "Report incidents on the go with our responsive platform, optimized for quick reporting in emergency situations." },
    { title: "Community Network", description: "Join a growing community of wildlife protectors, sharing knowledge and coordinating conservation efforts." },
  ]
  return (
    <section id="features" className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-foreground">
            How <span className="text-gradient-nature">Ekonet</span> Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Cutting-edge technology meets compassionate conservation
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={feature.title} className="rounded-2xl border border-border/50 bg-card text-card-foreground backdrop-blur-sm shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-warm)] p-8">
              <h3 className="text-xl font-serif font-bold mb-4 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
