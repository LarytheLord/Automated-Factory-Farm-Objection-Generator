"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  MapPin,
  Clock,
  FileText,
  Send,
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
  BarChart3,
  Sparkles,
  User,
  LogOut,
  LayoutDashboard,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";

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
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentMessage, setEmailSentMessage] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, token, isAuthenticated, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  useEffect(() => {
    setCurrentDate(new Date().toISOString().split("T")[0]);
    if (user) {
      setFormData(prev => ({
        ...prev,
        yourName: user.name || "",
        yourEmail: user.email || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND}/api/permits`).then((r) => r.json()),
      fetch(`${BACKEND}/api/stats`).then((r) => r.json()).catch(() => null),
    ])
      .then(([permitsData, statsData]) => {
        setPermits(permitsData);
        setStats(statsData);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Could not connect to backend. Please ensure it is running on port 3001.");
      })
      .finally(() => setLoading(false));
  }, [BACKEND]);

  /* ─── Handlers ─── */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generateLetter = async () => {
    if (!selectedPermit) return;
    setGeneratingLetter(true);
    setLetterError(null);
    setGeneratedLetter("");

    try {
      const res = await fetch(`${BACKEND}/api/generate-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permitDetails: { ...selectedPermit, ...formData, currentDate },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate letter");
      }
      const data = await res.json();
      setGeneratedLetter(data.letter);
      setGeneratingLetter(false);
    } catch (err) {
      setLetterError(err instanceof Error ? err.message : "Unknown error");
      setGeneratingLetter(false);
    }
  };

  const handleSaveObjection = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!selectedPermit || !generatedLetter) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`${BACKEND}/api/objections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_title: selectedPermit.project_title,
          location: selectedPermit.location,
          country: selectedPermit.country,
          generated_text: generatedLetter,
          status: 'generated'
        })
      });

      if (!res.ok) throw new Error('Failed to save objection');
      setSaveMessage("Saved to dashboard!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const sendEmail = async () => {
    if (!generatedLetter || !recipientEmail) {
      setEmailError("Please generate a letter and provide a recipient email.");
      return;
    }
    setSendingEmail(true);
    setEmailError(null);
    setEmailSentMessage("");

    try {
      const res = await fetch(`${BACKEND}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Objection: ${selectedPermit?.project_title}`,
          text: generatedLetter,
        }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      setEmailSentMessage("Email sent successfully!");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSendingEmail(false);
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

  /* ─── Animated counters ─── */
  const animPermits = useAnimatedCounter(stats?.totalPermits || 0);
  const animCountries = useAnimatedCounter(stats?.countriesCovered || 0);
  const animAnimals = useAnimatedCounter(stats?.potentialAnimalsProtected || 0, 2500);
  const animObjections = useAnimatedCounter(stats?.objectionsGenerated || 0);

  /* ─── Loading / Error States ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading platform data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
        <div className="glass-card p-8 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Connection Error</h2>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  /* ─── RENDER ─── */
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white hero-gradient relative">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* ════════════ HEADER ════════════ */}
      <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-40">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-emerald-500" />
          <span className="font-bold text-xl tracking-tight">AFFOG</span>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-medium text-white">{user?.name}</span>
                <span className="text-xs text-gray-400 capitalize">{user?.role}</span>
              </div>
              <Link
                href="/my-objections"
                className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
                title="My Objections"
              >
                <FileText className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
                title="Dashboard"
              >
                <LayoutDashboard className="w-5 h-5" />
              </Link>
              <button
                onClick={logout}
                className="p-2 hover:bg-white/10 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg transition-all text-sm font-medium"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </nav>
      {/* ════════════ HERO SECTION ════════════ */}
      <section className="pt-16 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-8">
            <span className="live-dot" />
            Platform Active — {stats?.objectionsGenerated || 0} objections generated
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Fight Factory Farming
            <br />
            <span className="gradient-text">With AI-Powered Law</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            AFFOG empowers citizens, NGOs, and legal advocates to generate legally grounded objections
            against factory farming violations — in under 2 minutes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-14">
            <a
              href="#permits"
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/25"
            >
              Generate Objection →
            </a>
            <Link
              href="/dashboard"
              className="px-8 py-3.5 glass-card hover:border-blue-500/40 font-medium rounded-xl flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" /> Analytics
            </Link>
            <Link
              href="/impact"
              className="px-8 py-3.5 glass-card hover:border-purple-500/40 font-medium rounded-xl flex items-center gap-2"
            >
              <Shield className="w-4 h-4" /> Impact
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <StatCard icon={<FileText className="w-5 h-5" />} value={animPermits} label="Permits Monitored" />
            <StatCard icon={<Globe className="w-5 h-5" />} value={animCountries} label="Countries Covered" />
            <StatCard icon={<Shield className="w-5 h-5" />} value={animAnimals.toLocaleString()} label="Animals at Risk" />
            <StatCard icon={<Zap className="w-5 h-5" />} value={animObjections} label="Objections Filed" />
          </div>
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section className="py-16 px-4 border-t border-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It <span className="gradient-text">Works</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <StepCard step="01" title="Search Violations" desc="Browse our database of factory farm permits across 8+ countries. Filter by country, location, or activity type." icon={<Search className="w-6 h-6" />} />
            <StepCard step="02" title="AI Generates Objection" desc="Our AI analyzes relevant laws and regulations, then drafts a legally grounded objection letter in seconds." icon={<Sparkles className="w-6 h-6" />} />
            <StepCard step="03" title="Submit to Authorities" desc="Send the generated objection directly to the relevant authorities via email — one click, real impact." icon={<Send className="w-6 h-6" />} />
          </div>
        </div>
      </section>

      {/* ════════════ LIVE ACTIVITY FEED ════════════ */}
      {stats?.recentActivity && (
        <section className="py-12 px-4 border-t border-gray-800/50">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-2xl font-bold">Live Activity</h2>
              <span className="live-dot" />
            </div>
            <div className="space-y-3">
              {stats.recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="activity-item glass-card px-5 py-3.5 flex items-center justify-between"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-2 h-2 rounded-full ${item.action.includes("Objection")
                        ? "bg-emerald-400"
                        : item.action.includes("RTI")
                          ? "bg-blue-400"
                          : item.action.includes("Violation")
                            ? "bg-amber-400"
                            : "bg-purple-400"
                        }`}
                    />
                    <div>
                      <span className="font-medium text-sm">{item.action}</span>
                      <span className="text-gray-500 mx-2">•</span>
                      <span className="text-gray-400 text-sm">{item.target}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{item.country}</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════ PERMIT BROWSER ════════════ */}
      <section id="permits" className="py-16 px-4 border-t border-gray-800/50">
        <div className="max-w-6xl mx-auto">
          {!selectedPermit ? (
            <>
              {/* Header + Search */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-bold">
                    Permit <span className="gradient-text">Database</span>
                  </h2>
                  <p className="text-gray-400 mt-1 text-sm">
                    {filteredPermits.length} of {permits.length} permits shown
                  </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search permits..."
                      className="w-full bg-gray-900/80 border border-gray-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="bg-gray-900/80 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                  >
                    <option value="All">All Countries</option>
                    {uniqueCountries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permit Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${permit.status === "Approved"
                          ? "badge-approved"
                          : permit.status === "Pending"
                            ? "badge-pending"
                            : permit.status === "Rejected"
                              ? "badge-rejected"
                              : "badge-under-review"
                          }`}
                      >
                        {permit.status}
                      </span>
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {permit.country}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-400 transition-colors leading-snug">
                      {permit.project_title}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{permit.activity}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-xs flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {permit.location}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* ════════════ PERMIT DETAIL + FORM ════════════ */
            <div>
              {/* Back button */}
              <button
                onClick={() => {
                  setSelectedPermit(null);
                  setGeneratedLetter("");
                  setLetterError(null);
                }}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to all permits
              </button>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left: Permit Details */}
                <div className="glass-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-bold leading-snug">{selectedPermit.project_title}</h2>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider flex-shrink-0 ml-3 ${selectedPermit.status === "Approved"
                        ? "badge-approved"
                        : selectedPermit.status === "Pending"
                          ? "badge-pending"
                          : selectedPermit.status === "Rejected"
                            ? "badge-rejected"
                            : "badge-under-review"
                        }`}
                    >
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

                {/* Right: Form */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
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

                  <button
                    onClick={generateLetter}
                    disabled={generatingLetter}
                    className="w-full mt-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingLetter ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        AI is generating your objection...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate AI Objection Letter
                      </>
                    )}
                  </button>

                  {letterError && (
                    <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                      {letterError}
                    </div>
                  )}
                </div>
              </div>

              {/* Generated Letter */}
              {generatedLetter && (
                <div className="glass-card p-6 mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-400" />
                      Generated Objection Letter
                    </h3>
                    <div className="flex items-center gap-2">
                      {saveMessage && <span className="text-xs text-emerald-400 animate-fade-in">{saveMessage}</span>}
                      <button
                        onClick={handleSaveObjection}
                        disabled={saving}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
                        title="Save to Dashboard"
                      >
                        {saving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                        Save
                      </button>
                      <button
                        onClick={copyLetter}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
                      >
                        {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-950/60 rounded-xl p-6 text-sm leading-relaxed whitespace-pre-wrap text-gray-300 max-h-96 overflow-y-auto border border-gray-800/50">
                    {generatedLetter}
                  </div>

                  {/* Email Section */}
                  <div className="mt-6 pt-6 border-t border-gray-800/50">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-400" />
                      Send to Authorities
                    </h4>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="authority@example.gov"
                        className="flex-1 bg-gray-900/80 border border-gray-700/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                      />
                      <button
                        onClick={sendEmail}
                        disabled={sendingEmail}
                        className="px-6 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {sendingEmail ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Send
                      </button>
                    </div>
                    {emailSentMessage && (
                      <p className="mt-2 text-emerald-400 text-sm flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> {emailSentMessage}
                      </p>
                    )}
                    {emailError && <p className="mt-2 text-red-400 text-sm">{emailError}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="border-t border-gray-800/50 py-10 px-4 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-lg gradient-text">AFFOG</span>
            <span className="text-gray-600 text-sm ml-2">Automated Factory Farm Objection Generator</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-white transition-colors">Analytics</Link>
            <Link href="/impact" className="hover:text-white transition-colors">Impact</Link>
          </div>
          <span className="text-xs text-gray-600">
            Built for AARC 2026 • Code for Compassion
          </span>
        </div>
      </footer>
    </main>
  );
}

/* ─── Sub-components ─── */
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="glass-card p-4 text-center">
      <div className="text-emerald-400 mb-2 flex justify-center">{icon}</div>
      <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-gray-500 text-xs mt-1">{label}</div>
    </div>
  );
}

function StepCard({ step, title, desc, icon }: { step: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-6 text-center">
      <div className="text-emerald-400 mb-4 flex justify-center">{icon}</div>
      <div className="text-emerald-500/40 text-xs font-bold mb-2 tracking-widest">STEP {step}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
}

function FormInput({
  name,
  label,
  value,
  onChange,
  full,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2 sm:col-span-1" : ""}>
      <label className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 block">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        className="w-full bg-gray-900/80 border border-gray-700/50 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
      />
    </div>
  );
}