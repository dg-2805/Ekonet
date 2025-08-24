"use client";

import { CardSpotlight } from "@/components/ui/card-spotlight";

export default function FeaturesSection() {
  const features = [
    {
      title: "Real-time NGO Routing",
      description:
        "Our smart system instantly connects you with the nearest verified NGOs, ensuring rapid response to wildlife emergencies.",
    },
    {
      title: "Privacy-First Reporting",
      description:
        "Report incidents with complete anonymity or create an account for progress tracking. Your privacy is our priority.",
    },
    {
      title: "Impact Dashboard",
      description:
        "Track rescue progress, view success stories, and see real-time impact through beautiful, intuitive dashboards.",
    },
    {
      title: "Emergency Alerts",
      description:
        "Automated notifications ensure NGOs receive critical information instantly, reducing response times dramatically.",
    },
    {
      title: "Mobile-First Design",
      description:
        "Report incidents on the go with our responsive platform, optimized for quick reporting in emergency situations.",
    },
    {
      title: "Community Network",
      description:
        "Join a growing community of wildlife protectors, sharing knowledge and coordinating conservation efforts.",
    },
  ];
  return (
    <section id="features" className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 text-foreground">
            How <span className="text-gradient-nature">EkoNet</span> Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Cutting-edge technology meets compassionate conservation
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <CardSpotlight
              key={feature.title}
              className="h-64 w-full shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-white/10 backdrop-blur-xl border border-white/20"
              color="rgba(34, 197, 94, 0.3)"
            >
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-4 text-white relative z-20 tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-base text-gray-200 leading-relaxed relative z-20 font-light">
                  {feature.description}
                </p>
              </div>
            </CardSpotlight>
          ))}
        </div>
      </div>
    </section>
  );
}
