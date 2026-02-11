'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Globe, FileText, Zap, Clock } from 'lucide-react';

export default function ImpactPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white hero-gradient">
            <div className="max-w-5xl mx-auto px-4 py-12">
                <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-8">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                <h1 className="text-4xl font-bold mb-2">
                    Impact <span className="gradient-text">Dashboard</span>
                </h1>
                <p className="text-gray-400 mb-10">Measuring our collective potential to protect animals</p>

                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
                    <MetricCard icon={<Shield className="w-5 h-5" />} value="2.8M+" label="Potential Animals Protected" highlight />
                    <MetricCard icon={<FileText className="w-5 h-5" />} value="24" label="Permits Monitored" />
                    <MetricCard icon={<Globe className="w-5 h-5" />} value="8" label="Countries Covered" />
                    <MetricCard icon={<Zap className="w-5 h-5" />} value="147" label="Objections Generated" />
                    <MetricCard icon={<FileText className="w-5 h-5" />} value="8" label="Legal Frameworks" />
                    <MetricCard icon={<Clock className="w-5 h-5" />} value="~2 min" label="Avg. Generation Time" />
                </div>

                {/* Case Study */}
                <div className="glass-card p-8 mb-10">
                    <h2 className="text-2xl font-bold mb-6">Success Story</h2>
                    <div className="border-l-4 border-emerald-500 pl-6 mb-6">
                        <h3 className="text-xl font-semibold mb-1">Maharashtra Poultry Case: 500,000 Birds Protected</h3>
                        <p className="text-gray-500 text-sm italic">Demonstrative case study</p>
                    </div>

                    <div className="space-y-4 text-sm text-gray-300">
                        <Row label="Problem" value="Illegal poultry operation in Pune operating at 3× permitted capacity with no wastewater treatment." />
                        <Row label="Solution" value="Activists used AFFOG to generate a comprehensive objection citing Maharashtra Pollution Control Board regulations and Prevention of Cruelty to Animals Act 1960." />
                        <Row label="Outcome" value="Inspection revealed violations. Operation suspended pending compliance. 500,000 birds/year spared from illegal conditions." />
                        <Row label="Timeline" value="Violation discovered → Objection filed in 2 min → Authority inspection in 15 days → Operation suspended in 30 days" />
                    </div>
                </div>

                {/* CTA */}
                <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))' }}>
                    <h2 className="text-2xl font-bold mb-3">Every Objection Counts</h2>
                    <p className="text-gray-400 mb-6">Join advocates using AFFOG to protect animals from factory farming violations.</p>
                    <Link href="/" className="inline-block px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all">
                        Generate Your First Objection →
                    </Link>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon, value, label, highlight }: { icon: React.ReactNode; value: string; label: string; highlight?: boolean }) {
    return (
        <div className={`glass-card p-5 text-center ${highlight ? 'border-emerald-500/30' : ''}`}>
            <div className="text-emerald-400 mb-2 flex justify-center">{icon}</div>
            <div className={`text-2xl font-bold ${highlight ? 'text-emerald-400' : ''}`}>{value}</div>
            <div className="text-gray-500 text-xs mt-1">{label}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-4">
            <span className="text-gray-500 w-20 flex-shrink-0 font-medium">{label}</span>
            <span>{value}</span>
        </div>
    );
}
