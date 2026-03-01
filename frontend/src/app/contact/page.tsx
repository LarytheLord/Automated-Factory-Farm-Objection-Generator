"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Send,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function ContactPage() {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organisation: "",
    role: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contact",
          name: formData.name,
          email: formData.email,
          organisation: formData.organisation,
          role: formData.role,
          message: formData.message,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError(
        "Could not submit the form. You can email us directly instead."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-900 hero-gradient">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 pt-28 pb-16">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-500 hover:text-slate-900 transition-colors text-sm mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* ─── HERO ─── */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-6">
            Contact Us
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Get in <span className="gradient-text">Touch</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            Whether you&apos;re a citizen, NGO, investor, or journalist — we&apos;d love
            to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* ─── FORM ─── */}
          <div className="md:col-span-2">
            <div className="glass-card p-8">
              {submitted ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Message Sent</h2>
                  <p className="text-gray-500">
                    Thanks for reaching out. We&apos;ll get back to you soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-600 mb-1 block">
                        Name
                      </label>
                      <input
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500/30 transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-600 mb-1 block">
                        Email
                      </label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500/30 transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-600 mb-1 block">
                        Organisation (optional)
                      </label>
                      <input
                        value={formData.organisation}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            organisation: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500/30 transition-colors"
                        placeholder="Your organisation"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-600 mb-1 block">
                        I am a...
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            role: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500/30 transition-colors"
                      >
                        <option value="">Select...</option>
                        <option value="citizen">Citizen</option>
                        <option value="ngo">NGO / Activist</option>
                        <option value="organisation">Organisation</option>
                        <option value="government">Government</option>
                        <option value="media">Media</option>
                        <option value="investor">Investor</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-600 mb-1 block">
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-emerald-500/30 transition-colors resize-none"
                      placeholder="How can we help?"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      "Sending..."
                    ) : (
                      <>
                        Send Message <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* ─── SIDEBAR ─── */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4">Contact Info</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <a
                      href="mailto:abid@openpaws.ai"
                      className="text-gray-500 text-sm hover:text-emerald-400 transition-colors"
                    >
                      abid@openpaws.ai
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Team Locations</p>
                    <p className="text-gray-500 text-sm">
                      India (C4C AARC Pre Accelation Campus), Global (Remote)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3">Newsletter</h3>
              <p className="text-gray-500 text-sm mb-4">
                Stay updated — join our mailing list for product updates and
                permit intelligence.
              </p>
              <p className="text-gray-400 text-xs italic">Coming soon</p>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-semibold mb-3">Open Source</h3>
              <p className="text-gray-500 text-sm">
                Open Permit is built in the open. Contributions, bug reports,
                and feature requests are welcome on GitHub.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
