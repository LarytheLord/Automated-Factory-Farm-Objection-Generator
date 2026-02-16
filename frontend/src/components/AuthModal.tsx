"use client";

import { useState } from "react";
import { X, AlertCircle, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login } = useAuth();

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
            const body = isLogin ? { email, password } : { email, password, name };

            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Authentication failed");

            login(data.token, data.user);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="glass-card w-full max-w-md overflow-hidden relative animate-slide-up">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 pb-2 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                        {isLogin ? "Welcome back" : "Join AFFOG"}
                    </h2>
                    <p className="text-gray-500 text-sm">
                        {isLogin ? "Sign in to your account" : "Create an account to start filing objections"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {!isLogin && (
                        <div>
                            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-emerald-500/30 transition-colors placeholder:text-gray-700"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-emerald-500/30 transition-colors placeholder:text-gray-700"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-emerald-500/30 transition-colors placeholder:text-gray-700"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                            isLogin ? "Sign In" : "Create Account"
                        )}
                    </button>

                    <div className="text-center pt-1">
                        <button
                            type="button"
                            onClick={() => { setIsLogin(!isLogin); setError(null); }}
                            className="text-sm text-gray-500 hover:text-white transition-colors"
                        >
                            {isLogin ? "Don\u2019t have an account? Sign up" : "Already have an account? Sign in"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
