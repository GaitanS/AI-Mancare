'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionStatus, setActionStatus] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/db-stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error('Failed to fetch stats', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRunScript = async (script: string) => {
        setActionStatus(`Starting ${script}...`);

        try {
            const res = await fetch('/api/admin/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script }),
            });

            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                if (res.ok) {
                    setActionStatus(`✅ ${data.message}`);
                    setTimeout(() => setActionStatus(null), 5000);
                } else {
                    setActionStatus(`❌ Error: ${data.error || data.details}`);
                }
            } else {
                const text = await res.text();
                console.error("Non-JSON API response:", text);
                setActionStatus(`❌ Server Error (Check Console)`);
            }
        } catch (e) {
            console.error(e);
            setActionStatus('❌ Network Error');
        }
    };

    const handleClearDb = async () => {
        if (!confirm('⚠️ ESTI SIGUR?\nAsta va sterge TOATE produsele si retetele din baza de date!\nNu exista Undo!')) {
            return;
        }

        setActionStatus('Clearing Database...');
        try {
            const res = await fetch('/api/admin/clear-db', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setActionStatus(`✅ ${data.message}`);
                fetchStats(); // Refresh stats to show zeros
            } else {
                setActionStatus(`❌ Error: ${data.error}`);
            }
        } catch (e) {
            setActionStatus('❌ Network Error');
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                            Admin Control Center
                        </h1>
                        <p className="text-neutral-400 mt-2">Manage AI Agents & Database</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-neutral-500 bg-neutral-900 px-3 py-1 rounded border border-neutral-800">
                            Authenticated Session
                        </div>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <StatCard title="Products" value={stats?.products ?? '...'} icon="📦" color="text-emerald-400" />
                    <StatCard title="Recipes" value={stats?.recipes ?? '...'} icon="🍳" color="text-orange-400" />
                    <StatCard title="Stores" value={stats?.stores ?? '...'} icon="🏪" color="text-blue-400" />
                    <StatCard title="Categories" value={stats?.categories ?? '...'} icon="🏷️" color="text-purple-400" />
                </div>

                {/* Action Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Scraper Agent */}
                    <div className="bg-neutral-900 rounded-2xl border border-white/5 p-6 relative overflow-hidden group hover:border-primary-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-primary-500 select-none -translate-y-2 translate-x-2">
                            AI
                        </div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Scraping Agent
                        </h2>
                        <p className="text-neutral-400 text-sm mb-6 h-12">
                            Crawls Catalog Sites (Lidl, Kaufland, etc.) to extract raw PDF data and offers.
                        </p>
                        <button
                            onClick={() => handleRunScript('scrape')}
                            className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-bold rounded-lg transition-all shadow-lg shadow-primary-900/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            🚀 Run Scraper Now
                        </button>
                    </div>

                    {/* Recipe Generator */}
                    <div className="bg-neutral-900 rounded-2xl border border-white/5 p-6 relative overflow-hidden group hover:border-accent-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-accent-500 select-none -translate-y-2 translate-x-2">
                            GEN
                        </div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                            Recipe Generator
                        </h2>
                        <p className="text-neutral-400 text-sm mb-6 h-12">
                            Uses LLMs (OpenAI/Anthropic) to generate cheap recipes based on current offers.
                        </p>
                        <button
                            onClick={() => handleRunScript('recipes')}
                            className="w-full py-3 bg-gradient-to-r from-accent-600 to-accent-700 hover:from-accent-500 hover:to-accent-600 text-white font-bold rounded-lg transition-all shadow-lg shadow-accent-900/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            ✨ Generate Recipes
                        </button>
                    </div>


                </div>

                {/* Danger Zone */}
                <div className="mt-12 border-t border-red-900/30 pt-8">
                    <h3 className="text-red-500 font-bold mb-4 uppercase text-xs tracking-wider">Danger Zone</h3>
                    <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h4 className="font-bold text-white text-lg">Reset Database</h4>
                            <p className="text-red-400/60 text-sm max-w-md">
                                This action will permanently delete all products and recipes.
                                Useful if you want to restart the scraping process from scratch.
                            </p>
                        </div>
                        <button
                            onClick={handleClearDb}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg shadow-red-900/20 whitespace-nowrap"
                        >
                            ⚠️ Delete Everything
                        </button>
                    </div>
                </div>

                {/* Logs / Status */}
                {actionStatus && (
                    <div className="mt-8 p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-center font-mono text-sm animate-fade-in-up">
                        {actionStatus}
                    </div>
                )}

            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: any) {
    return (
        <div className="bg-neutral-900/50 border border-white/5 p-5 rounded-xl flex items-center gap-4 hover:bg-neutral-900 transition-colors">
            <div className="text-3xl">{icon}</div>
            <div>
                <p className="text-neutral-500 text-xs uppercase font-bold tracking-wider">{title}</p>
                <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            </div>
        </div>
    );
}
