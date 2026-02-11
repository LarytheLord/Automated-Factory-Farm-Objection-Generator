"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, AlertCircle, CheckCircle, MapPin, FileText, Activity } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function SubmitPermit() {
    const { token, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        project_title: "",
        location: "",
        country: "",
        activity: "",
        category: "Red",
        status: "Pending",
        notes: "",
    });

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isLoading, isAuthenticated, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
            const res = await fetch(`${BACKEND_URL}/api/permits`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit permit");
            }

            setSuccess(true);
            setTimeout(() => router.push("/"), 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) return <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-8 hero-gradient">
            <div className="max-w-2xl mx-auto">
                <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Link>

                <div className="glass-card p-8">
                    <h1 className="text-2xl font-bold mb-2">Submit New Permit</h1>
                    <p className="text-gray-400 mb-8 text-sm">Report a new factory farm project for monitoring.</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl mb-6 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>Permit submitted successfully! Redirecting...</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Project Title</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
                                <input
                                    type="text"
                                    name="project_title"
                                    value={formData.project_title}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="e.g. Mega Dairy Farm Expansion"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Country</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-3 text-gray-500 w-4 h-4">🏳️</div>
                                    <select
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                                        required
                                    >
                                        <option value="">Select Country</option>
                                        <option value="India">India</option>
                                        <option value="USA">USA</option>
                                        <option value="UK">UK</option>
                                        <option value="Australia">Australia</option>
                                        <option value="Canada">Canada</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900/50 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        placeholder="City, Region"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Activity Description</label>
                            <div className="relative">
                                <Activity className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
                                <textarea
                                    name="activity"
                                    value={formData.activity}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[100px]"
                                    placeholder="Describe the facility operations..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="Red">Red (High Risk)</option>
                                    <option value="Orange">Orange (Medium Risk)</option>
                                    <option value="Green">Green (Low Risk)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Initial Status</label>
                                <input
                                    type="text"
                                    value="Pending Review"
                                    disabled
                                    className="w-full bg-gray-900/30 border border-gray-800 rounded-xl py-2.5 px-4 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Submitting Report...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Submit Permit Report
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
