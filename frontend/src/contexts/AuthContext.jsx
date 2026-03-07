import { useCallback, useEffect, useState } from "react";
import * as authApi from "../api/auth.api";
import { AuthContext } from './AuthContextBase';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * ✅ Single source of truth: /auth/me
   */
  const fetchMe = useCallback(async () => {
    try {
      const res = await authApi.getMe(); // ✅ correct API
      const userData = res.data?.data || res.data?.user;

      if (userData && userData.role) {
        setUser({
          id: userData._id || userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role.toLowerCase(),
        });
      } else {
        throw new Error("Invalid /me response");
      }
    } catch (error) {
      console.error("Auth fetchMe failed:", error);
      localStorage.removeItem("token");
      setUser(null);
    }
  }, []);

  /**
   * 🔄 Rehydrate on app load
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      await fetchMe(); // ✅ admin role resolved here
      setLoading(false);
    };

    initAuth();
  }, [fetchMe]);

  /**
   * 🔐 Login
   */
  const login = useCallback(
    async (credentials) => {
      const res = await authApi.login(credentials);
      const token = res.data?.token;

      if (token) {
        localStorage.setItem("token", token);
        await fetchMe(); // ✅ IMPORTANT
      }

      return res;
    },
    [fetchMe]
  );

  /**
   * 🚪 Logout
   */
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
