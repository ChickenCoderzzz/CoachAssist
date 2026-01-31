import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // 🔑 Always fetch profile when token exists
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/auth/profile", {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ FIXED
          },
        });

        if (!res.ok) {
          throw new Error("Invalid token");
        }

        const data = await res.json();
        setUser({
          username: data.username,
          email: data.email,
          full_name: data.full_name,
        });
      } catch (err) {
        console.error("Profile fetch failed:", err);
        logout(); // token invalid → force logout
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  // =====================
  // AUTH ACTIONS
  // =====================
  const login = async (username, password) => {
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorDetails = "Login failed";
        try {
          const errorData = JSON.parse(text);
          errorDetails = errorData.detail || JSON.stringify(errorData);
        } catch {
          errorDetails = `Server error (${response.status})`;
        }
        throw new Error(errorDetails);
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      setToken(data.token); // triggers profile fetch

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: error.message };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorDetails = "Signup failed";
        try {
          const errorData = JSON.parse(text);
          errorDetails = errorData.detail || JSON.stringify(errorData);
        } catch {
          errorDetails = `Server error (${response.status})`;
        }
        throw new Error(errorDetails);
      }

      return { success: true };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  const refreshProfile = () => {
    if (token) {
      setLoading(true);
      // token dependency will re-trigger fetch
      setToken((t) => t);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        signup,
        logout,
        loading,
        refreshProfile,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
