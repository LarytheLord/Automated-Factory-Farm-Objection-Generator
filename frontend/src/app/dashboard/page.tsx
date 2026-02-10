'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading Analytics...</div>;

    // Process Data for Charts
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

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    const CATEGORY_COLORS: Record<string, string> = { 'Red': '#EF4444', 'Orange': '#F97316', 'Green': '#22C55E', 'Unknown': '#9CA3AF' };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        Global Impact Dashboard
                    </h1>
                    <Link href="/" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                        ← Back to Generator
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Country Distribution */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Permits by Country</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={countryData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
                                    <Bar dataKey="value" fill="#8884d8">
                                        {countryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4">Approval Status</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">Environmental Impact Categories</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" stroke="#9CA3AF" />
                                <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={100} />
                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
                                <Bar dataKey="value">
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#8884d8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
