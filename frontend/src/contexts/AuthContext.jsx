import { useCallback, useEffect, useState } from "react";
import * as authApi from "../api/auth.api";
import { AuthContext } from "./AuthContextBase";
import { normalizeRole } from "../utils/roleCheck";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Single source of truth: /auth/me
  const fetchMe = useCallback(async () => {
    try {
      const userData = await authApi.getMe();
      const me = userData?.user ?? userData;

      if (!me || !me.role) throw new Error("Invalid /me response");

      const normalizedRole = normalizeRole(me.role);
      setUser({
        id: me._id || me.id,
        name: me.name,
        email: me.email,
        role: normalizedRole || String(me.role).toLowerCase(),
        department: me.department ?? null,
        workerId: me.workerId ?? null,
        officerId: me.officerId ?? null,
        isApproved: typeof me.isApproved === "boolean" ? me.isApproved : undefined,
      });
    } catch (error) {
      console.error("Auth fetchMe failed:", error);
      localStorage.removeItem("token");
      setUser(null);
    }
  }, []);

  // Rehydrate on app load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      await fetchMe();
      setLoading(false);
    };

    initAuth();
  }, [fetchMe]);

  // Login
  const login = useCallback(
    async (credentials) => {
      const data = await authApi.login(credentials);
      const token = data?.token;

      if (token) {
        localStorage.setItem("token", token);
        await fetchMe();
      }

      return data;
    },
    [fetchMe]
  );

  const refreshUser = useCallback(async () => {
    try {
      await fetchMe();
    } catch {
      // ignore refresh failures; auth state remains unchanged
    }
  }, [fetchMe]);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);

    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        refreshUser,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
