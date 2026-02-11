"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Clock, CheckCircle } from "lucide-react";

export default function MyObjections() {
    const { user, token, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [objections, setObjections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isLoading, isAuthenticated, router]);

    useEffect(() => {
        if (token) {
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
            fetch(`${BACKEND_URL}/api/objections`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => {
                    if (res.ok) return res.json();
                    throw new Error("Failed to fetch");
                })
                .then((data) => {
                    if (Array.isArray(data)) setObjections(data);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [token]);

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-8 hero-gradient">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Link>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">My Objections</h1>
                        <p className="text-gray-400">Track the status of your submitted objections.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-400">{objections.length}</div>
                        <div className="text-sm text-gray-500">Total Submitted</div>
                    </div>
                </div>

                <div className="space-y-4">
                    {objections.map((obj) => (
                        <div key={obj.id} className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all flex justify-between items-center group">
                            <div>
                                <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-400 transition-colors">
                                    {obj.project_title}
                                </h3>
                                <p className="text-sm text-gray-400 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                    {obj.country}
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                    {new Date(obj.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${obj.status === 'sent'
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    }`}>
                                    {obj.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                    {obj.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    ))}
                    {objections.length === 0 && (
                        <div className="text-center py-16 text-gray-500 bg-white/5 rounded-xl border border-dashed border-gray-700">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg">No objections submitted yet.</p>
                            <Link href="/#permits" className="inline-block mt-4 text-emerald-400 hover:text-emerald-300">
                                Browse permits to start →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
