"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { type AuthUser, type UserRole, canAccess, getHomeForRole } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "protexi_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const fetchUser = useCallback(async (t: string) => {
    try {
      const u = await api.get<AuthUser>("/auth/me", t);
      setUser(u);
      setToken(t);
      return u;
    } catch {
      clearAuth();
      return null;
    }
  }, [clearAuth]);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      fetchUser(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  useEffect(() => {
    if (loading) return;

    const isLoginPage = pathname === "/";
    const isAdminRoute = pathname !== "/" && !pathname.startsWith("/_");

    if (!user && isAdminRoute) {
      router.replace("/");
      return;
    }

    if (user && isLoginPage) {
      router.replace(getHomeForRole(user.role));
      return;
    }

    if (user && isAdminRoute && !canAccess(user.role, pathname)) {
      router.replace(getHomeForRole(user.role));
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await api.post<{ access_token: string; user: AuthUser }>(
        "/auth/login",
        { identifier, password }
      );
      localStorage.setItem(TOKEN_KEY, res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      router.push(getHomeForRole(res.user.role));
    },
    [router]
  );

  const logout = useCallback(() => {
    clearAuth();
    router.push("/");
  }, [clearAuth, router]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
