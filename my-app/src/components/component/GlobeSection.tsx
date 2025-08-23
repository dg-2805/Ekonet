"use client"

import dynamic from "next/dynamic"

const World = dynamic(() => import("@/components/ui/globe").then(mod => ({ default: mod.World })), {
  ssr: false,
  loading: () => <div className="w-96 h-96 bg-blue-900/20 rounded-full animate-pulse" />
})

// Sample wildlife incident data for the globe - cross-region movements
const globeData: Array<{
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
}> = [
  {
    order: 1,
    startLat: 40.7128, // New York
    startLng: -74.0060,
    endLat: 51.5074, // London
    endLng: -0.1278,
    arcAlt: 0.3,
    color: "#3b82f6"
  },
  {
    order: 2,
    startLat: 34.0522, // Los Angeles
    startLng: -118.2437,
    endLat: 35.6762, // Tokyo
    endLng: 139.6503,
    arcAlt: 0.2,
    color: "#1d4ed8"
  },
  {
    order: 3,
    startLat: 51.5074, // London
    startLng: -0.1278,
    endLat: 19.0760, // Mumbai
    endLng: 72.8777,
    arcAlt: 0.4,
    color: "#60a5fa"
  },
  {
    order: 4,
    startLat: 35.6762, // Tokyo
    startLng: 139.6503,
    endLat: -33.8688, // Sydney
    endLng: 151.2093,
    arcAlt: 0.1,
    color: "#2563eb"
  },
  {
    order: 5,
    startLat: -33.8688, // Sydney
    startLng: 151.2093,
    endLat: 40.7128, // New York
    endLng: -74.0060,
    arcAlt: 0.5,
    color: "#1e40af"
  }
]

// Use default globe configuration
const globeConfig = {
  autoRotate: true,
  autoRotateSpeed: 0.5,
  showAtmosphere: true,
  atmosphereAltitude: 0.1
}

export default function GlobeSection() {
  return (
    <div className="absolute left-[60%] md:left-[65%] top-[10rem] z-20 -translate-x-1/2 sm:top-[8rem] md:top-[2rem] w-[500px] h-[500px] md:w-[600px] md:h-[600px] lg:w-[700px] lg:h-[700px]">
      <World globeConfig={globeConfig} data={globeData} />
    </div>
  )
}

