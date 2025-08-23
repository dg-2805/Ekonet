import { useEffect, useState } from "react";

export function useUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    window.addEventListener('user-auth', () => {
      const updatedUser = localStorage.getItem('user');
      if (updatedUser) setUser(JSON.parse(updatedUser));
    });
    return () => {
      window.removeEventListener('user-auth', () => {});
    };
  }, []);

  return { user };
}
