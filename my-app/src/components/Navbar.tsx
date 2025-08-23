"use client"


import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import AuthModal from "@/components/auth-modal";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [showDropdown, setShowDropdown] = useState(false);
  type User = {
    avatar?: string;
    // add other user properties if needed
    [key: string]: any;
  };
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check for user info in localStorage on mount
    const storedUser = localStorage.getItem('user')
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
    
    // Listen for login/signup events
    const handleUserAuth = () => {
      const updatedUser = localStorage.getItem('user')
      if (updatedUser) {
        try {
          const userData = JSON.parse(updatedUser)
          setUser(userData)
        } catch (error) {
          console.error('Error parsing updated user data:', error)
        }
      }
    }
    
    window.addEventListener('user-auth', handleUserAuth)
    return () => {
      window.removeEventListener('user-auth', handleUserAuth)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const openLogin = () => {
    setAuthMode('login')
    setAuthOpen(true)
  }
  const openSignup = () => {
    setAuthMode('signup')
    setAuthOpen(true)
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled ? 'bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-xl' : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-6 py-4">
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
            {user ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2 focus:outline-none hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                  onClick={() => setShowDropdown((prev) => !prev)}
                >
                  <img
                    src={user.avatar || "/paw-icon.png"}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border-2 border-primary shadow"
                  />
                                     <span className="text-sm font-medium text-white hidden sm:block">
                     {user.role === 'ngo' ? user.orgName : user.name}
                   </span>
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded shadow-lg z-50">
                    <button
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        localStorage.removeItem('user');
                        setUser(null);
                        setShowDropdown(false);
                      }}
                    >Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <Button className="nature-button-primary px-6 py-2" onClick={() => setAuthOpen(true)}>Sign In</Button>
            )}
          </div>
        </div>
      </div>
      <AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} />
    </nav>
  )
}

export default Navbar;
