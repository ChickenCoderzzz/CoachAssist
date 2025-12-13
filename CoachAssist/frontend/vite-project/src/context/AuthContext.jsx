import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // On mount, check if token exists and restore user session if possible
        // For now, we just restore the username from local storage if checking token validity is complex
        // Ideally, we would fetch /auth/profile here to validata token
        const storedUser = localStorage.getItem("username");
        if (token && storedUser) {
            setUser({ username: storedUser });
        }
        setLoading(false);
    }, [token]);

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
            setUser({ username: data.username });

            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.username);

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

    return (
        <AuthContext.Provider value={{ user, token, login, signup, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
