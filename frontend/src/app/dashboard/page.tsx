'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';

interface Permit {
    country: string;
    category?: string;
    status: string;
    project_title: string;
}

export default function Dashboard() {
    const [permits, setPermits] = useState<Permit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPermits = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/permits`);
                if (response.ok) {
                    const data = await response.json();
                    setPermits(data);
                }
            } catch (error) {
                console.error('Error fetching permits:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPermits();
    }, []);

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
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const statusData = Object.entries(permits.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const categoryData = Object.entries(permits.reduce((acc, curr) => {
        const cat = curr.category || 'Unknown';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

    const maxCountry = Math.max(...countryData.map(d => d.value));
    const maxCategory = Math.max(...categoryData.map(d => d.value));
    const totalStatus = statusData.reduce((sum, d) => sum + d.value, 0);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const CATEGORY_COLORS: Record<string, string> = { 'Red': '#EF4444', 'Orange': '#F97316', 'Green': '#22C55E', 'Unknown': '#6B7280' };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-blue-400" />
                            Global Impact Dashboard
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">{permits.length} permits monitored worldwide</p>
                    </div>
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Country Distribution - Horizontal Bar Chart */}
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

                    {/* Status Distribution - Donut-style */}
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold mb-6">Approval Status</h2>
                        <div className="space-y-3">
                            {statusData.map((item, idx) => {
                                const percentage = ((item.value / totalStatus) * 100).toFixed(0);
                                return (
                                    <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                            />
                                            <span className="text-sm">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">{percentage}%</span>
                                            <span className="text-sm font-semibold">{item.value}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Category Breakdown - Horizontal bars */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold mb-6">Environmental Impact Categories</h2>
                    <div className="space-y-4">
                        {categoryData.map((item) => (
                            <div key={item.name}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm text-gray-300">{item.name} Category</span>
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
            </div>
        </div>
    );
}
