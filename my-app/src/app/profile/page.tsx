
"use client";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  if (!user) return <div className="p-8">Please log in to view your profile.</div>;

  // Get initial for avatar
  const initial = user.name ? user.name[0].toUpperCase() : (user.organizationName ? user.organizationName[0].toUpperCase() : user.email[0].toUpperCase());
    const handleLogout = () => {
      localStorage.removeItem("token");
      window.location.href = "/";
    };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="size-16 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold">
          {initial}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.name || user.organizationName || user.email}</h1>
          <div className="text-muted-foreground">{user.email}</div>
        </div>
      </div>
      <div className="space-y-2">
        {user.location && <div><strong>Location:</strong> {user.location}</div>}
        {user.phone && <div><strong>Phone:</strong> {user.phone}</div>}
        {user.description && <div><strong>Description:</strong> {user.description}</div>}
        <div><strong>Type:</strong> {user.type}</div>
      </div>
        <button onClick={handleLogout} className="mt-4 px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700">Logout</button>
    </div>
  );
}
