'use client';

import { useState, useEffect, useCallback } from 'react';

// Schedule type
interface Schedule {
    id: string;
    taskName: string;
    enabled: boolean;
    dayOfWeek: number;
    hour: number;
    minute: number;
    lastRun?: string;
    lastError?: string;
}

const DAYS = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
const TASK_INFO: Record<string, { icon: string; name: string; description: string }> = {
    scraper: { icon: '🕷️', name: 'Catalog Scraper', description: 'Descarcă cataloage de la supermarketuri' },
    recipes: { icon: '🍳', name: 'Recipe Generator', description: 'Generează rețete AI din oferte' },
    images: { icon: '🖼️', name: 'Image Generator', description: 'Creează imagini pentru rețete' },
};

export default function AdminPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionStatus, setActionStatus] = useState<string | null>(null);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [savingSchedule, setSavingSchedule] = useState<string | null>(null);
    const [scraperStatus, setScraperStatus] = useState<{
        running: boolean;
        current?: number;
        total?: number;
        currentStore?: string | null;
        message?: string;
        complete?: boolean;
    } | null>(null);
    const [recipeStatus, setRecipeStatus] = useState<{
        running: boolean;
        current?: number;
        total?: number;
        message?: string;
        complete?: boolean;
        generatedCount?: number;
    } | null>(null);

    useEffect(() => {
        fetchStats();
        fetchSchedules();
        fetchScraperStatus();
        fetchRecipeStatus();
    }, []);

    // Poll statuses when running
    useEffect(() => {
        if (!scraperStatus?.running && !recipeStatus?.running) return;

        const interval = setInterval(() => {
            if (scraperStatus?.running) fetchScraperStatus();
            if (recipeStatus?.running) fetchRecipeStatus();
        }, 2000);

        return () => clearInterval(interval);
    }, [scraperStatus?.running, recipeStatus?.running]);

    const fetchScraperStatus = async () => {
        try {
            const res = await fetch('/api/admin/scraper-status');
            if (res.ok) {
                const data = await res.json();
                setScraperStatus(data);
                if (data.complete && !data.running) {
                    fetchStats(); // Refresh stats after completion
                }
            }
        } catch (e) {
            console.error('Failed to fetch scraper status', e);
        }
    };

    const fetchRecipeStatus = async () => {
        try {
            const res = await fetch('/api/admin/recipe-status');
            if (res.ok) {
                const data = await res.json();
                setRecipeStatus(data);
                if (data.complete && !data.running) {
                    fetchStats(); // Refresh stats after completion
                }
            }
        } catch (e) {
            console.error('Failed to fetch recipe status', e);
        }
    };

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

    const fetchSchedules = async () => {
        try {
            const res = await fetch('/api/admin/schedules');
            if (res.ok) {
                const data = await res.json();
                setSchedules(data.schedules || []);
            }
        } catch (e) {
            console.error('Failed to fetch schedules', e);
        }
    };

    const updateSchedule = useCallback(async (taskName: string, updates: Partial<Schedule>) => {
        setSavingSchedule(taskName);
        try {
            const res = await fetch('/api/admin/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskName, ...updates }),
            });
            if (res.ok) {
                setSchedules(prev => prev.map(s =>
                    s.taskName === taskName ? { ...s, ...updates } : s
                ));
                setActionStatus(`✅ ${TASK_INFO[taskName]?.name || taskName} actualizat!`);
                setTimeout(() => setActionStatus(null), 3000);
            }
        } catch (e) {
            console.error('Failed to update schedule', e);
            setActionStatus('❌ Eroare la salvare');
        } finally {
            setSavingSchedule(null);
        }
    }, []);

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
                    setActionStatus(`❌ Error: ${data.error || data.details || data.message}`);
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
                fetchStats();
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
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-primary-500 select-none -translate-y-2 translate-x-2">SCAN</div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${scraperStatus?.running ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></span>
                            Agent Catalog
                        </h2>
                        <p className="text-neutral-400 text-sm mb-4">
                            Scanează Kimbino.ro pentru cataloage noi de la Lidl, Kaufland, Penny, Profi, Carrefour, Mega Image, Auchan și Selgros.
                        </p>

                        {/* Progress Bar */}
                        {scraperStatus?.running && (
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-neutral-400 mb-1">
                                    <span>{scraperStatus.message || 'Procesăm...'}</span>
                                    <span>{scraperStatus.current || 0}/{scraperStatus.total || 8}</span>
                                </div>
                                <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${((scraperStatus.current || 0) / (scraperStatus.total || 8)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Completion Message */}
                        {scraperStatus?.complete && !scraperStatus?.running && (
                            <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                                ✅ {scraperStatus.message}
                            </div>
                        )}

                        <button
                            onClick={() => { handleRunScript('scrape'); fetchScraperStatus(); }}
                            disabled={scraperStatus?.running}
                            className={`w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-primary-900/20 flex items-center justify-center gap-2 ${scraperStatus?.running
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:from-primary-500 hover:to-primary-600 active:scale-95'
                                }`}
                        >
                            {scraperStatus?.running ? '⏳ Se rulează...' : '🚀 Pornește Scanarea'}
                        </button>
                    </div>

                    {/* Recipe Generator */}
                    <div className="bg-neutral-900 rounded-2xl border border-white/5 p-6 relative overflow-hidden group hover:border-accent-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-accent-500 select-none -translate-y-2 translate-x-2">AI</div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${recipeStatus?.running ? 'bg-amber-500' : 'bg-purple-500'} animate-pulse`}></span>
                            Generator Rețete
                        </h2>
                        <p className="text-neutral-400 text-sm mb-4">
                            Folosește AI (Gemini/OpenRouter) pentru a crea rețete economice bazate pe ofertele curente din cataloage.
                        </p>

                        {/* Progress Bar */}
                        {recipeStatus?.running && (
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-neutral-400 mb-1">
                                    <span>{recipeStatus.message || 'Generăm...'}</span>
                                    <span>{recipeStatus.current || 0}/{recipeStatus.total || 0}</span>
                                </div>
                                <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${((recipeStatus.current || 0) / (recipeStatus.total || 10)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Completion Message */}
                        {recipeStatus?.complete && !recipeStatus?.running && (
                            <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                                ✅ {recipeStatus.message}
                            </div>
                        )}

                        <button
                            onClick={() => { handleRunScript('recipes'); fetchRecipeStatus(); }}
                            disabled={recipeStatus?.running}
                            className={`w-full py-3 bg-gradient-to-r from-accent-600 to-accent-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-accent-900/20 flex items-center justify-center gap-2 ${recipeStatus?.running
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:from-accent-500 hover:to-accent-600 active:scale-95'
                                }`}
                        >
                            {recipeStatus?.running ? '✨ Se generează...' : '✨ Generează Rețete'}
                        </button>
                    </div>
                </div>

                {/* Automated Schedules Section - INTERACTIVE */}
                <div className="mt-12 border-t border-white/10 pt-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-2xl">⏰</span>
                                Automated Schedules
                            </h3>
                            <p className="text-neutral-400 text-sm mt-1">
                                Configurează când rulează automat fiecare task
                            </p>
                        </div>
                        <a
                            href="https://github.com/GaitanS/AI-Mancare/actions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                            GitHub Actions
                        </a>
                    </div>

                    <div className="space-y-4">
                        {schedules.length === 0 ? (
                            <div className="text-center py-8 text-neutral-500">
                                Se încarcă schedule-urile...
                            </div>
                        ) : (
                            schedules.map((schedule) => (
                                <InteractiveScheduleCard
                                    key={schedule.taskName}
                                    schedule={schedule}
                                    info={TASK_INFO[schedule.taskName] || { icon: '📋', name: schedule.taskName, description: '' }}
                                    onUpdate={(updates) => updateSchedule(schedule.taskName, updates)}
                                    saving={savingSchedule === schedule.taskName}
                                />
                            ))
                        )}
                    </div>

                    <div className="mt-4 p-4 bg-blue-950/20 border border-blue-900/30 rounded-xl">
                        <p className="text-blue-400 text-sm">
                            💡 <strong>Sfat:</strong> Modificările se salvează automat. GitHub Actions va folosi aceste setări la următorul run.
                        </p>
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

function InteractiveScheduleCard({ schedule, info, onUpdate, saving }: {
    schedule: Schedule;
    info: { icon: string; name: string; description: string };
    onUpdate: (updates: Partial<Schedule>) => void;
    saving: boolean;
}) {
    return (
        <div className={`bg-neutral-900 rounded-xl border p-4 transition-all ${schedule.enabled
            ? 'border-emerald-500/20 hover:border-emerald-500/40'
            : 'border-neutral-800'
            }`}>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Icon & Name */}
                <div className="flex items-center gap-3 md:w-48">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                        <span className="font-bold text-white text-sm">{info.name}</span>
                        <p className="text-neutral-500 text-xs">{info.description}</p>
                    </div>
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onUpdate({ enabled: !schedule.enabled })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${schedule.enabled ? 'bg-emerald-500' : 'bg-neutral-700'
                            }`}
                        disabled={saving}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${schedule.enabled ? 'translate-x-6' : ''
                            }`} />
                    </button>
                    <span className={`text-xs font-medium ${schedule.enabled ? 'text-emerald-400' : 'text-neutral-500'}`}>
                        {schedule.enabled ? 'Activ' : 'Inactiv'}
                    </span>
                </div>

                {/* Day Selector */}
                <div className="flex items-center gap-2">
                    <label className="text-neutral-500 text-xs">Zi:</label>
                    <select
                        value={schedule.dayOfWeek}
                        onChange={(e) => onUpdate({ dayOfWeek: parseInt(e.target.value) })}
                        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500"
                        disabled={saving || !schedule.enabled}
                    >
                        {DAYS.map((day, i) => (
                            <option key={i} value={i}>{day}</option>
                        ))}
                    </select>
                </div>

                {/* Hour Selector */}
                <div className="flex items-center gap-2">
                    <label className="text-neutral-500 text-xs">Ora:</label>
                    <select
                        value={schedule.hour}
                        onChange={(e) => onUpdate({ hour: parseInt(e.target.value) })}
                        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500 w-16"
                        disabled={saving || !schedule.enabled}
                    >
                        {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                        ))}
                    </select>
                </div>

                {/* Saving indicator */}
                {saving && (
                    <span className="text-xs text-amber-400 animate-pulse">Salvare...</span>
                )}
            </div>
        </div>
    );
}
