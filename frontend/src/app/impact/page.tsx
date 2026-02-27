'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Zap, Scale, Users,
    TrendingUp, AlertTriangle, Heart, Droplets, Wind, BookOpen
} from 'lucide-react';

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

export default function ImpactPage() {
    const [mounted, setMounted] = useState(false);
    const animCAFOs = useAnimatedCounter(24000, 2000);
    const animAnimals = useAnimatedCounter(1700, 2500);
    const animLaws = useAnimatedCounter(37);
    const animCountries = useAnimatedCounter(8);
    const animStates = useAnimatedCounter(15);
    const animSignatures = useAnimatedCounter(1400000, 2500);

    useEffect(() => { setMounted(true); }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-slate-900 hero-gradient">
            <div className="max-w-5xl mx-auto px-6 py-16">
                <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-slate-900 transition-colors text-sm mb-10">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 mb-3">Why this matters</p>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    The Data Behind <span className="gradient-text">Factory Farming</span>
                </h1>
                <p className="text-gray-400 mb-14 text-lg max-w-2xl leading-relaxed">
                    Why automated legal tools are urgently needed — and why objections work.
                </p>

                {/* ─── THE PROBLEM: KEY STATS ─── */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                        The Scale of Factory Farming
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard value={`${animCAFOs.toLocaleString()}`} label="Factory Farms in the US alone" sub="USDA 2022 Census" highlight />
                        <StatCard value={`${(animAnimals / 1000).toFixed(1)}B`} label="Animals confined at any time" sub="Sentience Institute" />
                        <StatCard value="99%" label="US farmed animals in factory farms" sub="Sentience Institute" />
                        <StatCard value="14.5%" label="of global greenhouse gas emissions" sub="ASPCA / FAO" />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="glass-card p-5">
                            <Droplets className="w-5 h-5 text-blue-400 mb-3" />
                            <div className="text-lg font-bold mb-1">941 Billion lbs</div>
                            <p className="text-gray-400 text-sm">of manure produced annually by US factory farms — twice the nation&apos;s human waste output, none regulated by a government agency.</p>
                            <p className="text-gray-600 text-xs mt-2">Source: Food &amp; Water Watch</p>
                        </div>
                        <div className="glass-card p-5">
                            <Wind className="w-5 h-5 text-amber-400 mb-3" />
                            <div className="text-lg font-bold mb-1">~10,000 Large Farms</div>
                            <p className="text-gray-400 text-sm">discharge pollution without required permits. The EPA still lacks comprehensive data on CAFO locations.</p>
                            <p className="text-gray-600 text-xs mt-2">Source: EPA via Food &amp; Water Watch</p>
                        </div>
                        <div className="glass-card p-5">
                            <Heart className="w-5 h-5 text-red-400 mb-3" />
                            <div className="text-lg font-bold mb-1">80% of Antibiotics</div>
                            <p className="text-gray-400 text-sm">sold in the US go to livestock, driving antibiotic resistance that causes 23,000+ deaths and costs $55-70 billion annually.</p>
                            <p className="text-gray-600 text-xs mt-2">Source: Sentient Media / CDC</p>
                        </div>
                    </div>
                </section>

                {/* ─── PUBLIC SUPPORT ─── */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <Users className="w-6 h-6 text-emerald-400" />
                        Public Support is Overwhelming
                    </h2>
                    <div className="glass-card p-6 mb-6">
                        <div className="grid md:grid-cols-3 gap-8">
                            <div>
                                <div className="text-4xl font-bold text-emerald-400 mb-1">89%</div>
                                <p className="text-gray-300 text-sm">of Americans are concerned about industrial animal agriculture</p>
                                <p className="text-gray-600 text-xs mt-1">ASPCA Survey, 2020</p>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-blue-400 mb-1">74%</div>
                                <p className="text-gray-300 text-sm">of Americans favor banning new factory farms (CAFOs)</p>
                                <p className="text-gray-600 text-xs mt-1">ASPCA Survey</p>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-purple-400 mb-1">93%</div>
                                <p className="text-gray-300 text-sm">of Gen Z express concern for animal and environmental issues</p>
                                <p className="text-gray-600 text-xs mt-1">Faunalytics Multi-Country Study</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm">
                        The gap between public concern and actual legal action is the core problem AFFOG solves. People want to oppose factory farming — they just don&apos;t know how to navigate the legal process.
                    </p>
                </section>

                {/* ─── LEGAL FRAMEWORK ─── */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <Scale className="w-6 h-6 text-blue-400" />
                        Global Legal Framework
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <StatCard value={animLaws.toString()} label="Laws Integrated" sub="Across 6 jurisdictions" />
                        <StatCard value={animCountries.toString()} label="Countries Covered" sub="US, UK, EU, India, AU, CA" />
                        <StatCard value={animStates.toString()} label="US States with Bans" sub="Confinement restrictions" />
                        <StatCard value={`${(animSignatures / 1000000).toFixed(1)}M`} label="EU Signatures" sub="End the Cage Age" />
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-4 text-lg">It&apos;s 100% Legal — And Constitutionally Protected</h3>
                        <div className="space-y-3 text-sm">
                            <LegalRow
                                country="United States"
                                law="First Amendment Right to Petition"
                                detail="Filing public comments on CAFO permits is textbook protected speech under all 50 state constitutions."
                            />
                            <LegalRow
                                country="United Kingdom"
                                law="Town and Country Planning Act 1990"
                                detail="Public consultation periods explicitly invite objections. CIWF and CAFF actively help communities file them."
                            />
                            <LegalRow
                                country="European Union"
                                law="Aarhus Convention (binding, all 27 states)"
                                detail="Guarantees the right to participate in environmental decisions and access justice when denied."
                            />
                            <LegalRow
                                country="India"
                                law="Environment Protection Act 1986"
                                detail="Comprehensive framework covering pollution control, environmental quality, and restrictions on industrial discharge."
                            />
                            <LegalRow
                                country="Australia"
                                law="EPBC Act 1999"
                                detail="Federal environmental protection requiring development applications for intensive livestock operations."
                            />
                        </div>
                    </div>
                </section>

                {/* ─── REAL WINS ─── */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                        Real-World Victories (2024-2026)
                    </h2>
                    <div className="space-y-4">
                        <WinCard
                            title="UK: Cranswick Megafarm Blocked"
                            detail="Over 15,000 public objections led to council rejection of a massive poultry facility."
                            date="April 2025"
                            impact="Prevented hundreds of thousands of animals from confinement"
                        />
                        <WinCard
                            title="UK: Norfolk Megafarm Rejected"
                            detail={`Called a "turning point for industrial livestock production in the UK" by Sustain.`}
                            date="April 2025"
                            impact="Landmark environmental decision"
                        />
                        <WinCard
                            title="Indiana: CAFO Denied Unanimously"
                            detail="Proposed 8,000-head calf CAFO denied after nearly 30 community members spoke against it."
                            date="2023"
                            impact="Community voices directly blocked industrial expansion"
                        />
                        <WinCard
                            title="Oregon: Two Factory Farms Stopped"
                            detail="SB 85 reform, backed by litigation, has already prevented two planned poultry factories."
                            date="2025"
                            impact="Legislative reform creating lasting protections"
                        />
                        <WinCard
                            title="North Carolina: $574M in Verdicts"
                            detail="Five jury cases awarded over $574 million to communities affected by Smithfield hog operations."
                            date="2018-2024"
                            impact="Set legal precedent for community harm from factory farms"
                        />
                        <WinCard
                            title="Washington State: NGOs Win at Hearings Board"
                            detail="Coalition forced Department of Ecology to revise CAFO general permits after winning appeal."
                            date="March 2025"
                            impact="Statewide permit standards strengthened"
                        />
                    </div>
                </section>

                {/* ─── WHY AFFOG ─── */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-purple-400" />
                        Why Automated Objections Work
                    </h2>
                    <div className="glass-card p-6">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-lg mb-3 text-red-400">The Problem</h3>
                                <ul className="space-y-2 text-sm text-gray-300">
                                    <li className="flex gap-2"><span className="text-red-400 mt-0.5">x</span> Legal objections take hours of research per letter</li>
                                    <li className="flex gap-2"><span className="text-red-400 mt-0.5">x</span> Rural communities lack access to environmental lawyers</li>
                                    <li className="flex gap-2"><span className="text-red-400 mt-0.5">x</span> Generic mass comments are ineffective (Brookings: only 19% influence outcomes)</li>
                                    <li className="flex gap-2"><span className="text-red-400 mt-0.5">x</span> CAFOs disproportionately harm low-income communities of color</li>
                                    <li className="flex gap-2"><span className="text-red-400 mt-0.5">x</span> Permit processes are complex and time-limited</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-3 text-emerald-400">AFFOG&apos;s Solution</h3>
                                <ul className="space-y-2 text-sm text-gray-300">
                                    <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span> AI generates unique, legally-cited letters in under 2 minutes</li>
                                    <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span> 37+ laws across 6 jurisdictions, automatically matched to each permit</li>
                                    <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span> Each objection is substantive and permit-specific — what regulators must consider</li>
                                    <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span> Democratizes legal capacity for underserved communities</li>
                                    <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">+</span> 20-year meta-analysis confirms digital tools increase civic participation</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-500 text-xs mt-3">
                        Research: Brookings Institution analysis of ~1,000 mass comment campaigns; ScienceDirect meta-analysis covering 50 countries over 20 years.
                    </p>
                </section>

                {/* ─── NO COMPETITORS ─── */}
                <section className="mb-16">
                    <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))' }}>
                        <Zap className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-3">First of Its Kind</h2>
                        <p className="text-gray-300 max-w-2xl mx-auto mb-4">
                            No automated factory farm objection generator exists anywhere in the world. AFFOG is the first tool to combine AI-powered legal letter generation with a comprehensive, multi-jurisdictional legal citation library — specifically designed to help communities fight factory farming.
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-emerald-400">0</div>
                                <div className="text-gray-500">Direct competitors</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-400">$50.7B</div>
                                <div className="text-gray-500">Plant-based market (2025)</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-400">$23M+</div>
                                <div className="text-gray-500">EA animal welfare grants</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── CTA ─── */}
                <div className="glass-card p-8 text-center">
                    <h2 className="text-2xl font-bold mb-3">Every Objection Counts</h2>
                    <p className="text-gray-400 mb-6 max-w-xl mx-auto">
                        15,000 objections blocked a UK megafarm. 30 voices blocked an Indiana CAFO.
                        Your objection could be the one that tips the balance.
                    </p>
                    <Link href="/" className="inline-block px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all">
                        Generate Your First Objection
                    </Link>
                </div>
            </div>
        </div>
    );
}

function StatCard({ value, label, sub, highlight }: { value: string; label: string; sub?: string; highlight?: boolean }) {
    return (
        <div className={`glass-card p-5 text-center ${highlight ? 'border-emerald-500/30' : ''}`}>
            <div className={`text-2xl font-bold ${highlight ? 'text-emerald-400' : ''}`}>{value}</div>
            <div className="text-gray-400 text-xs mt-1">{label}</div>
            {sub && <div className="text-gray-600 text-[10px] mt-1">{sub}</div>}
        </div>
    );
}

function LegalRow({ country, law, detail }: { country: string; law: string; detail: string }) {
    return (
        <div className="flex gap-4 p-3 rounded-lg bg-gray-900/50">
            <div className="w-28 flex-shrink-0">
                <span className="text-emerald-400 font-medium text-xs">{country}</span>
            </div>
            <div>
                <div className="font-medium text-sm text-slate-900">{law}</div>
                <div className="text-gray-500 text-xs mt-0.5">{detail}</div>
            </div>
        </div>
    );
}

function WinCard({ title, detail, date, impact }: { title: string; detail: string; date: string; impact: string }) {
    return (
        <div className="glass-card p-5 flex gap-4">
            <div className="w-2 bg-emerald-500 rounded-full flex-shrink-0" />
            <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="font-bold text-base">{title}</h3>
                    <span className="text-xs text-gray-500 flex-shrink-0">{date}</span>
                </div>
                <p className="text-gray-400 text-sm mt-1">{detail}</p>
                <p className="text-emerald-400/80 text-xs mt-2 font-medium">{impact}</p>
            </div>
        </div>
    );
}
