import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // Always fetch profile when token exists
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
            Authorization: `Bearer ${token}`,
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
        logout(); // token invalid, force logout
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  // Global Fetch Interceptor for 401s
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        // Only redirect if we thought we were logged in (token exists)
        // AND validation failed on a protected endpoint.
        // If we are already on login page, or just tried to login and failed,
        // we might not want to force a reload/redirect loop, 
        // but logout() clears token which triggers the ProtectedRoute to kick in.

        let urlString = "";
        const resource = args[0];

        if (typeof resource === 'string') {
          urlString = resource;
        } else if (resource instanceof Request) {
          urlString = resource.url;
        } else if (resource instanceof URL) {
          urlString = resource.toString();
        }

        // We avoid redirecting if the 401 came from the login endpoint itself
        // (e.g. wrong password), because we want the Login page to handle that error.
        if (urlString && !urlString.includes("/auth/login")) {
          logout();
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  //Auth actions
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
      setLoading(true); // Ensure ProtectedRoute waits for profile fetch
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
