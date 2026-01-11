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
    catalogs: { icon: '📚', name: 'Catalog Scraper', description: 'Descarcă imagini de catalog de la cataloagedeoferte.ro' },
    products: { icon: '📦', name: 'Product Extractor', description: 'Extrage produse din cataloage folosind AI (Gemini Vision)' },
    recipes: { icon: '🍳', name: 'Recipe Generator', description: 'Generează rețete AI din oferte' },
    images: { icon: '🖼️', name: 'Image Generator', description: 'Creează imagini pentru rețete' },
};

export default function AdminPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionStatus, setActionStatus] = useState<string | null>(null);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [savingSchedule, setSavingSchedule] = useState<string | null>(null);

    useEffect(() => {
        fetchStats();
        fetchSchedules();
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

    const handleKillScript = async (script: string) => {
        setActionStatus(`Stopping ${script}...`);
        try {
            const res = await fetch('/api/admin/kill-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script }),
            });
            const data = await res.json();
            if (res.ok) {
                setActionStatus(`✅ Stopped: ${script}`);
            } else {
                setActionStatus(`❌ Failed: ${data.message || data.error}`);
            }
        } catch (e: any) {
            setActionStatus(`❌ Error: ${e.message}`);
        } finally {
            setTimeout(() => setActionStatus(null), 3000);
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

                {/* Action Panel - 2x2 Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Catalog Scraper - Downloads catalog images */}
                    <CatalogScraperSection onRunScript={handleRunScript} onKillScript={handleKillScript} />

                    {/* Product Extractor - Extracts products using AI/OCR */}
                    <ProductExtractorSection onRunScript={handleRunScript} onKillScript={handleKillScript} />

                    {/* Recipe Generator */}
                    <RecipeGeneratorSection onRunScript={handleRunScript} onKillScript={handleKillScript} />

                    {/* Image Generator */}
                    <ImageGeneratorSection onRunScript={handleRunScript} onKillScript={handleKillScript} />
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

// Catalog Scraper Section with Status Display
interface CatalogScraperSectionProps {
    onRunScript: (script: string) => void;
    onKillScript: (script: string) => void;
}

interface CatalogStatus {
    running: boolean;
    startedAt: string | null;
    completedAt: string | null;
    totalCatalogs: number;
    totalPages: number;
    totalStores: number;
    processedStores: number;
    currentStore: string | null;
    currentCatalog: string | null;
    error: string | null;
    stores: Record<string, { success: boolean; catalogs: number; pages: number; error: string | null }>;
}

function CatalogScraperSection({ onRunScript, onKillScript }: CatalogScraperSectionProps) {
    const [status, setStatus] = useState<CatalogStatus | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/admin/catalog-status');
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.status) {
                    setStatus(data.status);
                    setIsPolling(data.status.running);
                }
            }
        } catch (e) {
            console.error('Failed to fetch catalog status', e);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    useEffect(() => {
        if (!isPolling) return;
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, [isPolling]);

    const handleStart = () => {
        onRunScript('catalogs');
        setIsPolling(true);
        setTimeout(fetchStatus, 2000);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('ro-RO');
    };

    return (
        <div className="bg-neutral-900 rounded-2xl border border-white/5 p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-blue-500 select-none -translate-y-2 translate-x-2">📚</div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.running ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`}></span>
                Catalog Scraper (Imagini)
            </h2>
            <p className="text-neutral-400 text-sm mb-4">
                Descarcă cataloagele de pe cataloagedeoferte.ro și le salvează local. Nu mai face redirect!
            </p>

            {/* Running Status with Progress Bar */}
            {status?.running && (
                <div className="mb-4 p-3 bg-amber-950/30 border border-amber-500/20 rounded-lg">
                    <div className="flex justify-between text-xs text-neutral-400 mb-2">
                        <span className="text-amber-400 truncate flex items-center gap-2">
                            <span className="animate-spin">⏳</span>
                            {status.currentCatalog || status.currentStore || 'Se descarcă cataloage...'}
                        </span>
                        <span>{status.processedStores || 0}/{status.totalStores || 9}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${status.totalStores > 0 ? ((status.processedStores || 0) / status.totalStores) * 100 : 0}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-neutral-500">
                        <span>Cataloage: {status.totalCatalogs} | Pagini: {status.totalPages}</span>
                        <span>Magazin: {status.currentStore || '-'}</span>
                    </div>
                </div>
            )}

            {/* Completed Status with Store Results */}
            {status && !status.running && status.completedAt && (
                <div className="mb-4 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-emerald-400 font-semibold">✅ Ultima rulare completă</span>
                        <span className="text-xs text-neutral-500">{formatDate(status.completedAt)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-neutral-900 rounded p-2 text-center">
                            <div className="text-2xl font-bold text-blue-400">{status.totalCatalogs}</div>
                            <div className="text-xs text-neutral-500">Cataloage</div>
                        </div>
                        <div className="bg-neutral-900 rounded p-2 text-center">
                            <div className="text-2xl font-bold text-blue-400">{status.totalPages}</div>
                            <div className="text-xs text-neutral-500">Pagini</div>
                        </div>
                    </div>
                    <div className="text-xs text-neutral-400 mb-2">Magazine:</div>
                    <div className="grid grid-cols-3 gap-1">
                        {Object.entries(status.stores).map(([name, data]) => (
                            <div key={name} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${data.success ? 'bg-emerald-950/50 text-emerald-400' : 'bg-red-950/50 text-red-400'}`}>
                                <span>{data.success ? '✅' : '❌'}</span>
                                <span className="truncate">{name}</span>
                                <span className="text-neutral-500">({data.catalogs})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {status?.running && (
                <button
                    onClick={() => onKillScript ? onKillScript('catalogs') : {}}
                    className="w-full py-2 mb-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg transition-all hover:from-red-500 hover:to-red-600 active:scale-95 flex items-center justify-center gap-2"
                >
                    🛑 Oprește Scraping (Kill)
                </button>
            )}
            <button
                onClick={handleStart}
                disabled={status?.running}
                className={`w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 ${status?.running
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-blue-500 hover:to-blue-600 active:scale-95'
                    }`}
            >
                {status?.running ? '⏳ Se rulează...' : '📚 Actualizează Cataloage'}
            </button>
            <p className="text-neutral-500 text-xs mt-2 text-center">
                ~10-15 minute pentru toate magazinele
            </p>
        </div>
    );
}

// Product Extractor Section with Status Display
interface ProductExtractorStatus {
    running: boolean;
    startedAt: string | null;
    completedAt: string | null;
    totalCatalogs: number;
    processedCatalogs: number;
    totalPages: number;
    totalProducts: number;
    currentStore: string | null;
    currentCatalog: string | null;
    error: string | null;
    stores: Record<string, { success: boolean; catalogs: number; products: number; error: string | null }>;
}

function ProductExtractorSection({ onRunScript, onKillScript }: CatalogScraperSectionProps) {
    const [status, setStatus] = useState<ProductExtractorStatus | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/admin/product-status');
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.status) {
                    setStatus(data.status);
                    setIsPolling(data.status.running);
                }
            }
        } catch (e) {
            console.error('Failed to fetch product extractor status', e);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    useEffect(() => {
        if (!isPolling) return;
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, [isPolling]);

    const handleStart = () => {
        onRunScript('products');
        setIsPolling(true);
        setTimeout(fetchStatus, 2000);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('ro-RO');
    };

    return (
        <div className="bg-neutral-900 rounded-2xl border border-white/5 p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-emerald-500 select-none -translate-y-2 translate-x-2">📦</div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.running ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                Product Extractor (AI/OCR)
            </h2>
            <p className="text-neutral-400 text-sm mb-4">
                Extrage produsele din imaginile de catalog folosind Gemini Vision AI. Procesează numai cataloage NOI.
            </p>

            {/* Running Status */}
            {status?.running && (
                <div className="mb-4 p-3 bg-amber-950/30 border border-amber-500/20 rounded-lg">
                    <div className="flex justify-between text-xs text-neutral-400 mb-2">
                        <span className="text-amber-400 truncate flex items-center gap-2">
                            <span className="animate-spin">⏳</span>
                            {status.currentCatalog || status.currentStore || 'Se extrag produse...'}
                        </span>
                        <span>{status.processedCatalogs || 0}/{status.totalCatalogs || 0}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${status.totalCatalogs > 0 ? ((status.processedCatalogs || 0) / status.totalCatalogs) * 100 : 0}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-neutral-500">
                        <span>Produse: {status.totalProducts}</span>
                        <span>Magazin: {status.currentStore || '-'}</span>
                    </div>
                </div>
            )}

            {/* Completed Status with Store Results */}
            {status && !status.running && status.completedAt && (
                <div className="mb-4 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-emerald-400 font-semibold">✅ Ultima extragere completă</span>
                        <span className="text-xs text-neutral-500">{formatDate(status.completedAt)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-neutral-900 rounded p-2 text-center">
                            <div className="text-2xl font-bold text-emerald-400">{status.totalCatalogs}</div>
                            <div className="text-xs text-neutral-500">Cataloage</div>
                        </div>
                        <div className="bg-neutral-900 rounded p-2 text-center">
                            <div className="text-2xl font-bold text-emerald-400">{status.totalPages}</div>
                            <div className="text-xs text-neutral-500">Pagini</div>
                        </div>
                        <div className="bg-neutral-900 rounded p-2 text-center">
                            <div className="text-2xl font-bold text-emerald-400">{status.totalProducts}</div>
                            <div className="text-xs text-neutral-500">Produse</div>
                        </div>
                    </div>
                    <div className="text-xs text-neutral-400 mb-2">Magazine:</div>
                    <div className="grid grid-cols-3 gap-1">
                        {Object.entries(status.stores).map(([name, data]) => (
                            <div key={name} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${data.success ? 'bg-emerald-950/50 text-emerald-400' : 'bg-red-950/50 text-red-400'}`}>
                                <span>{data.success ? '✅' : '❌'}</span>
                                <span className="truncate">{name}</span>
                                <span className="text-neutral-500">({data.products})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {status?.running && (
                <button
                    onClick={() => onKillScript ? onKillScript('products') : {}}
                    className="w-full py-2 mb-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg transition-all hover:from-red-500 hover:to-red-600 active:scale-95 flex items-center justify-center gap-2"
                >
                    🛑 Oprește Extragerea (Kill)
                </button>
            )}
            <button
                onClick={handleStart}
                disabled={status?.running}
                className={`w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 ${status?.running
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-emerald-500 hover:to-emerald-600 active:scale-95'
                    }`}
            >
                {status?.running ? '⏳ Se extrag produse...' : '📦 Extrage Produse din Cataloage'}
            </button>
            <p className="text-neutral-500 text-xs mt-2 text-center">
                Rulează după Catalog Scraper. ~2 sec/pagină (API calls)
            </p>
        </div>
    );
}

// Recipe Generator Section with Status Display
interface RecipeStatus {
    running: boolean;
    current: number;
    total: number;
    message: string;
    complete: boolean;
    generatedCount: number;
    error: string | null;
}

function RecipeGeneratorSection({ onRunScript, onKillScript }: CatalogScraperSectionProps) {
    const [status, setStatus] = useState<RecipeStatus | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/admin/recipe-status');
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
                setIsPolling(data.running);
            }
        } catch (e) {
            console.error('Failed to fetch recipe status', e);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    useEffect(() => {
        if (!isPolling) return;
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [isPolling]);

    const handleStart = () => {
        onRunScript('recipes');
        setIsPolling(true);
        setTimeout(fetchStatus, 2000);
    };

    return (
        <div className="bg-neutral-900 rounded-2xl border border-white/5 p-6 relative overflow-hidden group hover:border-accent-500/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-accent-500 select-none -translate-y-2 translate-x-2">🍳</div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.running ? 'bg-amber-500 animate-pulse' : 'bg-purple-500'}`}></span>
                Generator Rețete (AI)
            </h2>
            <p className="text-neutral-400 text-sm mb-4">
                Folosește AI (Gemini) pentru a crea rețete tehnice și detaliate bazate pe produsele cu reducere.
            </p>

            {/* Running Status with Progress */}
            {status?.running && (
                <div className="mb-4 p-3 bg-amber-950/30 border border-amber-500/20 rounded-lg">
                    <div className="flex justify-between text-xs text-neutral-400 mb-2">
                        <span className="text-amber-400 truncate flex items-center gap-2">
                            <span className="animate-spin">⏳</span>
                            {status.message || 'Se generează rețete...'}
                        </span>
                        <span>{status.current || 0}/{status.total || 10}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${((status.current || 0) / (status.total || 10)) * 100}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-neutral-500">
                        <span>Rețete generate: {status.generatedCount || 0}</span>
                    </div>
                </div>
            )}

            {/* Completed Status */}
            {status && !status.running && status.complete && (
                <div className="mb-4 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                        <span>✅ Generare completă!</span>
                    </div>
                    <div className="text-sm text-neutral-400">
                        {status.message}
                    </div>
                    {status.generatedCount > 0 && (
                        <div className="mt-2 bg-neutral-900 rounded p-2 text-center">
                            <div className="text-2xl font-bold text-accent-400">{status.generatedCount}</div>
                            <div className="text-xs text-neutral-500">Rețete generate</div>
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {status?.error && (
                <div className="mb-4 p-3 bg-red-950/30 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    ❌ {status.error}
                </div>
            )}

            {status?.running && (
                <button
                    onClick={() => onKillScript ? onKillScript('recipes') : {}}
                    className="w-full py-2 mb-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg transition-all hover:from-red-500 hover:to-red-600 active:scale-95 flex items-center justify-center gap-2"
                >
                    🛑 Oprește Generarea (Kill)
                </button>
            )}

            <button
                onClick={handleStart}
                disabled={status?.running}
                className={`w-full py-3 bg-gradient-to-r from-accent-600 to-accent-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-accent-900/20 flex items-center justify-center gap-2 ${status?.running
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-accent-500 hover:to-accent-600 active:scale-95'
                    }`}
            >
                {status?.running ? '✨ Se generează...' : '✨ Generează Rețete'}
            </button>
            <p className="text-neutral-500 text-xs mt-2 text-center">
                ~2 minute pentru 10 rețete (API calls)
            </p>
        </div>
    );
}

// Image Generator Section with Status Display
interface ImageStatus {
    running: boolean;
    current: number;
    total: number;
    message: string;
    complete: boolean;
    generatedCount: number;
    error: string | null;
    currentRecipe: string | null;
}

function ImageGeneratorSection({ onRunScript, onKillScript }: CatalogScraperSectionProps) {
    const [status, setStatus] = useState<ImageStatus | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/admin/image-status');
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
                setIsPolling(data.running);
            }
        } catch (e) {
            console.error('Failed to fetch image status', e);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    useEffect(() => {
        if (!isPolling) return;
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, [isPolling]);

    const handleStart = () => {
        onRunScript('images');
        setIsPolling(true);
        setTimeout(fetchStatus, 2000);
    };

    return (
        <div className="bg-neutral-900 rounded-2xl border border-white/5 p-6 relative overflow-hidden group hover:border-pink-500/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-pink-500 select-none -translate-y-2 translate-x-2">🖼️</div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${status?.running ? 'bg-amber-500 animate-pulse' : 'bg-pink-500'}`}></span>
                Generator Imagini (AI)
            </h2>
            <p className="text-neutral-400 text-sm mb-4">
                Generează imagini food photography pentru rețetele care nu au poze folosind Gemini Image.
            </p>

            {/* Running Status with Progress */}
            {status?.running && (
                <div className="mb-4 p-3 bg-amber-950/30 border border-amber-500/20 rounded-lg">
                    <div className="flex justify-between text-xs text-neutral-400 mb-2">
                        <span className="text-amber-400 truncate flex items-center gap-2">
                            <span className="animate-spin">⏳</span>
                            {status.currentRecipe || status.message || 'Se generează imagini...'}
                        </span>
                        <span>{status.current || 0}/{status.total || 5}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${((status.current || 0) / (status.total || 5)) * 100}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-neutral-500">
                        <span>Imagini generate: {status.generatedCount || 0}</span>
                    </div>
                </div>
            )}

            {/* Completed Status */}
            {status && !status.running && status.complete && (
                <div className="mb-4 p-4 bg-neutral-800/50 border border-neutral-700 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                        <span>✅ Generare completă!</span>
                    </div>
                    <div className="text-sm text-neutral-400">
                        {status.message}
                    </div>
                    {status.generatedCount > 0 && (
                        <div className="mt-2 bg-neutral-900 rounded p-2 text-center">
                            <div className="text-2xl font-bold text-pink-400">{status.generatedCount}</div>
                            <div className="text-xs text-neutral-500">Imagini generate</div>
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {status?.error && (
                <div className="mb-4 p-3 bg-red-950/30 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    ❌ {status.error}
                </div>
            )}

            {status?.running && (
                <button
                    onClick={() => onKillScript ? onKillScript('images') : {}}
                    className="w-full py-2 mb-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg transition-all hover:from-red-500 hover:to-red-600 active:scale-95 flex items-center justify-center gap-2"
                >
                    🛑 Oprește Generarea (Kill)
                </button>
            )}

            <button
                onClick={handleStart}
                disabled={status?.running}
                className={`w-full py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2 ${status?.running
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-pink-500 hover:to-pink-600 active:scale-95'
                    }`}
            >
                {status?.running ? '🖼️ Se generează...' : '🖼️ Generează Imagini'}
            </button>
            <p className="text-neutral-500 text-xs mt-2 text-center">
                ~10 sec/imagine (API calls)
            </p>
        </div>
    );
}

