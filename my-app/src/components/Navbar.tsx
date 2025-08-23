"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled ? 'glass-panel backdrop-blur-xl shadow-soft' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/paw-icon.png" alt="Ekonet" className="w-10 h-10 rounded-xl" />
            <span className="text-2xl font-serif font-bold text-gradient-nature">Ekonet</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">How it Works</a>
            <Link href="/report" className="text-muted-foreground hover:text-primary transition-colors">Report</Link>
            <Link href="/ngo" className="text-muted-foreground hover:text-primary transition-colors">For NGOs</Link>
            <a href="#about" className="text-muted-foreground hover:text-primary transition-colors">About</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">Login</Button>
            <Button className="nature-button-primary px-6 py-2">Sign Up</Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
