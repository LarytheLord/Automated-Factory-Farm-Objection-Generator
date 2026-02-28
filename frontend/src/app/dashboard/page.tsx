'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Globe, Scale, TrendingUp, Shield } from 'lucide-react';

interface Permit {
    id?: string | number;
    country: string;
    category?: string;
    status: string;
    project_title: string;
    activity?: string;
    location?: string;
    notes?: string;
    source_url?: string;
    source_payload?: unknown;
    external_id?: string;
    consultation_deadline?: string;
    published_at?: string;
    updated_at?: string;
    created_at?: string;
}

interface LegalFramework {
    country: string;
    laws: number;
    keyLaw: string;
    status: string;
}

interface AuthUser {
    role?: string;
    accessApproved?: boolean;
}

export default function Dashboard() {
    const [permits, setPermits] = useState<Permit[]>([]);
    const [frameworks, setFrameworks] = useState<LegalFramework[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);

    const API_BASE = '';

    useEffect(() => {
        const fetchData = async (token: string) => {
            try {
                const [permitsRes, legalRes] = await Promise.all([
                    fetch(`${API_BASE}/api/permits`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }).then(r => (r.ok ? r.json() : [])),
                    fetch(`${API_BASE}/api/legal-frameworks`).then(r => r.json()).catch(() => ({ frameworks: [] })),
                ]);
                const permitsArray = Array.isArray(permitsRes) ? permitsRes : (permitsRes.permits || []);
                setPermits(permitsArray);
                setFrameworks(legalRes.frameworks || []);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Unable to load dashboard data right now.');
            } finally {
                setLoading(false);
            }
        };

        const initialize = async () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                setError('Dashboard access requires an approved account.');
                setLoading(false);
                return;
            }

            try {
                const meRes = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!meRes.ok) {
                    setError('Session expired. Please sign in again.');
                    setLoading(false);
                    return;
                }
                const mePayload = await meRes.json();
                const user: AuthUser | undefined = mePayload?.user;
                const approved = !!(user && (user.role === 'admin' || user.accessApproved));
                if (!approved) {
                    setError('Dashboard access is pending admin approval.');
                    setLoading(false);
                    return;
                }
                await fetchData(token);
            } catch (fetchError) {
                console.error('Error initializing dashboard:', fetchError);
                setError('Unable to verify account access right now.');
                setLoading(false);
            }
        };

        initialize();
    }, [API_BASE]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 text-sm">Loading Analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-6">
                <div className="glass-card p-8 max-w-xl w-full text-center">
                    <h1 className="text-2xl font-semibold mb-3">Dashboard Unavailable</h1>
                    <p className="text-gray-500 text-sm mb-6">{error}</p>
                    <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Return Home
                    </Link>
                </div>
            </div>
        );
    }

    const normalizeStatus = (status?: string) => String(status || '').trim().toLowerCase().replace(/_/g, ' ');
    const isActionableStatus = (status?: string) => {
        const normalized = normalizeStatus(status);
        return normalized === 'pending' || normalized === 'in process' || normalized === 'under review';
    };
    const titleCase = (value?: string) => {
        const normalized = normalizeStatus(value);
        if (!normalized) return 'Unknown';
        return normalized
            .split(' ')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };
    const parseSourceUrlFromNotes = (notes?: string) => {
        const match = String(notes || '').match(/Source URL:\s*(https?:\/\/\S+)/i);
        return match ? match[1] : '';
    };
    const getPermitSourceUrl = (permit: Permit) => permit.source_url || parseSourceUrlFromNotes(permit.notes);
    const getPermitPayload = (permit: Permit) => {
        if (permit.source_payload) return permit.source_payload;
        const marker = 'Original Payload JSON:';
        const notes = String(permit.notes || '');
        const markerIndex = notes.indexOf(marker);
        if (markerIndex < 0) return null;
        const jsonText = notes.slice(markerIndex + marker.length).trim();
        if (!jsonText) return null;
        try {
            return JSON.parse(jsonText);
        } catch (_error) {
            return jsonText;
        }
    };
    const formatDate = (value?: string) => {
        if (!value) return 'n/a';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString();
    };

    const countryData = Object.entries(permits.reduce((acc, curr) => {
        acc[curr.country] = (acc[curr.country] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const statusData = Object.entries(permits.reduce((acc, curr) => {
        const label = titleCase(curr.status);
        acc[label] = (acc[label] || 0) + 1;
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
        approved: '#22C55E', pending: '#F59E0B', 'in process': '#3B82F6',
        rejected: '#EF4444', 'under review': '#8B5CF6'
    };
    const pendingPermits = [...permits]
        .filter((permit) => isActionableStatus(permit.status))
        .sort((a, b) => {
            const deadlineA = a.consultation_deadline ? new Date(a.consultation_deadline).getTime() : Number.MAX_SAFE_INTEGER;
            const deadlineB = b.consultation_deadline ? new Date(b.consultation_deadline).getTime() : Number.MAX_SAFE_INTEGER;
            if (deadlineA !== deadlineB) return deadlineA - deadlineB;
            const updatedA = new Date(a.updated_at || a.created_at || 0).getTime();
            const updatedB = new Date(b.updated_at || b.created_at || 0).getTime();
            return updatedB - updatedA;
        })
        .slice(0, 18);

    return (
        <div className="min-h-screen bg-black text-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-blue-400" />
                            Global Impact Dashboard
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">{permits.length} permits monitored across {countryData.length} countries</p>
                    </div>
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-slate-900 transition-colors text-sm">
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
                        <div className="text-2xl font-bold">{permits.filter((p) => isActionableStatus(p.status)).length}</div>
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
                                                style={{ backgroundColor: STATUS_COLORS[normalizeStatus(item.name)] || '#6B7280' }}
                                            />
                                            <span className="text-sm">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-20 bg-gray-800 rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: STATUS_COLORS[normalizeStatus(item.name)] || '#6B7280'
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
                                {permits.filter((p) => isActionableStatus(p.status)).length} permits are currently actionable — objections can be filed now.
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

                <div className="glass-card p-6 mb-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Pending Permits: Original Source Data</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Showing actionable permits. Use the button to inspect full source payload from official notices.
                            </p>
                        </div>
                        <span className="text-xs text-gray-500">{pendingPermits.length} shown</span>
                    </div>
                    {pendingPermits.length === 0 ? (
                        <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-800/50 text-sm text-gray-500">
                            No pending permits are currently available in the filtered dataset.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pendingPermits.map((permit, idx) => {
                                const payload = getPermitPayload(permit);
                                const sourceUrl = getPermitSourceUrl(permit);
                                return (
                                    <div key={`${permit.id || permit.project_title}-${idx}`} className="p-4 rounded-lg bg-gray-900/50 border border-gray-800/50">
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium">{permit.project_title}</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {permit.location || permit.country} • Status: {titleCase(permit.status)} • Deadline: {formatDate(permit.consultation_deadline)}
                                                </p>
                                                {permit.external_id && (
                                                    <p className="text-xs text-gray-500 mt-1">Reference: {permit.external_id}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedPermit(permit)}
                                                    className="px-3 py-1.5 rounded-lg text-xs border border-blue-400/40 text-blue-300 hover:bg-blue-500/10 transition-colors"
                                                    disabled={!payload}
                                                >
                                                    View Original Data
                                                </button>
                                                {sourceUrl && (
                                                    <a
                                                        href={sourceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1.5 rounded-lg text-xs border border-gray-700 text-gray-300 hover:bg-gray-800/70 transition-colors"
                                                    >
                                                        Open Source
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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

            {selectedPermit && (
                <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-gray-700 bg-[#0b1118]">
                        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold">Original Permit Source Payload</h3>
                                <p className="text-xs text-gray-400 mt-1">{selectedPermit.project_title}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedPermit(null)}
                                className="px-3 py-1.5 rounded-lg text-xs border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-4 overflow-auto max-h-[78vh]">
                            <pre className="text-xs whitespace-pre-wrap break-words text-gray-200">
                                {JSON.stringify(getPermitPayload(selectedPermit), null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
