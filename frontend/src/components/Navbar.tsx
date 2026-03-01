"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, FileText, LogOut, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import AuthModal from "./AuthModal";

interface User {
  id: number | string;
  email: string;
  name: string;
  role: string;
  accessApproved?: boolean;
  accessPending?: boolean;
}

interface NavbarProps {
  onAuthChange?: (user: User | null, token: string | null) => void;
}

function getUserFromStorage(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function getTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function Navbar({ onAuthChange }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [approvalToast, setApprovalToast] = useState(false);
  const wasPending = useRef(false);

  const isAuthenticated = !!user;
  const isPending = !!(user && !user.accessApproved && user.role !== "admin");
  const API_BASE = "";

  // Poll /api/auth/me for pending users to detect approval
  useEffect(() => {
    if (!user || !isPending) {
      wasPending.current = false;
      return;
    }
    wasPending.current = true;
    const token = getTokenFromStorage();
    if (!token) return;

    const poll = setInterval(() => {
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (payload?.user?.accessApproved && wasPending.current) {
            setUser(payload.user);
            localStorage.setItem("user", JSON.stringify(payload.user));
            onAuthChange?.(payload.user, token);
            setApprovalToast(true);
            wasPending.current = false;
            setTimeout(() => setApprovalToast(false), 6000);
          }
        })
        .catch(() => {});
    }, 30000);

    return () => clearInterval(poll);
  }, [user, isPending]);

  useEffect(() => {
    setIsMounted(true);
    const storedToken = getTokenFromStorage();
    const storedUser = getUserFromStorage();
    if (storedToken && storedUser) {
      setUser(storedUser);
      onAuthChange?.(storedUser, storedToken);
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Session expired");
          return res.json();
        })
        .then((payload) => {
          if (payload?.user) {
            setUser(payload.user);
            localStorage.setItem("user", JSON.stringify(payload.user));
            onAuthChange?.(payload.user, storedToken);
          }
        })
        .catch(() => {
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          onAuthChange?.(null, null);
        });
    }

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    onAuthChange?.(null, null);
  };

  const handleLogin = (newToken: string, newUser: User) => {
    setUser(newUser);
    if (typeof window !== "undefined") {
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
    }
    onAuthChange?.(newUser, newToken);
  };

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
      />

      {/* Approval toast */}
      {approvalToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-fade-in-up">
          <div className="flex items-center gap-3 px-5 py-3 bg-emerald-500 text-black rounded-xl shadow-lg shadow-emerald-500/20 font-medium text-sm">
            <CheckCircle className="w-5 h-5" />
            Your account has been approved! You now have full access.
          </div>
        </div>
      )}

      {/* Pending banner */}
      {isMounted && isPending && !approvalToast && (
        <div className="fixed top-[68px] left-0 right-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 text-amber-800 text-sm">
            <Clock className="w-4 h-4" />
            <span>Your account is pending approval. You&apos;ll get full access once an admin reviews your profile.</span>
          </div>
        </div>
      )}

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "nav-glass" : ""}`}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-emerald-400" />
            <span className="font-bold text-lg tracking-tight">Open Permit</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <Link href="/how-it-works" className="hover:text-slate-900 transition-colors">How It Works</Link>
            <Link href="/about" className="hover:text-slate-900 transition-colors">About</Link>
            <Link href="/impact" className="hover:text-slate-900 transition-colors">Impact</Link>
            <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
          </div>

          <div className="flex items-center gap-3">
            {isMounted && isAuthenticated ? (
              <>
                <span className="hidden md:block text-sm text-gray-500">{user?.name}</span>
                {user?.role === "admin" && (
                  <Link
                    href="/admin/access"
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-slate-900 transition-colors"
                    title="Admin Access Console"
                  >
                    <Shield className="w-4 h-4" />
                  </Link>
                )}
                <Link
                  href="/my-objections"
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-slate-900 transition-colors"
                  title="My Objections"
                >
                  <FileText className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : isMounted ? (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
              >
                Sign In
              </button>
            ) : (
              <div className="px-4 py-2 text-sm">Loading...</div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
