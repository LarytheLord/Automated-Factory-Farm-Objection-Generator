import Link from "next/link";
import { ArrowLeft, Database, Filter, Shield, Target, Globe2, Workflow } from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export const dynamic = "force-dynamic";

const roadmap = [
  {
    quarter: "Q2 2026",
    title: "Domain-Aware Permit Intelligence",
    points: [
      "Add permit-domain classification (farm, infra, industrial pollution, other)",
      "Introduce domain filters on home and dashboard",
      "Separate reporting by permit domain to avoid mixed campaign data",
    ],
  },
  {
    quarter: "Q3 2026",
    title: "Recipient Coverage Expansion",
    points: [
      "Expand authority directory coverage source-by-source",
      "Apply confidence scoring: verified, inferred, missing",
      "Fallback to official source routes when direct email is unavailable",
    ],
  },
  {
    quarter: "Q4 2026",
    title: "Beyond Factory Farms",
    points: [
      "Ingest high-impact industrial and infrastructure permit streams",
      "Introduce domain-specific objection templates and legal hooks",
      "Launch campaign analytics for NGOs and civic groups",
    ],
  },
];

const domains = [
  {
    key: "farm_animal",
    title: "Farm Animal Permits",
    description: "Intensive livestock, poultry, pig, dairy, and related permits.",
  },
  {
    key: "industrial_infra",
    title: "Infrastructure Projects",
    description: "Large industrial developments, energy, transport, and major build projects.",
  },
  {
    key: "pollution_industrial",
    title: "Industrial Emissions",
    description: "Waste, discharge, air-quality, emissions, and polluting industry permits.",
  },
  {
    key: "other",
    title: "Other Public-Interest Permits",
    description: "Publicly listed permits relevant to civic environmental participation.",
  },
];

export default function FuturePrototypePage() {
  return (
    <main className="min-h-screen bg-black text-slate-900">
      <Navbar />
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to platform
          </Link>

          <div className="mt-8 grid lg:grid-cols-2 gap-8 items-start">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-500 mb-3">Future Prototype</p>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
                Building Open Permit into a full civic permit intelligence stack
              </h1>
              <p className="text-gray-600 leading-relaxed text-base">
                Today, Open Permit helps communities object to high-impact farm permits.
                The next build expands this to broader industrial and infrastructure permits while
                keeping domains separated, traceable, and easy to filter.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <InfoCard icon={<Database className="w-4 h-4" />} title="Data Layer" text="Official public-register permit sources with provenance retained." />
                <InfoCard icon={<Filter className="w-4 h-4" />} title="Domain Filters" text="Clear permit-type filtering so campaigns stay focused and comparable." />
                <InfoCard icon={<Workflow className="w-4 h-4" />} title="Recipient Routing" text="Source-scoped authority mapping with confidence labels." />
                <InfoCard icon={<Shield className="w-4 h-4" />} title="Safety Controls" text="No blind guesses: verified contacts first, official webform fallback." />
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" /> Product Scope
              </h2>
              <div className="space-y-3">
                {domains.map((domain) => (
                  <div key={domain.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold">{domain.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{domain.description}</p>
                    <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider">Key: {domain.key}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
          {roadmap.map((item) => (
            <div key={item.quarter} className="glass-card p-6">
              <p className="text-xs uppercase tracking-wider text-emerald-500 mb-2">{item.quarter}</p>
              <h3 className="text-lg font-semibold mb-4">{item.title}</h3>
              <ul className="space-y-2">
                {item.points.map((point) => (
                  <li key={point} className="text-sm text-gray-600 leading-relaxed">• {point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto glass-card p-8 md:p-10">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <Globe2 className="w-6 h-6 text-blue-500" /> Why This Matters
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Expanding permit coverage is not just about more data. It is about giving communities,
            activists, NGOs, and social-impact organisations a reliable way to find relevant permits,
            identify the right authority, and act within public comment windows across multiple sectors.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold mb-1">
        <span className="text-emerald-500">{icon}</span>
        {title}
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
    </div>
  );
}
