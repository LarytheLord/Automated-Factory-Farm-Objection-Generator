"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  Globe,
  Users,
  Zap,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const timeline = [
  {
    date: "July 2025",
    title: "The Spark",
    description:
      "Built AFOG in 10 hours at Code 4 Compassion Mumbai, hosted by Open Paws & Electric Sheep. A team of 5 built a working prototype that generates AI-powered objection letters against factory farm permits.",
  },
  {
    date: "November 2025",
    title: "The Validation",
    description:
      "Selected for Code 4 Compassion Washington DC hackathon. Team expanded across 3 continents. Added real legal citations from 37+ laws, automated permit detection, and direct email integration.",
  },
  {
    date: "February 2026",
    title: "The Accelerator",
    description:
      "Joined the AARC Pre-Accelerator by Code 4 Compassion at Bangalore Campus. During intensive sessions, the team realised: the same technology could serve ALL civic permit processes \u2014 not just factory farms.",
  },
  {
    date: "February 2026",
    title: "The Pivot",
    description:
      "Strategic decision: expand from factory farm objections to full civic permit intelligence. Data centres, housing developments, industrial facilities, infrastructure projects, environmental assessments \u2014 all permits, all communities.",
  },
  {
    date: "March 2026",
    title: "The Rebrand",
    description:
      "Renamed to Open Permit. Repositioned as a four-sided civic intelligence marketplace serving Citizens, NGOs, Organisations, and Governments. 400+ advocacy organisations entered the outreach pipeline.",
  },
  {
    date: "March 2026",
    title: "Today",
    description:
      "Distributed team across 3 continents. Live permit monitoring across 8+ countries. Building the platform that makes permit data accessible, actionable, and equitable for everyone.",
  },
];

const partners = [
  {
    name: "Open Paws",
    description:
      "The organisation behind Code 4 Compassion. Builds AI tools for animal welfare and hosts hackathons connecting technologists with advocacy causes. Open Permit was conceived at their Mumbai event.",
    url: "https://www.openpaws.ai/",
    icon: Heart,
  },
  {
    name: "AARC Pre-Accelerator",
    description:
      "The accelerator program by Code 4 Compassion that provided mentorship and strategic guidance. It was during AARC sessions that the expanded vision for Open Permit crystallised.",
    url: null,
    icon: Zap,
  },
  {
    name: "Code 4 Compassion",
    description:
      "Hackathon and community initiative by Open Paws and Electric Sheep. Brings together developers, designers, and advocates to build technology for social impact.",
    url: "https://www.codeforcompassion.com/",
    icon: Users,
  },
  {
    name: "Electric Sheep",
    description:
      "Co-host of Code 4 Compassion events. AI company focused on ethical AI applications.",
    url: null,
    icon: Sparkles,
  },
];

export default function AboutPage() {
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
            Our Story
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            From Hackathon to{" "}
            <span className="gradient-text">Global Platform</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Open Permit started as a 10-hour prototype. Now it&apos;s becoming the
            civic intelligence layer for permits worldwide.
          </p>
        </div>

        {/* ─── TIMELINE ─── */}
        <section className="mb-20">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 mb-3 text-center">
            Our Journey
          </p>
          <h2 className="text-3xl font-bold mb-12 text-center">
            The Origin Story
          </h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-emerald-500/20 -translate-x-1/2 hidden md:block" />
            <div className="absolute left-4 top-0 bottom-0 w-px bg-emerald-500/20 md:hidden" />

            <div className="space-y-8 md:space-y-12">
              {timeline.map((item, i) => (
                <div
                  key={i}
                  className={`relative flex flex-col md:flex-row ${
                    i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  } items-start md:items-center gap-4 md:gap-8`}
                >
                  {/* Dot */}
                  <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-emerald-400 rounded-full -translate-x-1/2 mt-2 md:mt-0 z-10" />

                  {/* Card */}
                  <div
                    className={`ml-10 md:ml-0 md:w-[calc(50%-2rem)] ${
                      i % 2 === 0 ? "md:pr-8" : "md:pl-8"
                    }`}
                  >
                    <div className="glass-card p-6 animate-fade-in-up">
                      <span className="text-emerald-400 text-xs font-medium uppercase tracking-wider">
                        {item.date}
                      </span>
                      <h3 className="text-xl font-bold mt-1 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Spacer for opposite side */}
                  <div className="hidden md:block md:w-[calc(50%-2rem)]" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PARTNERS ─── */}
        <section className="mb-20">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 mb-3 text-center">
            Our Partners
          </p>
          <h2 className="text-3xl font-bold mb-12 text-center">
            Supported By
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {partners.map((partner) => {
              const Icon = partner.icon;
              return (
                <div key={partner.name} className="glass-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{partner.name}</h3>
                        {partner.url && (
                          <a
                            href={partner.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {partner.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── TEAM ─── */}
        <section className="mb-20">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 mb-3 text-center">
            The Team
          </p>
          <h2 className="text-3xl font-bold mb-12 text-center">
            Who We Are
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Abid Khan</h3>
              <p className="text-emerald-400 text-xs font-medium uppercase tracking-wider mb-2">
                CTO & Co-Founder
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
                CS student at Gujarat Technological University. Software
                Engineer at Open Paws. Google Gemini Campus Ambassador.
              </p>
            </div>

            <div className="glass-card p-6 text-center border-dashed border-emerald-500/20">
              <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Join Our Team</h3>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
                Open Roles
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
                We&apos;re looking for engineers, designers, and advocates passionate
                about civic technology.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex items-center gap-1 text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
              >
                Get in touch <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="glass-card p-6 text-center border-dashed border-emerald-500/20">
              <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Volunteer</h3>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
                Contribute
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
                Open Permit is open-source. Contribute code, translations, or
                help us reach communities that need this tool.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex items-center gap-1 text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
              >
                Learn more <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── VISION QUOTE ─── */}
        <section className="mb-16">
          <div
            className="glass-card p-10 text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))",
            }}
          >
            <blockquote className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed italic">
              &ldquo;We believe communities shouldn&apos;t need lawyers and lobbyists to
              have a voice in what gets built in their neighbourhoods. Open
              Permit makes permit data accessible, objection letters intelligent,
              and civic participation effortless.&rdquo;
            </blockquote>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
