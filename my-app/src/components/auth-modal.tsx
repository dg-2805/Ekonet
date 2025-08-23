"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

type UserType = "reporter" | "ngo"
type AuthMode = "login" | "signup"

interface AuthModalProps {
  open: boolean
  mode: AuthMode
  onClose: () => void
}

interface ReporterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface NGOForm {
  name: string; // contact person
  email: string;
  orgName: string;
  description: string;
  location: string;
  licenseDocument: File | null;
  licenseExpiry: string;
  licenseAuthority: string;
  password: string;
  confirmPassword: string;
}

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export default function AuthModal({ open, mode, onClose }: AuthModalProps) {
  const [userType, setUserType] = useState<UserType>("reporter");
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: "",
    rememberMe: false
  });
  const [reporterForm, setReporterForm] = useState<ReporterForm>({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [ngoForm, setNGOForm] = useState<NGOForm>({
    name: "",
    email: "",
    orgName: "",
    description: "",
    location: "",
    licenseDocument: null,
    licenseExpiry: "",
    licenseAuthority: "",
    password: "",
    confirmPassword: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>(mode)

  // Sync local authMode with prop changes
  useEffect(() => {
    setAuthMode(mode)
  }, [mode])

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
        localStorage.setItem("token", data.token)
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user))
          window.dispatchEvent(new Event("user-auth"))
        }
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

  const handleReporterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reporterForm.password !== reporterForm.confirmPassword) {
      showMessage("Passwords don't match!");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: reporterForm.email,
          password: reporterForm.password,
          name: reporterForm.name,
          role: "reporter"
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          window.dispatchEvent(new Event("user-auth"));
        }
        showMessage("Signup successful!");
        onClose();
      } else {
        showMessage(data.error || "Signup failed");
      }
    } catch (err) {
      showMessage("Signup error");
    }
    setIsSubmitting(false);
  };

  const handleNGOSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ngoForm.password !== ngoForm.confirmPassword) {
      showMessage("Passwords don't match!");
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("email", ngoForm.email);
      formData.append("password", ngoForm.password);
      formData.append("name", ngoForm.name);
      formData.append("orgName", ngoForm.orgName);
      formData.append("description", ngoForm.description);
      formData.append("location", ngoForm.location);
      if (ngoForm.licenseDocument) {
        formData.append("licenseDocument", ngoForm.licenseDocument);
      }
      formData.append("licenseExpiry", ngoForm.licenseExpiry);
      formData.append("licenseAuthority", ngoForm.licenseAuthority);
      formData.append("role", "ngo");
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          window.dispatchEvent(new Event("user-auth"));
        }
        showMessage("NGO registered!");
        onClose();
      } else {
        showMessage(data.error || "Signup failed");
      }
    } catch (err) {
      showMessage("Signup error");
    }
    setIsSubmitting(false);
  };

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/20 grid place-items-center">
              <span className="text-primary" aria-hidden>🐾</span>
            </div>
            <h2 className="text-xl font-semibold text-card-foreground">
              {authMode === "login" ? "Welcome back" : "Join WildWatch"}
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

        {authMode === "login" ? (
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader className="px-0 pb-4">
              <CardTitle className="text-lg">Sign in to your account</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard</CardDescription>
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
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
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
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-input border-border focus:ring-ring"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={loginForm.rememberMe}
                    onCheckedChange={(checked) => setLoginForm(prev => ({ ...prev, rememberMe: !!checked }))}
                  />
                  <Label htmlFor="remember-me" className="text-sm">Remember me</Label>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setAuthMode('signup')}
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs value={userType} onValueChange={(value) => setUserType(value as UserType)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary">
                <TabsTrigger
                  value="reporter"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Reporter
                </TabsTrigger>
                <TabsTrigger
                  value="ngo"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  NGO
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reporter" className="mt-6">
                <Card className="border-0 bg-transparent shadow-none">
                  <CardHeader className="px-0 pb-4">
                    <CardTitle className="text-lg">Join as a Reporter</CardTitle>
                    <CardDescription>Help protect wildlife by reporting incidents in your area</CardDescription>
                  </CardHeader>
                  <CardContent className="px-0">
                    <form onSubmit={handleReporterSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reporter-name">Full name</Label>
                        <Input
                          id="reporter-name"
                          type="text"
                          placeholder="John Doe"
                          value={reporterForm.name}
                          onChange={(e) => setReporterForm(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-input border-border focus:ring-ring"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reporter-email">Email address</Label>
                        <Input
                          id="reporter-email"
                          type="email"
                          placeholder="john@example.com"
                          value={reporterForm.email}
                          onChange={(e) => setReporterForm(prev => ({ ...prev, email: e.target.value }))}
                          className="bg-input border-border focus:ring-ring"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reporter-password">Password</Label>
                        <Input
                          id="reporter-password"
                          type="password"
                          placeholder="••••••••"
                          value={reporterForm.password}
                          onChange={(e) => setReporterForm(prev => ({ ...prev, password: e.target.value }))}
                          className="bg-input border-border focus:ring-ring"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reporter-confirm-password">Confirm password</Label>
                        <Input
                          id="reporter-confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={reporterForm.confirmPassword}
                          onChange={(e) => setReporterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="bg-input border-border focus:ring-ring"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Creating account..." : "Create Reporter Account"}
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
                        <Label htmlFor="ngo-orgName">Organization name</Label>
                        <Input
                          id="ngo-orgName"
                          type="text"
                          placeholder="Wildlife Protection Society"
                          value={ngoForm.orgName}
                          onChange={(e) => setNGOForm((prev) => ({ ...prev, orgName: e.target.value }))}
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
                          value={ngoForm.name}
                          onChange={(e) => setNGOForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="bg-input border-border focus:ring-ring"
                          required
                        />
                      </div>
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
                        <Label htmlFor="ngo-license-document">Upload License Document</Label>
                        <Input
                          id="ngo-license-document"
                          type="file"
                          accept="application/pdf,image/*"
                          onChange={e => setNGOForm(prev => ({ ...prev, licenseDocument: e.target.files ? e.target.files[0] : null }))}
                          className="bg-input border-border focus:ring-ring"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ngo-license-expiry">License Expiry Date</Label>
                        <input
                          id="ngo-license-expiry"
                          type="date"
                          value={ngoForm.licenseExpiry}
                          onChange={e => setNGOForm(prev => ({ ...prev, licenseExpiry: e.target.value }))}
                          className="bg-input border-border focus:ring-ring cursor-pointer"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ngo-license-authority">Issuing Authority</Label>
                        <Input
                          id="ngo-license-authority"
                          type="text"
                          placeholder="Issuing Authority Name"
                          value={ngoForm.licenseAuthority}
                          onChange={e => setNGOForm(prev => ({ ...prev, licenseAuthority: e.target.value }))}
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
            </Tabs>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => setAuthMode('login')} className="text-primary hover:underline">
                  Sign in
                </button>
              </p>
            </div>
          </>
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
  );
}