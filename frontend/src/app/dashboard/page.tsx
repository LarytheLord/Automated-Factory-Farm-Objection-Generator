'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Globe, Scale, TrendingUp, Shield } from 'lucide-react';

interface Permit {
    country: string;
    category?: string;
    status: string;
    project_title: string;
    activity?: string;
}

interface LegalFramework {
    country: string;
    laws: number;
    keyLaw: string;
    status: string;
}

export default function Dashboard() {
    const [permits, setPermits] = useState<Permit[]>([]);
    const [frameworks, setFrameworks] = useState<LegalFramework[]>([]);
    const [loading, setLoading] = useState(true);

    const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [permitsRes, legalRes] = await Promise.all([
                    fetch(`${BACKEND}/api/permits`).then(r => r.json()).catch(() => []),
                    fetch(`${BACKEND}/api/legal-frameworks`).then(r => r.json()).catch(() => ({ frameworks: [] })),
                ]);
                const permitsArray = Array.isArray(permitsRes) ? permitsRes : (permitsRes.permits || []);
                setPermits(permitsArray);
                setFrameworks(legalRes.frameworks || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [BACKEND]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">Loading Analytics...</p>
                </div>
            </div>
        );
    }

    const countryData = Object.entries(permits.reduce((acc, curr) => {
        acc[curr.country] = (acc[curr.country] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const statusData = Object.entries(permits.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const categoryData = Object.entries(permits.reduce((acc, curr) => {
        const cat = curr.category || 'Unknown';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const activityData = Object.entries(permits.reduce((acc, curr) => {
        const act = curr.activity || 'Other';
        const simplified = act.includes('Poultry') || act.includes('Broiler') || act.includes('Layer') ? 'Poultry/Egg' :
            act.includes('Dairy') || act.includes('CAFO') ? 'Dairy/Cattle' :
            act.includes('Swine') || act.includes('Piggery') || act.includes('Hog') ? 'Swine/Pork' :
            act.includes('Slaughter') ? 'Slaughterhouse' :
            act.includes('Tannery') || act.includes('Leather') ? 'Tannery' :
            act.includes('Feed') || act.includes('Hatchery') ? 'Feed/Hatchery' :
            'Industrial/Other';
        acc[simplified] = (acc[simplified] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const maxCountry = Math.max(...countryData.map(d => d.value), 1);
    const maxCategory = Math.max(...categoryData.map(d => d.value), 1);
    const maxActivity = Math.max(...activityData.map(d => d.value), 1);
    const totalStatus = statusData.reduce((sum, d) => sum + d.value, 0) || 1;

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
    const CATEGORY_COLORS: Record<string, string> = { 'Red': '#EF4444', 'Orange': '#F97316', 'Green': '#22C55E', 'Unknown': '#6B7280' };
    const STATUS_COLORS: Record<string, string> = {
        'Approved': '#22C55E', 'Pending': '#F59E0B', 'In Process': '#3B82F6',
        'Rejected': '#EF4444', 'Under Review': '#8B5CF6'
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-blue-400" />
                            Global Impact Dashboard
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">{permits.length} permits monitored across {countryData.length} countries</p>
                    </div>
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                </div>

                {/* ─── Top Stats ─── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass-card p-5 text-center">
                        <Globe className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{countryData.length}</div>
                        <div className="text-gray-500 text-xs">Countries Covered</div>
                    </div>
                    <div className="glass-card p-5 text-center">
                        <Scale className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold">37+</div>
                        <div className="text-gray-500 text-xs">Laws Integrated</div>
                    </div>
                    <div className="glass-card p-5 text-center">
                        <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{permits.filter(p => p.category === 'Red').length}</div>
                        <div className="text-gray-500 text-xs">High-Risk Permits</div>
                    </div>
                    <div className="glass-card p-5 text-center">
                        <Shield className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{permits.filter(p => p.status === 'Pending' || p.status === 'In Process').length}</div>
                        <div className="text-gray-500 text-xs">Actionable Permits</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Country Distribution */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold mb-6">Permits by Country</h2>
                        <div className="space-y-4">
                            {countryData.map((item, idx) => (
                                <div key={item.name}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm text-gray-300">{item.name}</span>
                                        <span className="text-sm font-semibold">{item.value}</span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-2.5">
                                        <div
                                            className="h-2.5 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${(item.value / maxCountry) * 100}%`,
                                                backgroundColor: COLORS[idx % COLORS.length]
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold mb-6">Permit Status</h2>
                        <div className="space-y-3">
                            {statusData.map((item) => {
                                const percentage = ((item.value / totalStatus) * 100).toFixed(0);
                                return (
                                    <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: STATUS_COLORS[item.name] || '#6B7280' }}
                                            />
                                            <span className="text-sm">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-20 bg-gray-800 rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: STATUS_COLORS[item.name] || '#6B7280'
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500 w-8 text-right">{percentage}%</span>
                                            <span className="text-sm font-semibold w-6 text-right">{item.value}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <p className="text-amber-400 text-xs font-medium">
                                {permits.filter(p => p.status === 'Pending' || p.status === 'In Process').length} permits are currently actionable — objections can be filed now.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Risk Categories */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold mb-6">Environmental Risk Categories</h2>
                        <div className="space-y-4">
                            {categoryData.map((item) => (
                                <div key={item.name}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm text-gray-300 flex items-center gap-2">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#8b5cf6' }}
                                            />
                                            {item.name} Category
                                        </span>
                                        <span className="text-sm font-semibold">{item.value}</span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-3">
                                        <div
                                            className="h-3 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${(item.value / maxCategory) * 100}%`,
                                                backgroundColor: CATEGORY_COLORS[item.name] || '#8b5cf6'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Activity Types */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold mb-6">Facility Types</h2>
                        <div className="space-y-4">
                            {activityData.map((item, idx) => (
                                <div key={item.name}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm text-gray-300">{item.name}</span>
                                        <span className="text-sm font-semibold">{item.value}</span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-2.5">
                                        <div
                                            className="h-2.5 rounded-full transition-all duration-500"
                                            style={{
                                                width: `${(item.value / maxActivity) * 100}%`,
                                                backgroundColor: COLORS[(idx + 3) % COLORS.length]
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Legal Frameworks */}
                {frameworks.length > 0 && (
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Scale className="w-5 h-5 text-blue-400" />
                            Integrated Legal Frameworks
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {frameworks.map((fw) => (
                                <div key={fw.country} className="p-4 rounded-lg bg-gray-900/50 border border-gray-800/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-sm">{fw.country}</span>
                                        <span className="text-xs text-emerald-400 font-medium">{fw.laws} laws</span>
                                    </div>
                                    <p className="text-gray-500 text-xs">{fw.keyLaw}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
