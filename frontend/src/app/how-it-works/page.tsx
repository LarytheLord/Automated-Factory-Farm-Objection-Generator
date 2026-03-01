"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Building2,
  Landmark,
  Heart,
  Bell,
  FileText,
  Send,
  Search,
  BarChart3,
  TrendingUp,
  Globe,
  Shield,
  Zap,
  ChevronRight,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

interface AudienceSection {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  steps: { icon: React.ElementType; title: string; description: string }[];
}

const audiences: AudienceSection[] = [
  {
    title: "For Citizens",
    subtitle: "Know what\u2019s being built in your neighbourhood",
    icon: Users,
    color: "emerald",
    steps: [
      {
        icon: Users,
        title: "Sign up & select your location",
        description:
          "Choose the regions and types of permits you care about. Open Permit watches for you.",
      },
      {
        icon: Bell,
        title: "Get notified about new permits",
        description:
          "Receive alerts when new permit filings appear in your area of interest.",
      },
      {
        icon: FileText,
        title: "Read AI-generated impact reports",
        description:
          "Understand the environmental, health, and economic implications of each permit \u2014 in plain language.",
      },
      {
        icon: Send,
        title: "Generate and send objection letters",
        description:
          "One click to produce a legally grounded objection letter citing relevant laws, ready to submit.",
      },
    ],
  },
  {
    title: "For NGOs & Activists",
    subtitle: "Mobilise communities at scale",
    icon: Heart,
    color: "blue",
    steps: [
      {
        icon: Globe,
        title: "Monitor permits across regions",
        description:
          "Track permits relevant to your cause across multiple jurisdictions simultaneously.",
      },
      {
        icon: Bell,
        title: "Receive prioritised alerts",
        description:
          "AI-powered prioritisation surfaces the highest-impact permits for your organisation\u2019s mission.",
      },
      {
        icon: Users,
        title: "Mobilise your community",
        description:
          "Share campaigns with your network. Enable supporters to generate personalised objection letters.",
      },
      {
        icon: BarChart3,
        title: "Track objection volume & impact",
        description:
          "Analytics dashboard shows how many objections have been filed and their outcomes.",
      },
    ],
  },
  {
    title: "For Organisations",
    subtitle: "Data-driven site selection & risk assessment",
    icon: Building2,
    color: "cyan",
    steps: [
      {
        icon: Search,
        title: "Search receptive locations",
        description:
          "Find locations where communities are receptive to your planned development.",
      },
      {
        icon: TrendingUp,
        title: "Access demand intelligence",
        description:
          "Understand community sentiment and objection patterns before committing to a site.",
      },
      {
        icon: Shield,
        title: "Get pre-permit risk assessments",
        description:
          "AI-generated reports predict likely objection volume and legal challenges.",
      },
      {
        icon: BarChart3,
        title: "Reduce rejection costs",
        description:
          "Data-driven site selection reduces failed permit applications and community conflict.",
      },
    ],
  },
  {
    title: "For Governments",
    subtitle: "Better public participation, better decisions",
    icon: Landmark,
    color: "purple",
    steps: [
      {
        icon: Users,
        title: "Access real-time citizen sentiment",
        description:
          "See what communities think about proposed developments as opinions form.",
      },
      {
        icon: TrendingUp,
        title: "Predict objection volumes",
        description:
          "Forecast the level of public response before the consultation period opens.",
      },
      {
        icon: Search,
        title: "Identify community needs by region",
        description:
          "Map what types of development each community supports or opposes.",
      },
      {
        icon: BarChart3,
        title: "Improve public participation rates",
        description:
          "When citizens can easily understand and respond to permits, participation increases.",
      },
    ],
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
};

export default function HowItWorksPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-6">
            Platform Overview
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How <span className="gradient-text">Open Permit</span> Works
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            A four-sided civic intelligence platform serving citizens, NGOs,
            organisations, and governments. One platform, four perspectives.
          </p>
        </div>

        {/* ─── QUICK OVERVIEW ─── */}
        <section className="mb-20">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-2">01</div>
              <h3 className="font-semibold mb-2">Permits Are Filed</h3>
              <p className="text-gray-500 text-sm">
                Open Permit monitors permit databases across 8+ countries and
                surfaces filings that matter.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">02</div>
              <h3 className="font-semibold mb-2">AI Analyses Impact</h3>
              <p className="text-gray-500 text-sm">
                Each permit is matched against 37+ laws. Impact reports and
                legal citations are generated automatically.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">03</div>
              <h3 className="font-semibold mb-2">Communities Respond</h3>
              <p className="text-gray-500 text-sm">
                Citizens generate legally grounded objection letters in under 2
                minutes and submit directly.
              </p>
            </div>
          </div>
        </section>

        {/* ─── AUDIENCE SECTIONS ─── */}
        {audiences.map((audience) => {
          const Icon = audience.icon;
          const colors = colorMap[audience.color];
          return (
            <section key={audience.title} className="mb-16">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <h2 className="text-2xl font-bold">{audience.title}</h2>
              </div>
              <p className="text-gray-400 mb-8 ml-12">{audience.subtitle}</p>

              <div className="grid md:grid-cols-2 gap-4 ml-0 md:ml-12">
                {audience.steps.map((step, j) => {
                  const StepIcon = step.icon;
                  return (
                    <div key={j} className="glass-card p-5 flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${colors.bg} flex-shrink-0`}>
                        <StepIcon className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 text-sm">
                          {step.title}
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ─── CTA ─── */}
        <section className="mb-16">
          <div
            className="glass-card p-10 text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))",
            }}
          >
            <Zap className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-6">
              Join the growing community of citizens and organisations using Open
              Permit to make civic participation accessible.
            </p>
            <Link
              href="/survey"
              className="group inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20"
            >
              Get Early Access
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
