"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  MapPin,
  Clock,
  FileText,
  Send,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  Shield,
  Zap,
  Globe,
  Activity,
  AlertTriangle,
  Copy,
  CheckCircle,
  Mail,
  Sparkles,
  User,
  LogOut,
  Save,
} from "lucide-react";
import Link from "next/link";
import AuthModal from "../components/AuthModal";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/* ─── Types ─── */
interface Permit {
  project_title: string;
  location: string;
  activity: string;
  status: string;
  country: string;
  notes: string;
  category?: string;
  coordinates?: { lat: number; lng: number };
  [key: string]: any;
}

interface Stats {
  totalPermits: number;
  countriesCovered: number;
  potentialAnimalsProtected: number;
  objectionsGenerated: number;
  avgGenerationTime: string;
  recentActivity: { action: string; target: string; country: string; time: string }[];
}

interface User {
  id: number | string;
  email: string;
  name: string;
  role: string;
  accessApproved?: boolean;
  accessPending?: boolean;
}

interface UsageBucket {
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number | null;
  monthlyRemaining: number | null;
}

interface UsageResponse {
  letters?: { usage: UsageBucket };
  email?: { usage: UsageBucket };
}

interface RecipientSuggestion {
  id: string;
  label: string;
  type: "email" | "webform";
  confidence: "official" | "source_extracted" | "inferred";
  email?: string;
  action_url?: string;
  reason?: string;
}

/* ─── Animated Counter Hook ─── */
function useAnimatedCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (target <= 0 || started.current) return;
    started.current = true;
    let rafId: number;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return count;
}

/* ─── Helper Functions ─── */
function getUserFromStorage(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function getTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem("token");
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/* ─── Main Component ─── */
export default function Home() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [formData, setFormData] = useState({
    yourName: "",
    yourAddress: "",
    yourCity: "",
    yourPostalCode: "",
    yourPhone: "",
    yourEmail: "",
  });
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [letterMode, setLetterMode] = useState<"concise" | "detailed">("concise");
  const [recipientSuggestions, setRecipientSuggestions] = useState<RecipientSuggestion[]>([]);
  const [recommendedRecipient, setRecommendedRecipient] = useState<RecipientSuggestion | null>(null);
  const [recipientGuidance, setRecipientGuidance] = useState<string | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentMessage, setEmailSentMessage] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMailDraft, setCopiedMailDraft] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const API_BASE = "";

  // Check authentication status
  const isAuthenticated = !!user;
  const hasApprovedAccess = !!(user && (user.role === "admin" || user.accessApproved));

  useEffect(() => {
    setIsMounted(true);
    const storedToken = getTokenFromStorage();
    const storedUser = getUserFromStorage();
    if (storedToken && storedUser) {
      setToken(storedToken);
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
            if (!(payload.user.role === "admin" || payload.user.accessApproved)) {
              setAuthNotice("Account pending manual approval. You'll get access once an admin approves your profile.");
            }
          }
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        });
    }

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [API_BASE]);

  useEffect(() => {
    setCurrentDate(new Date().toISOString().split("T")[0]);
    if (user && isMounted) {
      setFormData((prev) => ({
        ...prev,
        yourName: user.name || "",
        yourEmail: user.email || "",
      }));
    }
  }, [user, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const statsPromise = fetch(`${API_BASE}/api/stats`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        if (!token || !hasApprovedAccess) {
          const statsData = await statsPromise;
          setPermits([]);
          setStats(statsData);
          setLoading(false);
          return;
        }

        const [permitsRes, statsData] = await Promise.all([
          fetch(`${API_BASE}/api/permits`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          statsPromise,
        ]);

        if (!permitsRes.ok) {
          const payload = await permitsRes.json().catch(() => null);
          throw new Error(payload?.error || "Failed to fetch permits");
        }

        const permitsData = await permitsRes.json();
        setPermits(Array.isArray(permitsData) ? permitsData : []);
        setStats(statsData);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "Could not connect to the API. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [API_BASE, token, hasApprovedAccess, isMounted]);

  const fetchUsage = async (authToken?: string | null) => {
    try {
      const headers: HeadersInit = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const response = await fetch(`${API_BASE}/api/usage`, { headers });
      if (!response.ok) return;
      const data = await response.json();
      setUsage(data);
    } catch {
      // Non-blocking: usage indicator should never break page flow.
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    fetchUsage(token);
  }, [token, isMounted]);

  useEffect(() => {
    if (!hasApprovedAccess) {
      setSelectedPermit(null);
      setGeneratedLetter("");
      setRecipientEmail("");
      setRecipientSuggestions([]);
      setRecommendedRecipient(null);
      setRecipientGuidance(null);
    }
  }, [hasApprovedAccess]);

  useEffect(() => {
    const loadRecipientSuggestions = async () => {
      if (!selectedPermit || !token || !hasApprovedAccess) {
        setRecipientSuggestions([]);
        setRecommendedRecipient(null);
        setRecipientGuidance(null);
        setRecipientEmail("");
        return;
      }

      setLoadingRecipients(true);
      setRecipientGuidance(null);
      setRecipientEmail("");
      try {
        const res = await fetchWithTimeout(`${API_BASE}/api/recipient-suggestions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ permitDetails: selectedPermit }),
        }, 15000);

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || "Failed to load recipient suggestions");
        }

        const payload = await res.json();
        const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
        setRecipientSuggestions(suggestions);
        setRecommendedRecipient(payload?.recommended || null);
        setRecipientGuidance(payload?.guidance || null);

        const recommendedEmail =
          payload?.recommended?.type === "email" && payload?.recommended?.email
            ? payload.recommended.email
            : null;
        const firstEmail = suggestions.find((item: RecipientSuggestion) => item.type === "email" && item.email);
        if (recommendedEmail) {
          setRecipientEmail(recommendedEmail);
        } else if (firstEmail?.email) {
          setRecipientEmail(firstEmail.email);
        }
      } catch (err) {
        setRecipientSuggestions([]);
        setRecommendedRecipient(null);
        setRecipientGuidance(err instanceof Error ? err.message : "Could not load recipient suggestions.");
      } finally {
        setLoadingRecipients(false);
      }
    };

    loadRecipientSuggestions();
  }, [selectedPermit, token, hasApprovedAccess, API_BASE]);

  /* ─── Handlers ─── */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generateLetter = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!hasApprovedAccess) {
      setLetterError("Account pending manual approval. You cannot generate letters yet.");
      return;
    }
    if (!selectedPermit) return;
    setGeneratingLetter(true);
    setLetterError(null);
    setGeneratedLetter("");
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/generate-letter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          permitDetails: { ...selectedPermit, ...formData, currentDate },
          letterMode,
        }),
      }, 35000);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate letter");
      }
      const data = await res.json();
      setGeneratedLetter(data.letter);
      fetchUsage(token);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setLetterError("Letter generation timed out. Please try again.");
      } else if (err instanceof Error) setLetterError(err.message);
      else setLetterError("Unknown error");
      fetchUsage(token);
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleSaveObjection = async () => {
    if (!isMounted || !isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!hasApprovedAccess) {
      setSaveMessage("Account pending manual approval.");
      return;
    }
    if (!selectedPermit || !generatedLetter) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/objections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          permit_id: selectedPermit.id,
          project_title: selectedPermit.project_title,
          location: selectedPermit.location,
          country: selectedPermit.country,
          generated_text: generatedLetter,
          status: "draft",
        }),
      });
      if (!res.ok) throw new Error("Failed to save objection");
      setSaveMessage("Saved to dashboard!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  };

  const handleLogin = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    if (!(newUser.role === "admin" || newUser.accessApproved)) {
      setAuthNotice("Account pending manual approval. You'll get access once an admin approves your profile.");
    } else {
      setAuthNotice(null);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
    }
  };

  const sendEmail = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!hasApprovedAccess) {
      setEmailError("Account pending manual approval. You cannot send letters yet.");
      return;
    }
    if (!generatedLetter || !recipientEmail) {
      setEmailError("Please generate a letter and provide a recipient email.");
      return;
    }
    setSendingEmail(true);
    setEmailError(null);
    setEmailSentMessage("");
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Objection: ${selectedPermit?.project_title}`,
          text: generatedLetter,
        }),
      }, 30000);
      if (!res.ok) {
        let message = "Failed to send email";
        try {
          const payload = await res.json();
          if (payload?.error) message = payload.error;
        } catch {
          // keep default
        }
        throw new Error(message);
      }
      setEmailSentMessage("Email sent successfully!");
      fetchUsage(token);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setEmailError("Email request timed out. Please try again.");
      } else {
        setEmailError(err instanceof Error ? err.message : "Failed to send email");
      }
      fetchUsage(token);
    } finally {
      setSendingEmail(false);
    }
  };

  const buildEmailDraft = () => {
    const to = recipientEmail.trim();
    const subject = `Objection: ${selectedPermit?.project_title || "Permit Concern"}`;
    const body = generatedLetter;
    return { to, subject, body };
  };

  const useSuggestedRecipient = (suggestion: RecipientSuggestion) => {
    if (suggestion.email) {
      setRecipientEmail(suggestion.email);
      setEmailError(null);
    }
  };

  const openSuggestionLink = (suggestion: RecipientSuggestion) => {
    if (!suggestion.action_url) return;
    window.open(suggestion.action_url, "_blank", "noopener,noreferrer");
  };

  const openInMailApp = () => {
    if (!generatedLetter) {
      setEmailError("Please generate a letter first.");
      return;
    }
    const draft = buildEmailDraft();
    const mailtoUrl = `mailto:${encodeURIComponent(draft.to)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
    window.location.href = mailtoUrl;
  };

  const copyEmailDraft = async () => {
    if (!generatedLetter) {
      setEmailError("Please generate a letter first.");
      return;
    }
    const draft = buildEmailDraft();
    const text = `To: ${draft.to || "[Add recipient email]"}\nSubject: ${draft.subject}\n\n${draft.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMailDraft(true);
      setTimeout(() => setCopiedMailDraft(false), 2500);
    } catch {
      setEmailError("Could not copy draft to clipboard.");
    }
  };

  const copyLetter = () => {
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const uniqueCountries = Array.from(new Set(permits.map((p) => p.country))).sort();
  const filteredPermits = permits.filter((p) => {
    const matchSearch =
      p.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.activity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCountry = selectedCountry === "All" || p.country === selectedCountry;
    return matchSearch && matchCountry;
  });

  const animPermits = useAnimatedCounter(stats?.totalPermits || 0);
  const animCountries = useAnimatedCounter(stats?.countriesCovered || 0);
  const animAnimals = useAnimatedCounter(stats?.potentialAnimalsProtected || 0, 2500);
  const animObjections = useAnimatedCounter(stats?.objectionsGenerated || 0);
  const lettersUsage = usage?.letters?.usage;

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-slate-900">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading platform...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-slate-900 px-4">
        <div className="glass-card p-8 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Connection Error</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  /* ═══ RENDER ═══ */
  return (
    <main className="min-h-screen bg-black text-slate-900 overflow-x-hidden">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={handleLogin} />

      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/[0.05] blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      </div>

      {/* ════════════ NAV ════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "nav-glass" : ""}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-emerald-400" />
            <span className="font-bold text-lg tracking-tight">AFFOG</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#permits" className="hover:text-slate-900 transition-colors">Permits</a>
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Analytics</Link>
            <Link href="/impact" className="hover:text-slate-900 transition-colors">Impact</Link>
            <Link href="/survey" className="hover:text-slate-900 transition-colors">Feedback</Link>
          </div>

          <div className="flex items-center gap-3">
            {isMounted && isAuthenticated ? (
              <>
                <span className="hidden md:block text-sm text-gray-500">{user?.name}</span>
                <Link href="/my-objections" className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-slate-900 transition-colors" title="My Objections">
                  <FileText className="w-4 h-4" />
                </Link>
                <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-red-400 transition-colors" title="Sign Out">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : isMounted ? (
              <button onClick={() => setIsAuthModalOpen(true)} className="px-4 py-2 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-all">
                Sign In
              </button>
            ) : (
              <div className="px-4 py-2 text-sm">Loading...</div>
            )}
          </div>
        </div>
      </nav>

      {/* ════════════ HERO ════════════ */}
      <section className="relative z-10 pt-36 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-8">
            <span className="live-dot" />
            Live — {stats?.objectionsGenerated || 0} objections generated
          </div>

          <h1 className="animate-fade-in-up text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6" style={{ animationDelay: "100ms" }}>
            Fight Factory Farming
            <br />
            <span className="gradient-text">With AI-Powered Law</span>
          </h1>

          <p className="animate-fade-in-up text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed" style={{ animationDelay: "200ms" }}>
            Generate legally grounded objection letters against factory farming violations — in under 2 minutes. Backed by 37+ laws across 8 countries.
          </p>

          <div className="animate-fade-in-up flex flex-wrap justify-center gap-4 mb-16" style={{ animationDelay: "300ms" }}>
            <a
              href="#permits"
              className="group px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20 inline-flex items-center gap-2"
            >
              {hasApprovedAccess ? "Generate Objection" : "Request Access"}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <Link href="/impact" className="px-8 py-3.5 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 font-medium rounded-xl transition-all inline-flex items-center gap-2 text-sm">
              See the Impact
            </Link>
          </div>

          <div className="animate-fade-in-up grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto" style={{ animationDelay: "400ms" }}>
            <StatCard icon={<FileText className="w-4 h-4" />} value={animPermits} label="Permits Monitored" />
            <StatCard icon={<Globe className="w-4 h-4" />} value={animCountries} label="Countries" />
            <StatCard icon={<Shield className="w-4 h-4" />} value={animAnimals.toLocaleString()} label="Animals at Risk" />
            <StatCard icon={<Zap className="w-4 h-4" />} value={animObjections} label="Objections Filed" />
          </div>
        </div>
      </section>

      {/* ════════════ TRUST BAR ════════════ */}
      <div className="section-divider" />
      <section className="relative z-10 py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-600 mb-6">Monitoring factory farms across</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            {["United States", "United Kingdom", "India", "Australia", "Canada", "European Union", "Brazil", "New Zealand"].map((c) => (
              <span key={c} className="hover:text-gray-700 transition-colors">{c}</span>
            ))}
          </div>
        </div>
      </section>
      <div className="section-divider" />

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold">Three steps to real impact</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <StepCard num="01" title="Find a Violation" desc="Browse our database of factory farm permits across 8+ countries. Filter by country, location, or activity." icon={<Search className="w-5 h-5" />} />
            <StepCard num="02" title="AI Drafts Your Letter" desc="Our AI analyzes relevant laws, then writes a legally grounded objection — personalized to the specific permit." icon={<Sparkles className="w-5 h-5" />} />
            <StepCard num="03" title="Send to Authorities" desc="Submit the objection directly to relevant authorities via email. One click, real legal impact." icon={<Send className="w-5 h-5" />} />
          </div>
        </div>
      </section>

      {/* ════════════ LIVE ACTIVITY ════════════ */}
      {stats?.recentActivity && (
        <>
          <div className="section-divider" />
          <section className="relative z-10 py-16 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h2 className="text-lg font-semibold">Live Activity</h2>
                <span className="live-dot" />
              </div>
              <div className="space-y-2">
                {stats.recentActivity.map((item, i) => (
                  <div key={i} className="activity-item glass-card px-5 py-3 flex items-center justify-between" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="flex items-center gap-3">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.action.includes("Objection") ? "bg-emerald-400" : item.action.includes("RTI") ? "bg-blue-400" : item.action.includes("Violation") ? "bg-amber-400" : "bg-cyan-500"}`} />
                      <span className="font-medium text-sm">{item.action}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-500 text-sm">{item.target}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-xs text-gray-600">
                      <span>{item.country}</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ════════════ PERMIT BROWSER ════════════ */}
      <div className="section-divider" />
      <section id="permits" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          {!isAuthenticated ? (
            <div className="glass-card p-8 text-center max-w-2xl mx-auto">
              <Shield className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Protected Access Area</h3>
              <p className="text-gray-600 mb-6">
                Permit data and objection generation are restricted to approved members only.
                Sign in and submit your profile for manual review.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all"
              >
                Sign In / Create Account
              </button>
            </div>
          ) : !hasApprovedAccess ? (
            <div className="glass-card p-8 text-center max-w-2xl mx-auto">
              <Clock className="w-10 h-10 text-amber-500 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Approval Pending</h3>
              <p className="text-gray-600 mb-4">
                Your account is waiting for manual verification by an admin.
                Once approved, permit browsing and letter generation will be unlocked.
              </p>
              {authNotice && <p className="text-sm text-amber-700">{authNotice}</p>}
            </div>
          ) : !selectedPermit ? (
            <>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 mb-2">Permit database</p>
                  <h2 className="text-3xl font-bold">Browse Violations</h2>
                  <p className="text-gray-500 mt-1 text-sm">{filteredPermits.length} of {permits.length} permits</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search permits..."
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/30 transition-colors placeholder:text-gray-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/30 text-slate-700"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                  >
                    <option value="All">All Countries</option>
                    {uniqueCountries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPermits.map((permit, idx) => (
                  <div
                    key={idx}
                    className="glass-card p-5 cursor-pointer group"
                    onClick={() => {
                      setSelectedPermit(permit);
                      setGeneratedLetter("");
                      setLetterError(null);
                      setEmailSentMessage("");
                      setEmailError(null);
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${permit.status === "Approved" ? "badge-approved" : permit.status === "Pending" ? "badge-pending" : permit.status === "Rejected" ? "badge-rejected" : "badge-under-review"}`}>
                        {permit.status}
                      </span>
                      <span className="text-gray-600 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {permit.country}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold mb-2 group-hover:text-emerald-400 transition-colors leading-snug">{permit.project_title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{permit.activity}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 text-xs flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {permit.location}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>
              <button
                onClick={() => { setSelectedPermit(null); setGeneratedLetter(""); setLetterError(null); }}
                className="flex items-center gap-2 text-gray-500 hover:text-slate-900 mb-8 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to all permits
              </button>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <div className="flex items-start justify-between mb-5">
                    <h2 className="text-xl font-bold leading-snug pr-4">{selectedPermit.project_title}</h2>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${selectedPermit.status === "Approved" ? "badge-approved" : selectedPermit.status === "Pending" ? "badge-pending" : selectedPermit.status === "Rejected" ? "badge-rejected" : "badge-under-review"}`}>
                      {selectedPermit.status}
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <DetailRow label="Location" value={selectedPermit.location} />
                    <DetailRow label="Country" value={selectedPermit.country} />
                    <DetailRow label="Activity" value={selectedPermit.activity} />
                    {selectedPermit.category && <DetailRow label="Category" value={selectedPermit.category} />}
                    {selectedPermit.capacity && <DetailRow label="Capacity" value={selectedPermit.capacity} />}
                    {selectedPermit.notes && <DetailRow label="Notes" value={selectedPermit.notes} />}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    Your Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput name="yourName" label="Full Name" value={formData.yourName} onChange={handleInputChange} full />
                    <FormInput name="yourEmail" label="Email" value={formData.yourEmail} onChange={handleInputChange} full />
                    <FormInput name="yourAddress" label="Address" value={formData.yourAddress} onChange={handleInputChange} />
                    <FormInput name="yourCity" label="City" value={formData.yourCity} onChange={handleInputChange} />
                    <FormInput name="yourPostalCode" label="Postal Code" value={formData.yourPostalCode} onChange={handleInputChange} />
                    <FormInput name="yourPhone" label="Phone" value={formData.yourPhone} onChange={handleInputChange} />
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs text-gray-600 mb-1.5">Letter Style</label>
                    <select
                      value={letterMode}
                      onChange={(e) => setLetterMode(e.target.value === "detailed" ? "detailed" : "concise")}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500/30 text-slate-700"
                    >
                      <option value="concise">Concise (Most Impactful)</option>
                      <option value="detailed">Detailed (Full Legal Context)</option>
                    </select>
                  </div>
                  <button
                    onClick={generateLetter}
                    disabled={generatingLetter}
                    className="w-full mt-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingLetter ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Generating with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate AI Objection Letter
                      </>
                    )}
                  </button>
                  {lettersUsage && (
                    <p className="mt-2 text-xs text-gray-500">
                      Remaining today: {lettersUsage.dailyRemaining ?? "unlimited"} · This month: {lettersUsage.monthlyRemaining ?? "unlimited"}
                    </p>
                  )}
                  {letterError && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{letterError}</div>
                  )}
                </div>
              </div>

              {generatedLetter && (
                <div className="glass-card p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      Generated Objection Letter
                    </h3>
                    <div className="flex items-center gap-2">
                      {saveMessage && <span className="text-xs text-emerald-400 animate-fade-in">{saveMessage}</span>}
                      <button onClick={handleSaveObjection} disabled={saving} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5" title="Save">
                        {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>
                      <button onClick={copyLetter} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                        {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 max-h-96 overflow-y-auto border border-slate-200">
                    {generatedLetter}
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-blue-400" />
                      Send to Authorities
                    </h4>
                    {loadingRecipients && (
                      <p className="text-xs text-gray-500 mb-3">Finding official recipient contacts...</p>
                    )}
                    {!loadingRecipients && recipientSuggestions.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {recipientSuggestions.map((suggestion) => (
                          suggestion.type === "email" ? (
                            <button
                              key={suggestion.id}
                              onClick={() => useSuggestedRecipient(suggestion)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              Use {suggestion.email || suggestion.label}
                            </button>
                          ) : (
                            <button
                              key={suggestion.id}
                              onClick={() => openSuggestionLink(suggestion)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {suggestion.label}
                            </button>
                          )
                        ))}
                      </div>
                    )}
                    {recipientGuidance && (
                      <p className="text-xs text-gray-500 mb-3">{recipientGuidance}</p>
                    )}
                    {recommendedRecipient?.email && (
                      <p className="text-xs text-emerald-600 mb-3">
                        Recommended: {recommendedRecipient.label} ({recommendedRecipient.email})
                      </p>
                    )}
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="authority@example.gov"
                        className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-blue-500/30 transition-colors placeholder:text-gray-500"
                      />
                      <button onClick={sendEmail} disabled={sendingEmail} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 text-sm">
                        {sendingEmail ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                        Send
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={openInMailApp}
                        className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:border-blue-400/50 hover:bg-blue-50 text-slate-700 transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in Mail App
                      </button>
                      <button
                        onClick={copyEmailDraft}
                        className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:border-emerald-400/50 hover:bg-emerald-50 text-slate-700 transition-colors flex items-center gap-2"
                      >
                        {copiedMailDraft ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        {copiedMailDraft ? "Email Draft Copied" : "Copy Email Draft"}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                      Note: For best deliverability, use <strong>Open in Mail App</strong>, review the draft, and send from your own email client.
                    </p>
                    {emailSentMessage && <p className="mt-2 text-emerald-400 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {emailSentMessage}</p>}
                    {emailError && <p className="mt-2 text-red-400 text-sm">{emailError}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ════════════ REAL IMPACT ════════════ */}
      <div className="section-divider" />
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 mb-3">Real impact</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Communities are already winning</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-emerald-400 mb-2">15,000</div>
              <div className="text-sm font-medium mb-1">objections blocked a UK megafarm</div>
              <p className="text-gray-600 text-xs">Cranswick poultry facility, April 2025</p>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-blue-400 mb-2">$574M</div>
              <div className="text-sm font-medium mb-1">in verdicts against factory farms</div>
              <p className="text-gray-600 text-xs">North Carolina, 5 jury cases</p>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-cyan-600 mb-2">30</div>
              <div className="text-sm font-medium mb-1">voices blocked an Indiana CAFO</div>
              <p className="text-gray-600 text-xs">8,000-head facility denied unanimously</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <div className="section-divider" />
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-blue-500/[0.06]" />
            <div className="glass-card p-12 text-center relative">
              <h2 className="text-3xl font-bold mb-4">Your objection could tip the balance</h2>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
                Every legally grounded objection forces authorities to respond. Join advocates in 8 countries fighting factory farming through law.
              </p>
              <a href="#permits" className="group inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20">
                Generate Your First Objection
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="relative z-10 border-t border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span className="font-bold">AFFOG</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">AI-powered legal objections against factory farming.</p>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-600 mb-3 font-medium">Platform</h4>
              <div className="space-y-2 text-sm">
                <a href="#permits" className="block text-gray-500 hover:text-slate-900 transition-colors">Permits</a>
                <Link href="/dashboard" className="block text-gray-500 hover:text-slate-900 transition-colors">Analytics</Link>
                <Link href="/impact" className="block text-gray-500 hover:text-slate-900 transition-colors">Impact</Link>
                <Link href="/submit-permit" className="block text-gray-500 hover:text-slate-900 transition-colors">Submit Permit</Link>
            <Link href="/survey" className="block text-gray-500 hover:text-slate-900 transition-colors">Share Feedback</Link>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-600 mb-3 font-medium">Legal</h4>
              <div className="space-y-2 text-sm text-gray-500">
                <span className="block">37+ Laws Integrated</span>
                <span className="block">8 Countries</span>
                <span className="block">6 Jurisdictions</span>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] uppercase tracking-wider text-gray-600 mb-3 font-medium">About</h4>
              <div className="space-y-2 text-sm text-gray-500">
                <span className="block">Built for AARC 2026</span>
                <span className="block">Code for Compassion</span>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-700">&copy; 2026 AFFOG. All rights reserved.</span>
            <span className="text-xs text-gray-700">Automated Factory Farm Objection Generator</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─── Sub-components ─── */
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="glass-card p-4 text-center group">
      <div className="text-gray-600 group-hover:text-emerald-400 mb-2 flex justify-center transition-colors">{icon}</div>
      <div className="text-2xl font-bold tracking-tight">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-gray-600 text-xs mt-1">{label}</div>
    </div>
  );
}

function StepCard({ num, title, desc, icon }: { num: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-6 group">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-emerald-500/30 text-xs font-mono font-bold">{num}</span>
        <div className="text-emerald-400">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-600 w-24 flex-shrink-0 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

function FormInput({ name, label, value, onChange, full }: {
  name: string; label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2 sm:col-span-1" : ""}>
      <label className="text-[10px] uppercase tracking-wider text-gray-600 mb-1 block">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-500/30 transition-colors"
      />
    </div>
  );
}
