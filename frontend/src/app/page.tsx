"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  MapPin,
  Clock,
  FileText,
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
  Save,
} from "lucide-react";
import AuthModal from "../components/AuthModal";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LetterComparisonPanel from "../components/LetterComparisonPanel";
import type { PersonaOption } from "../components/PersonaSelector";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/* ─── Types ─── */
interface Permit {
  id?: string | number;
  project_title: string;
  location: string;
  activity: string;
  status: string;
  country: string;
  notes: string;
  category?: string;
  capacity?: string;
  permit_domain?: "farm_animal" | "industrial_infra" | "pollution_industrial" | "other" | string;
  permit_subtype?: string;
  source_url?: string;
  source_name?: string;
  external_id?: string;
  reference?: string;
  published_at?: string;
  consultation_deadline?: string;
  observed_at?: string;
  updated_at?: string;
  last_seen_at?: string;
  created_at?: string;
  coordinates?: { lat: number; lng: number };
  [key: string]: unknown;
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
  recipient_type?: string;
  reason?: string;
}

interface ParsedPermitNotes {
  headline?: string;
  summary?: string;
  sourceKey?: string;
  sourceName?: string;
  sourceUrl?: string;
  externalId?: string;
  reference?: string;
  publishedAt?: string;
  consultationDeadline?: string;
  plainNotes?: string;
}

type LetterMode = "concise" | "detailed";

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
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      credentials: "same-origin",
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const ORIGINAL_PAYLOAD_MARKER = "Original Payload JSON:";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getSourceUrlFromNotes(notes?: string) {
  const match = String(notes || "").match(/Source URL:\s*(https?:\/\/\S+)/i);
  return match ? match[1].trim() : "";
}

function parseDateForDisplay(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function stripMarkdownArtifacts(text: string) {
  let output = String(text || "");
  output = output.replace(/```[\s\S]*?```/g, "");
  output = output.replace(/^#{1,6}\s*/gm, "");
  output = output.replace(/^\s*>\s?/gm, "");
  output = output.replace(/\*\*([^*]+)\*\*/g, "$1");
  output = output.replace(/__([^_]+)__/g, "$1");
  output = output.replace(/\*([^*\n]+)\*/g, "$1");
  output = output.replace(/_([^_\n]+)_/g, "$1");
  output = output.replace(/^\s*[-*]\s+/gm, "- ");
  output = output.replace(/\n{3,}/g, "\n\n");
  return output.trim();
}

function parsePermitNotes(permit: Permit | null): ParsedPermitNotes {
  if (!permit) return {};
  const rawNotes = String(permit.notes || "").trim();
  if (!rawNotes) return {};

  const markerIndex = rawNotes.indexOf(ORIGINAL_PAYLOAD_MARKER);
  const noteBody =
    markerIndex >= 0 ? rawNotes.slice(0, markerIndex).trim() : rawNotes;
  const payloadText =
    markerIndex >= 0
      ? rawNotes.slice(markerIndex + ORIGINAL_PAYLOAD_MARKER.length).trim()
      : "";

  const labels = [
    "Source Key",
    "Source Name",
    "Source URL",
    "External ID",
    "Published at",
    "Consultation deadline",
    "Summary",
    "Reference",
  ];

  const normalizedNoteBody = noteBody.replace(
    /\s+[|/]\s*(?=(Source Key|Source Name|Source URL|External ID|Published at|Consultation deadline|Summary|Reference):)/gi,
    "\n",
  );

  const extractLabel = (label: string) => {
    const otherLabels = labels
      .filter((item) => item !== label)
      .map((item) => escapeRegExp(item))
      .join("|");
    const pattern = new RegExp(
      `${escapeRegExp(label)}:\\s*([\\s\\S]*?)(?=\\s*(?:${otherLabels}):|$)`,
      "i",
    );
    const match = normalizedNoteBody.match(pattern);
    return match ? normalizeInlineText(match[1]) : "";
  };

  const sourceKey = extractLabel("Source Key");
  const sourceName = extractLabel("Source Name");
  const sourceUrl = extractLabel("Source URL") || permit.source_url || getSourceUrlFromNotes(rawNotes);
  const externalId = extractLabel("External ID") || permit.external_id || "";
  const publishedAt = extractLabel("Published at") || permit.published_at || "";
  const consultationDeadline =
    extractLabel("Consultation deadline") || permit.consultation_deadline || "";
  const summary = extractLabel("Summary");
  const reference = extractLabel("Reference");

  const plainNotes = normalizeInlineText(
    normalizedNoteBody
      .replace(/\bSource Key:\s*[\s\S]*$/i, "")
      .replace(/\bSource Name:\s*[\s\S]*$/i, "")
      .replace(/\bSource URL:\s*[\s\S]*$/i, "")
      .replace(/\bExternal ID:\s*[\s\S]*$/i, "")
      .replace(/\bPublished at:\s*[\s\S]*$/i, "")
      .replace(/\bConsultation deadline:\s*[\s\S]*$/i, "")
      .replace(/\bSummary:\s*[\s\S]*$/i, "")
      .replace(/\bReference:\s*[\s\S]*$/i, "")
      .replace(/\bOriginal Payload JSON:\s*[\s\S]*$/i, "")
      .replace(/^\s*Official pending permit record \(trusted source\)\.?\s*/i, ""),
  );

  const headline = noteBody.split("\n").map((line) => line.trim()).find(Boolean) || "";

  return {
    headline,
    summary: summary || undefined,
    sourceKey: sourceKey || undefined,
    sourceName: sourceName || undefined,
    sourceUrl: sourceUrl || undefined,
    externalId: externalId || undefined,
    reference: reference || undefined,
    publishedAt: publishedAt || undefined,
    consultationDeadline: consultationDeadline || undefined,
    plainNotes:
      (plainNotes && plainNotes !== payloadText ? plainNotes : "") || undefined,
  };
}

function permitPreviewTimestamp(permit: Permit | null | undefined) {
  if (!permit) return 0;
  const candidates = [
    permit.observed_at,
    permit.updated_at,
    permit.last_seen_at,
    permit.published_at,
    permit.created_at,
  ];
  for (const value of candidates) {
    const parsed = Date.parse(String(value || ""));
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

function isPendingPermit(permit: Permit | null | undefined) {
  const status = String(permit?.status || "").toLowerCase();
  if (!status) return false;
  return status.includes("pending") || status.includes("under review") || status.includes("under_review");
}

function pickLatestPendingPermit(permits: Permit[]) {
  return [...permits]
    .filter((permit) => isPendingPermit(permit))
    .sort((a, b) => permitPreviewTimestamp(b) - permitPreviewTimestamp(a))[0] || null;
}

/* ─── Main Component ─── */
export default function Home() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [heroPermit, setHeroPermit] = useState<Permit | null>(null);
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
  const [emailSubject, setEmailSubject] = useState("");
  const [letterMode, setLetterMode] = useState<LetterMode>("concise");
  const [letterType, setLetterType] = useState<"objection" | "support">("objection");
  const [persona, setPersona] = useState("general");
  const [personaOptions, setPersonaOptions] = useState<PersonaOption[]>([]);
  const [recipientSuggestions, setRecipientSuggestions] = useState<RecipientSuggestion[]>([]);
  const [sendToSuggestions, setSendToSuggestions] = useState<RecipientSuggestion[]>([]);
  const [ccSuggestions, setCcSuggestions] = useState<RecipientSuggestion[]>([]);
  const [recommendedRecipient, setRecommendedRecipient] = useState<RecipientSuggestion | null>(null);
  const [recipientGuidance, setRecipientGuidance] = useState<string | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedPermitDomain, setSelectedPermitDomain] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMailDraft, setCopiedMailDraft] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [comparePanelOpen, setComparePanelOpen] = useState(false);

  const API_BASE = "";

  // Check authentication status
  const isAuthenticated = !!user;
  const hasApprovedAccess = !!(user && (user.role === "admin" || user.accessApproved));

  const handleNavAuthChange = (navUser: User | null) => {
    setUser(navUser);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        const heroPermitPromise = fetch(`${API_BASE}/api/public/latest-pending-permit`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        const personaPromise = fetch(`${API_BASE}/api/personas`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        const [permitsRes, statsData, heroPermitData, personaData] = await Promise.all([
          fetch(`${API_BASE}/api/permits`),
          statsPromise,
          heroPermitPromise,
          personaPromise,
        ]);

        if (!permitsRes.ok) {
          const payload = await permitsRes.json().catch(() => null);
          throw new Error(payload?.error || "Failed to fetch permits");
        }

        const permitsData = await permitsRes.json();
        const normalizedPermits = Array.isArray(permitsData) ? permitsData : [];
        setPermits(normalizedPermits);
        setStats(statsData);
        setHeroPermit(heroPermitData || pickLatestPendingPermit(normalizedPermits));
        if (personaData?.personas) setPersonaOptions(personaData.personas);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "Could not connect to the API. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [API_BASE, isMounted]);

  const fetchUsage = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/usage`, {
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const data = await response.json();
      setUsage(data);
    } catch {
      // Non-blocking: usage indicator should never break page flow.
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    fetchUsage();
  }, [isMounted]);

  useEffect(() => {
    if (!hasApprovedAccess) {
      setSelectedPermit(null);
      setGeneratedLetter("");
      setRecipientEmail("");
      setEmailSubject("");
      setRecipientSuggestions([]);
      setRecommendedRecipient(null);
      setRecipientGuidance(null);
      setComparePanelOpen(false);
    }
  }, [hasApprovedAccess]);

  useEffect(() => {
    if (!selectedPermit) {
      setEmailSubject("");
      return;
    }
    setEmailSubject(`Objection to permit: ${selectedPermit.project_title}`);
  }, [selectedPermit]);

  useEffect(() => {
    const loadRecipientSuggestions = async () => {
      if (!selectedPermit) {
        setRecipientSuggestions([]);
        setSendToSuggestions([]);
        setCcSuggestions([]);
        setRecommendedRecipient(null);
        setRecipientGuidance(null);
        setRecipientEmail("");
        return;
      }

      setLoadingRecipients(true);
      setRecipientGuidance(null);
      setRecipientEmail("");
      try {
        const suggestionHeaders: HeadersInit = {
          "Content-Type": "application/json",
        };
        const res = await fetchWithTimeout(`${API_BASE}/api/recipient-suggestions`, {
          method: "POST",
          headers: suggestionHeaders,
          body: JSON.stringify({ permitDetails: selectedPermit }),
        }, 15000);

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || "Failed to load recipient suggestions");
        }

        const payload = await res.json();
        const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
        const sendTo = Array.isArray(payload?.sendTo)
          ? payload.sendTo
          : suggestions.filter(
              (s: RecipientSuggestion) => s.type === "email" && s.recipient_type !== "ngo",
            );
        const cc = Array.isArray(payload?.cc)
          ? payload.cc
          : suggestions.filter((s: RecipientSuggestion) => s.recipient_type === "ngo");
        setRecipientSuggestions(suggestions);
        setSendToSuggestions(sendTo);
        setCcSuggestions(cc);
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
        setSendToSuggestions([]);
        setCcSuggestions([]);
        setRecommendedRecipient(null);
        setRecipientGuidance(err instanceof Error ? err.message : "Could not load recipient suggestions.");
      } finally {
        setLoadingRecipients(false);
      }
    };

    loadRecipientSuggestions();
  }, [selectedPermit, API_BASE]);

  /* ─── Handlers ─── */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const requestLetterGeneration = async ({
    letterMode: requestedLetterMode,
    persona: requestedPersona,
  }: {
    letterMode: LetterMode;
    persona: string;
  }) => {
    if (!selectedPermit) {
      throw new Error("Please select a permit first.");
    }

    const generateHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/generate-letter`, {
        method: "POST",
        headers: generateHeaders,
        body: JSON.stringify({
          permitDetails: { ...selectedPermit, ...formData, currentDate },
          letterMode: requestedLetterMode,
          letterType,
          persona: requestedPersona,
        }),
      }, 35000);

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to generate letter");
      }

      const data = await res.json();
      return stripMarkdownArtifacts(data.letter || "");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Letter generation timed out. Please try again.");
      }
      if (err instanceof Error) throw err;
      throw new Error("Unknown error");
    } finally {
      fetchUsage();
    }
  };

  const generateLetter = async () => {
    if (!selectedPermit) return;
    setGeneratingLetter(true);
    setLetterError(null);
    setGeneratedLetter("");
    try {
      const letter = await requestLetterGeneration({ letterMode, persona });
      setGeneratedLetter(letter);
    } catch (err) {
      if (err instanceof Error) setLetterError(err.message);
      else setLetterError("Unknown error");
    } finally {
      setGeneratingLetter(false);
    }
  };

  const handleUseComparedDraft = ({
    letter,
    letterMode: chosenLetterMode,
    persona: chosenPersona,
  }: {
    letter: string;
    letterMode: LetterMode;
    persona: string;
  }) => {
    setGeneratedLetter(letter);
    setLetterMode(chosenLetterMode);
    setPersona(chosenPersona);
    setLetterError(null);
    setEmailError(null);
    setComparePanelOpen(false);
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

  const handleLogin = (_newToken: string, newUser: User) => {
    setUser(newUser);
    fetchUsage();
  };

  const buildEmailDraft = () => {
    const to = recipientEmail.trim();
    const subject =
      emailSubject.trim() ||
      `Objection to permit: ${selectedPermit?.project_title || "Permit Concern"}`;
    const body = stripMarkdownArtifacts(generatedLetter);
    return { to, subject, body };
  };

  const applySuggestedRecipient = (suggestion: RecipientSuggestion) => {
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
    if (!recipientEmail.trim()) {
      setEmailError("Please enter the authority email first.");
      return;
    }
    const draft = buildEmailDraft();
    // Build CC list: other government authorities + NGO/advocacy orgs
    const toEmail = draft.to.toLowerCase();
    const otherGovEmails = sendToSuggestions
      .filter((s) => s.email && s.email.toLowerCase() !== toEmail)
      .map((s) => s.email!)
      .slice(0, 3);
    const ngoCcEmails = ccSuggestions
      .filter((s) => s.email && s.email.toLowerCase() !== toEmail)
      .map((s) => s.email!)
      .slice(0, 4);
    const allCc = [...otherGovEmails, ...ngoCcEmails];
    let mailtoUrl = `mailto:${encodeURIComponent(draft.to)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
    if (allCc.length > 0) {
      mailtoUrl += `&cc=${encodeURIComponent(allCc.join(","))}`;
    }
    window.location.href = mailtoUrl;
  };

  const copyEmailDraft = async () => {
    if (!generatedLetter) {
      setEmailError("Please generate a letter first.");
      return;
    }
    const draft = buildEmailDraft();
    const toEmail = draft.to.toLowerCase();
    const otherGovEmails = sendToSuggestions
      .filter((s) => s.email && s.email.toLowerCase() !== toEmail)
      .map((s) => s.email!).slice(0, 3);
    const ngoCcEmails = ccSuggestions
      .filter((s) => s.email && s.email.toLowerCase() !== toEmail)
      .map((s) => s.email!).slice(0, 4);
    const allCc = [...otherGovEmails, ...ngoCcEmails];
    let text = `To: ${draft.to || "[Add recipient email]"}`;
    if (allCc.length > 0) {
      text += `\nCC: ${allCc.join(", ")}`;
    }
    text += `\nSubject: ${draft.subject}\n\n${draft.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMailDraft(true);
      setTimeout(() => setCopiedMailDraft(false), 2500);
    } catch {
      setEmailError("Could not copy draft to clipboard.");
    }
  };

  const copyLetter = () => {
    navigator.clipboard.writeText(generatedLetter)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setLetterError("Could not copy the letter to the clipboard.");
      });
  };

  const uniqueCountries = Array.from(new Set(permits.map((p) => p.country))).sort();
  const uniqueDomains = Array.from(
    new Set(
      permits
        .map((p) => String(p.permit_domain || "").trim())
        .filter(Boolean)
    )
  ).sort();
  const titleCaseDomain = (value: string) =>
    value
      .replace(/_/g, " ")
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const filteredPermits = permits.filter((p) => {
    const projectTitle = String(p.project_title || "");
    const location = String(p.location || "");
    const activity = String(p.activity || "");
    const matchSearch =
      projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCountry = selectedCountry === "All" || p.country === selectedCountry;
    const matchDomain =
      selectedPermitDomain === "All" ||
      String(p.permit_domain || "other") === selectedPermitDomain;
    return matchSearch && matchCountry && matchDomain;
  });

  const animPermits = useAnimatedCounter(stats?.totalPermits || 0);
  const animCountries = useAnimatedCounter(stats?.countriesCovered || 0);
  const animAnimals = useAnimatedCounter(stats?.potentialAnimalsProtected || 0, 2500);
  const animObjections = useAnimatedCounter(stats?.objectionsGenerated || 0);
  const lettersUsage = usage?.letters?.usage;
  const selectedPermitNotes = parsePermitNotes(selectedPermit);
  const normalizedSelectedPermitStatus = String(selectedPermit?.status || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");
  const selectedPermitStatusClass = normalizedSelectedPermitStatus.includes("approved")
    ? "badge-approved"
    : normalizedSelectedPermitStatus.includes("reject")
      ? "badge-rejected"
      : normalizedSelectedPermitStatus.includes("review")
        ? "badge-under-review"
        : "badge-pending";
  const selectedPermitStatusLabel = normalizedSelectedPermitStatus
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Pending";

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
      <Navbar onAuthChange={handleNavAuthChange} />

      {/* ════════════ HERO ════════════ */}
      <section className="relative z-10 pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_400px] gap-16 items-center">

            {/* ── Left: Copy ── */}
            <div>
              <div className="animate-fade-in-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 text-xs font-medium mb-7">
                <span className="live-dot" />
                {stats?.totalPermits || 207} active permits · 8 countries
              </div>

              <h1 className="animate-fade-in-up text-5xl sm:text-6xl md:text-[3.75rem] font-extrabold tracking-tight leading-[1.08] mb-6 text-slate-900" style={{ animationDelay: "80ms" }}>
                Object before<br />
                <span className="gradient-text">it&apos;s built.</span>
              </h1>

              <p className="animate-fade-in-up text-lg text-gray-500 max-w-xl mb-8 leading-relaxed" style={{ animationDelay: "160ms" }}>
                Open Permit monitors planning applications for industrial developments across 8 countries. When a permit is filed, we help communities generate legally grounded objection letters — in under 2 minutes, backed by 37+ laws.
              </p>

              <div className="animate-fade-in-up flex flex-wrap gap-3 mb-9" style={{ animationDelay: "240ms" }}>
                <a
                  href="#permits"
                  className="group px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20 inline-flex items-center gap-2 text-sm"
                >
                  Browse Permits
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a href="#how-it-works" className="px-7 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 font-medium rounded-xl transition-all inline-flex items-center gap-2 text-sm text-slate-700">
                  How it works
                </a>
              </div>

              <div className="animate-fade-in-up flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ animationDelay: "320ms" }}>
                <span className="text-gray-400">Backed by</span>
                <a href="https://www.openpaws.ai/" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-600 hover:text-emerald-600 transition-colors">Open Paws</a>
                <span className="text-gray-300">·</span>
                <a href="https://www.codeforcompassion.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-600 hover:text-emerald-600 transition-colors">Code 4 Compassion</a>
                <span className="text-gray-300">·</span>
                <span className="font-medium text-gray-600">AARC Pre-Accelerator</span>
              </div>
            </div>

            {/* ── Right: Permit Preview Card ── */}
            <div className="animate-fade-in-up hidden lg:flex flex-col gap-3" style={{ animationDelay: "200ms" }}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 text-center">Live permit analysis</p>
              <PermitPreviewCard permit={heroPermit} />
            </div>

          </div>

          {/* ── Stats Row ── */}
          <div className="animate-fade-in-up grid grid-cols-2 md:grid-cols-4 gap-4 mt-16" style={{ animationDelay: "400ms" }}>
            <StatCard icon={<FileText className="w-4 h-4" />} value={animPermits} label="Permits Monitored" />
            <StatCard icon={<Globe className="w-4 h-4" />} value={animCountries} label="Countries" />
            <StatCard icon={<Shield className="w-4 h-4" />} value={animAnimals.toLocaleString()} label="Animals at Risk" />
            <StatCard icon={<Zap className="w-4 h-4" />} value={animObjections} label="Objections Filed" />
          </div>
        </div>
      </section>

      {/* ════════════ PARTNER STRIP ════════════ */}
      <div className="section-divider" />
      <section className="relative z-10 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 flex-shrink-0">Supported by</p>
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-x-8 gap-y-2">
            {([
              { name: "Open Paws", url: "https://www.openpaws.ai/" },
              { name: "Code 4 Compassion", url: "https://www.codeforcompassion.com/" },
              { name: "AARC Pre-Accelerator", url: null },
              { name: "Electric Sheep", url: null },
            ] as { name: string; url: string | null }[]).map(({ name, url }) =>
              url ? (
                <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-400 hover:text-slate-700 transition-colors">
                  {name}
                </a>
              ) : (
                <span key={name} className="text-sm font-medium text-gray-400">{name}</span>
              )
            )}
          </div>
        </div>
      </section>
      <div className="section-divider" />

      {/* ════════════ REAL IMPACT ════════════ */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 mb-3">Proof it works</p>
            <h2 className="text-3xl md:text-4xl font-bold">Communities are already winning</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">Permit objections work — when they&apos;re legally grounded. Here&apos;s what organised communities have achieved.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-emerald-500 mb-3">15,000</div>
              <div className="text-sm font-semibold mb-1 text-slate-800">objections blocked a UK megafarm</div>
              <p className="text-gray-500 text-xs leading-relaxed">Cranswick poultry facility, April 2025. Community response forced a full planning review.</p>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-blue-500 mb-3">$574M</div>
              <div className="text-sm font-semibold mb-1 text-slate-800">in verdicts against industrial farms</div>
              <p className="text-gray-500 text-xs leading-relaxed">North Carolina, 5 jury cases. Legal grounding was key to every winning argument.</p>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-cyan-600 mb-3">30</div>
              <div className="text-sm font-semibold mb-1 text-slate-800">voices blocked an Indiana CAFO</div>
              <p className="text-gray-500 text-xs leading-relaxed">8,000-head facility denied unanimously. Thirty coordinated objections made the difference.</p>
            </div>
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
            <StepCard num="01" title="Find a Permit" desc="Browse the Open Permit intelligence feed across 8+ countries. Filter by permit type, country, location, or activity." icon={<Search className="w-5 h-5" />} />
            <StepCard num="02" title="AI Drafts Your Letter" desc="Our AI analyzes relevant laws, then writes a legally grounded objection — personalized to the specific permit." icon={<Sparkles className="w-5 h-5" />} />
            <StepCard num="03" title="Submit to Authorities" desc="Use authority contact details, review the draft, and send from your own email client." icon={<Mail className="w-5 h-5" />} />
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
          {!selectedPermit ? (
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
                    value={selectedPermitDomain}
                    onChange={(e) => setSelectedPermitDomain(e.target.value)}
                  >
                    <option value="All">All Permit Types</option>
                    {uniqueDomains.map((domain) => (
                      <option key={domain} value={domain}>{titleCaseDomain(domain)}</option>
                    ))}
                  </select>
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
                      setEmailError(null);
                      setComparePanelOpen(false);
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
                      {permit.permit_domain && (
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 border border-slate-200 rounded-full px-2 py-1">
                          {titleCaseDomain(String(permit.permit_domain))}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>
              <button
                onClick={() => { setSelectedPermit(null); setGeneratedLetter(""); setLetterError(null); setComparePanelOpen(false); }}
                className="flex items-center gap-2 text-gray-500 hover:text-slate-900 mb-8 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to all permits
              </button>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <div className="flex items-start justify-between mb-5">
                    <h2 className="text-xl font-bold leading-snug pr-4">{selectedPermit.project_title}</h2>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${selectedPermitStatusClass}`}>
                      {selectedPermitStatusLabel}
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <DetailRow label="Location" value={selectedPermit.location} />
                    <DetailRow label="Country" value={selectedPermit.country} />
                    <DetailRow label="Activity" value={selectedPermit.activity} />
                    {selectedPermit.category && <DetailRow label="Category" value={selectedPermit.category} />}
                    {selectedPermit.permit_domain && <DetailRow label="Permit Type" value={titleCaseDomain(String(selectedPermit.permit_domain))} />}
                    {selectedPermit.capacity && <DetailRow label="Capacity" value={selectedPermit.capacity} />}
                    {selectedPermitNotes.reference && <DetailRow label="Reference" value={selectedPermitNotes.reference} />}
                    {selectedPermitNotes.externalId && <DetailRow label="External ID" value={selectedPermitNotes.externalId} />}
                    {selectedPermitNotes.consultationDeadline && (
                      <DetailRow
                        label="Deadline"
                        value={parseDateForDisplay(selectedPermitNotes.consultationDeadline)}
                      />
                    )}
                    {selectedPermitNotes.publishedAt && (
                      <DetailRow label="Published" value={parseDateForDisplay(selectedPermitNotes.publishedAt)} />
                    )}
                    {selectedPermitNotes.sourceKey && <DetailRow label="Source Key" value={selectedPermitNotes.sourceKey} />}
                    {selectedPermitNotes.sourceName && <DetailRow label="Source Name" value={selectedPermitNotes.sourceName} />}
                    {selectedPermitNotes.sourceUrl && (
                      <DetailRow
                        label="Source URL"
                        value={
                          <a
                            href={selectedPermitNotes.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:text-blue-800 underline underline-offset-2 break-all"
                          >
                            {selectedPermitNotes.sourceUrl}
                          </a>
                        }
                      />
                    )}
                    {selectedPermitNotes.summary && <DetailRow label="Summary" value={selectedPermitNotes.summary} />}
                    {selectedPermitNotes.plainNotes && <DetailRow label="Notes" value={selectedPermitNotes.plainNotes} />}
                    {!selectedPermitNotes.summary && !selectedPermitNotes.plainNotes && selectedPermitNotes.headline && (
                      <DetailRow label="Notes" value={selectedPermitNotes.headline} />
                    )}
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
                    <label className="block text-xs text-gray-600 mb-1.5">Letter Type</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setLetterType("objection")}
                        className={`flex-1 py-2 px-3 text-sm rounded-xl border transition-all font-medium ${
                          letterType === "objection"
                            ? "bg-red-50 border-red-300 text-red-700"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        Objection
                      </button>
                      <button
                        type="button"
                        onClick={() => setLetterType("support")}
                        className={`flex-1 py-2 px-3 text-sm rounded-xl border transition-all font-medium ${
                          letterType === "support"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        Support
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
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
                    <div>
                      <label className="block text-xs text-gray-600 mb-1.5">Stakeholder Perspective</label>
                      <select
                        value={persona}
                        onChange={(e) => setPersona(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500/30 text-slate-700"
                      >
                        {personaOptions.length > 0 ? (
                          Object.entries(
                            personaOptions.reduce<Record<string, typeof personaOptions>>((groups, p) => {
                              (groups[p.categoryLabel] ??= []).push(p);
                              return groups;
                            }, {})
                          ).map(([catLabel, items]) => (
                            <optgroup key={catLabel} label={catLabel}>
                              {items.map((p) => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                              ))}
                            </optgroup>
                          ))
                        ) : (
                          <option value="general">General (Environmental Law Expert)</option>
                        )}
                      </select>
                    </div>
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
                        Generate AI {letterType === "support" ? "Support" : "Objection"} Letter
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setComparePanelOpen((prev) => !prev)}
                    className="w-full mt-3 py-2.5 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 font-medium rounded-xl transition-colors"
                  >
                    {comparePanelOpen ? "Hide compare view" : "Compare perspectives side by side"}
                  </button>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    Create two alternate drafts for this permit, then keep the stronger version in your main submission flow.
                  </p>
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

              {comparePanelOpen && (
                <LetterComparisonPanel
                  permitTitle={selectedPermit.project_title}
                  personaOptions={personaOptions}
                  defaultPersona={persona}
                  defaultLetterMode={letterMode}
                  onGenerate={requestLetterGeneration}
                  onUseDraft={handleUseComparedDraft}
                  onClose={() => setComparePanelOpen(false)}
                />
              )}

              {generatedLetter && (
                <div className="glass-card p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      Generated {letterType === "support" ? "Support" : "Objection"} Letter
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
                      Prepare Authority Submission
                    </h4>
                    {loadingRecipients && (
                      <p className="text-xs text-gray-500 mb-3">Finding official recipient contacts...</p>
                    )}

                    {/* Send To: Government / Authority contacts */}
                    {!loadingRecipients && sendToSuggestions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Send to</p>
                        <div className="flex flex-wrap gap-2">
                          {sendToSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              onClick={() => applySuggestedRecipient(suggestion)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                                recipientEmail === suggestion.email
                                  ? "bg-blue-100 border-blue-400 text-blue-800 font-medium"
                                  : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                              }`}
                              title={suggestion.reason}
                            >
                              {suggestion.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CC: NGO / Advocacy orgs */}
                    {!loadingRecipients && ccSuggestions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">CC &mdash; advocacy orgs to amplify</p>
                        <div className="flex flex-wrap gap-2">
                          {ccSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              onClick={() => applySuggestedRecipient(suggestion)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                              title={suggestion.reason}
                            >
                              {suggestion.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Official portals / webform links */}
                    {!loadingRecipients && recipientSuggestions.filter((s) => s.type === "webform").length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Official portals</p>
                        <div className="flex flex-wrap gap-2">
                          {recipientSuggestions.filter((s) => s.type === "webform").map((suggestion) => (
                            <button
                              key={suggestion.id}
                              onClick={() => openSuggestionLink(suggestion)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {suggestion.label}
                            </button>
                          ))}
                        </div>
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
                    <div className="grid gap-3">
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="authority@example.gov"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-blue-500/30 transition-colors placeholder:text-gray-500"
                      />
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Subject line"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-blue-500/30 transition-colors placeholder:text-gray-500"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={openInMailApp}
                        className="px-5 py-2.5 text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <Mail className="w-4 h-4" />
                        Open in Mail App
                        {(sendToSuggestions.length + ccSuggestions.length) > 1 && (
                          <span className="text-xs bg-blue-500 px-1.5 py-0.5 rounded-md">
                            +{sendToSuggestions.filter((s) => s.email?.toLowerCase() !== recipientEmail.toLowerCase()).length + ccSuggestions.length} CC
                          </span>
                        )}
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
                      Click <strong>Open in Mail App</strong> to send to the primary authority with all other contacts auto-CC&apos;d. Subject, body, and recipients are pre-filled.
                    </p>
                    {emailError && <p className="mt-2 text-red-400 text-sm">{emailError}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
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
                Every legally grounded objection forces authorities to respond. Join advocates in 8 countries fighting harmful developments through law.
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
      <Footer />
    </main>
  );
}

/* ─── Sub-components ─── */
function PermitPreviewCard({ permit }: { permit: Permit | null }) {
  const toTitle = (value: string) =>
    String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const reference = String(
    permit?.external_id || permit?.reference || permit?.id || "Latest official record"
  ).trim();
  const status = String(permit?.status || "Pending");
  const statusLower = status.toLowerCase();
  const statusClass = statusLower.includes("approved")
    ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/50"
    : statusLower.includes("rejected")
      ? "bg-rose-500/10 text-rose-600 border-rose-200/50"
      : statusLower.includes("review")
        ? "bg-blue-500/10 text-blue-600 border-blue-200/50"
        : "bg-amber-500/10 text-amber-600 border-amber-200/50";

  const observedAt = permitPreviewTimestamp(permit);
  const observedLabel = observedAt
    ? new Date(observedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "Unknown date";
  const locationLine = [permit?.location, permit?.country].filter(Boolean).join(" · ");

  return (
    <div className="glass-card p-5 space-y-4 shadow-xl border border-slate-100/80">
      {/* Permit header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-[11px] text-gray-400 font-mono">{reference}</span>
        </div>
        <span className={`px-2 py-0.5 text-[10px] rounded-full font-medium border ${statusClass}`}>
          {status}
        </span>
      </div>

      {/* Title + location */}
      <div>
        <h4 className="font-semibold text-slate-900 text-sm leading-snug">
          {permit?.project_title || "Loading latest pending permit..."}
        </h4>
        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
          <MapPin className="w-3 h-3" />
          {locationLine || "Official permit source"}
        </div>
      </div>

      {/* Core details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-[10px] text-gray-400 mb-1">Permit type</div>
          <div className="text-xs font-semibold text-slate-900 leading-snug">
            {permit?.permit_domain ? toTitle(String(permit.permit_domain)) : "Pending review"}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-[10px] text-gray-400 mb-1">Last updated</div>
          <div className="text-xs font-semibold text-slate-900">{observedLabel}</div>
        </div>
      </div>

      {/* Source block */}
      <div className="bg-slate-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-500 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-blue-400" />
            Source-verified permit record
          </span>
          <span className="text-emerald-600 font-medium">Live</span>
        </div>
        <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 w-full" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[permit?.source_name || "Official Government Source", permit?.activity || "Permit Activity"].map((label) => (
            <span key={label} className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[9px] rounded border border-blue-100">
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Result */}
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs font-semibold text-emerald-800">Using latest real pending permit data</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Automatically refreshed from trusted public sources</p>
        </div>
      </div>
    </div>
  );
}

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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
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
