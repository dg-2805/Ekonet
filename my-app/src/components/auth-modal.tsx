"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type UserType = "citizen" | "ngo"
type AuthMode = "login" | "signup"

interface AuthModalProps {
  open: boolean
  mode: AuthMode
  onClose: () => void
}

interface CitizenForm {
  name: string
  email: string
  location: string
  password: string
  confirmPassword: string
}

interface NGOForm {
  organizationName: string
  contactPerson: string
  email: string
  phone: string
  location: string
  description: string
  password: string
  confirmPassword: string
}

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export default function AuthModal({ open, mode, onClose }: AuthModalProps) {
  const [userType, setUserType] = useState<UserType>("citizen")
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: "",
    rememberMe: false,
  })
  const [citizenForm, setCitizenForm] = useState<CitizenForm>({
    name: "",
    email: "",
    location: "",
    password: "",
    confirmPassword: "",
  })
  const [ngoForm, setNGOForm] = useState<NGOForm>({
    organizationName: "",
    contactPerson: "",
    email: "",
    phone: "",
    location: "",
    description: "",
    password: "",
    confirmPassword: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

    // Helper to show error/success
    const showMessage = (msg: string) => {
      alert(msg)
    }

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: loginForm.email,
            password: loginForm.password,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          // Save token in localStorage or cookie
          localStorage.setItem("token", data.token)
          showMessage("Login successful!")
          onClose()
        } else {
          showMessage(data.error || "Login failed")
        }
      } catch (err) {
        showMessage("Login error")
      }
      setIsSubmitting(false)
    }

    const handleCitizenSignup = async (e: React.FormEvent) => {
      e.preventDefault()
      if (citizenForm.password !== citizenForm.confirmPassword) {
        showMessage("Passwords don't match!")
        return
      }
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: citizenForm.email,
            password: citizenForm.password,
            name: citizenForm.name,
            location: citizenForm.location,
            type: "citizen"
          }),
        })
        const data = await res.json()
        if (res.ok) {
          showMessage("Signup successful!")
          onClose()
        } else {
          showMessage(data.error || "Signup failed")
        }
      } catch (err) {
        showMessage("Signup error")
      }
      setIsSubmitting(false)
    }

    const handleNGOSignup = async (e: React.FormEvent) => {
      e.preventDefault()
      if (ngoForm.password !== ngoForm.confirmPassword) {
        showMessage("Passwords don't match!")
        return
      }
      setIsSubmitting(true)
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: ngoForm.email,
            password: ngoForm.password,
            organizationName: ngoForm.organizationName,
            contactPerson: ngoForm.contactPerson,
            phone: ngoForm.phone,
            location: ngoForm.location,
            description: ngoForm.description,
            type: "ngo"
          }),
        })
        const data = await res.json()
        if (res.ok) {
          showMessage("NGO registered!")
          onClose()
        } else {
          showMessage(data.error || "Signup failed")
        }
      } catch (err) {
        showMessage("Signup error")
      }
      setIsSubmitting(false)
    }
  if (!open) return null


  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
              <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card p-6 shadow-2xl max-h-[90vh]">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/20 grid place-items-center">
              <span className="i-heroicons-paw-print-20-solid text-primary" aria-hidden />
            </div>
            <h2 className="text-xl font-semibold text-card-foreground">
              {mode === "login" ? "Welcome back" : "Join Ekonet"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-card-foreground"
            aria-label="Close"
          >
            ✕
          </Button>
        </div>

        {mode === "login" ? (
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="px-0 pb-4">
              <CardTitle className="text-lg">Sign in to your account</CardTitle>
              <CardDescription>Access your dashboard and track wildlife reports</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="bg-input border-border focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="bg-input border-border focus:ring-ring"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={loginForm.rememberMe}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, rememberMe: e.target.checked }))}
                    className="rounded border-border bg-input focus:ring-ring"
                  />
                  <Label htmlFor="remember-me" className="text-sm text-muted-foreground">
                    Remember me
                  </Label>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={userType} onValueChange={(value) => setUserType(value as UserType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger
                value="citizen"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Citizen
              </TabsTrigger>
              <TabsTrigger
                value="ngo"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                NGO
              </TabsTrigger>
            </TabsList>

            <TabsContent value="citizen" className="mt-6">
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-lg">Create citizen account</CardTitle>
                  <CardDescription>Join our community to report and track wildlife incidents</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <form onSubmit={handleCitizenSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="citizen-name">Full name</Label>
                      <Input
                        id="citizen-name"
                        type="text"
                        placeholder="John Doe"
                        value={citizenForm.name}
                        onChange={(e) => setCitizenForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="bg-input border-border focus:ring-ring"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="citizen-email">Email address</Label>
                      <Input
                        id="citizen-email"
                        type="email"
                        placeholder="you@example.com"
                        value={citizenForm.email}
                        onChange={(e) => setCitizenForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="bg-input border-border focus:ring-ring"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="citizen-location">Location</Label>
                      <Input
                        id="citizen-location"
                        type="text"
                        placeholder="City, State/Province"
                        value={citizenForm.location}
                        onChange={(e) => setCitizenForm((prev) => ({ ...prev, location: e.target.value }))}
                        className="bg-input border-border focus:ring-ring"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="citizen-password">Password</Label>
                      <Input
                        id="citizen-password"
                        type="password"
                        placeholder="••••••••"
                        value={citizenForm.password}
                        onChange={(e) => setCitizenForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="bg-input border-border focus:ring-ring"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="citizen-confirm-password">Confirm password</Label>
                      <Input
                        id="citizen-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={citizenForm.confirmPassword}
                        onChange={(e) => setCitizenForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className="bg-input border-border focus:ring-ring"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Creating account..." : "Create account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ngo" className="mt-6">
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader className="px-0 pb-4">
                  <CardTitle className="text-lg">Register your NGO</CardTitle>
                  <CardDescription>Join our network of wildlife protection organizations</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <form onSubmit={handleNGOSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ngo-name">Organization name</Label>
                      <Input
                        id="ngo-name"
                        type="text"
                        placeholder="Wildlife Protection Society"
                        value={ngoForm.organizationName}
                        onChange={(e) => setNGOForm((prev) => ({ ...prev, organizationName: e.target.value }))}
                        className="bg-input border-border focus:ring-ring"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ngo-contact">Contact person</Label>
                      <Input
                        id="ngo-contact"
                        type="text"
                        placeholder="Jane Smith"
                        value={ngoForm.contactPerson}
                        onChange={(e) => setNGOForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                        className="bg-input border-border focus:ring-ring"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ngo-email">Email address</Label>
                        <Input
                          id="ngo-email"
                          type="email"
                          placeholder="contact@ngo.org"
                          value={ngoForm.email}
                          onChange={(e) => setNGOForm((prev) => ({ ...prev, email: e.target.value }))}
                          className="bg-input border-border focus:ring-ring"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ngo-phone">Phone number</Label>
                        <Input
                          id="ngo-phone"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={ngoForm.phone}
                          onChange={(e) => setNGOForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="bg-input border-border focus:ring-ring"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ngo-location">Service location</Label>
                      <Input
                        id="ngo-location"
                        type="text"
                        placeholder="City, State/Province or Region"
                        value={ngoForm.location}
                        onChange={(e) => setNGOForm((prev) => ({ ...prev, location: e.target.value }))}
                        className="bg-input border-border focus:ring-ring"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ngo-description">Organization description</Label>
                      <Textarea
                        id="ngo-description"
                        placeholder="Brief description of your organization's mission and wildlife protection activities..."
                        value={ngoForm.description}
                        onChange={(e) => setNGOForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="bg-input border-border focus:ring-ring min-h-[80px]"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ngo-password">Password</Label>
                      <Input
                        id="ngo-password"
                        type="password"
                        placeholder="••••••••"
                        value={ngoForm.password}
                        onChange={(e) => setNGOForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="bg-input border-border focus:ring-ring"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ngo-confirm-password">Confirm password</Label>
                      <Input
                        id="ngo-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={ngoForm.confirmPassword}
                        onChange={(e) => setNGOForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className="bg-input border-border focus:ring-ring"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Registering NGO..." : "Register NGO"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => window.location.reload()} className="text-primary hover:underline">
                  Sign in
                </button>
              </p>
            </div>
          </Tabs>
        )}

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <a href="#" className="text-primary hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
