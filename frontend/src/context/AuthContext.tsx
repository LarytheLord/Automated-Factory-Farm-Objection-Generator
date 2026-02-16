"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
    id: number;
    email: string;
    name: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if we're in the browser before accessing localStorage
        if (typeof window !== 'undefined') {
            try {
                const savedToken = localStorage.getItem("token");
                const savedUser = localStorage.getItem("user");
                if (savedToken && savedUser) {
                    setToken(savedToken);
                    setUser(JSON.parse(savedUser));
                }
            } catch (error) {
                console.error("Error loading auth data from localStorage:", error);
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }
        setIsLoading(false);
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        // Check if we're in the browser before accessing localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem("token", newToken);
            localStorage.setItem("user", JSON.stringify(newUser));
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        // Check if we're in the browser before accessing localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                logout,
                isAuthenticated: !!user,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
