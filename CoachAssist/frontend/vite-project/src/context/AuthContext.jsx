import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("username");
        if (token && storedUser) {
            // Try to get full profile from backend using the token
            fetchProfile(token).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchProfile = async (currentToken) => {
        if (!currentToken) return;
        try {
            const res = await fetch(`/auth/profile`, {
                method: "GET",
                headers: { token: currentToken },
            });
            if (!res.ok) {
                // invalid token or other error
                setUser(null);
                return;
            }
            const data = await res.json();
            // data includes username, email, full_name
            setUser({ username: data.username, email: data.email, full_name: data.full_name });
            localStorage.setItem("username", data.username);
        } catch (e) {
            console.error("Error fetching profile:", e);
            setUser(null);
        }
    };

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
                } catch (e) {
                    // If JSON parse fails, use the raw text
                    errorDetails = `Server error (${response.status}): ${text.substring(0, 100)}`;
                }
                throw new Error(errorDetails);
            }

            const data = await response.json();
            setToken(data.token);
            localStorage.setItem("token", data.token);
            // After setting token, fetch the full profile to populate user
            await fetchProfile(data.token);

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
                } catch (e) {
                    errorDetails = `Server error (${response.status}): ${text.substring(0, 100)}`;
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
        localStorage.removeItem("username");
    };

    const refreshProfile = () => fetchProfile(token);
    
    const updateUser = (newUser) => {
        setUser(newUser);
        if (newUser && newUser.username) {
            localStorage.setItem("username", newUser.username);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, signup, logout, loading, refreshProfile, updateUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
