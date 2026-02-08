'use client';

import { useState } from 'react';

interface ContactFormProps {
    subjects: string[];
}

export default function ContactForm({ subjects }: ContactFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'A aparut o eroare. Te rugam sa incerci din nou.');
                return;
            }

            setSubmitted(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch {
            setError('Nu s-a putut trimite mesajul. Verifica conexiunea la internet.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    if (submitted) {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">Mesaj trimis!</h3>
                <p className="text-neutral-600 mb-4">Vom răspunde în cel mai scurt timp.</p>
                <button
                    onClick={() => setSubmitted(false)}
                    className="px-4 py-2 text-primary-600 font-semibold hover:underline"
                >
                    Trimite alt mesaj
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                </div>
            )}
            <div>
                <label htmlFor="name" className="block text-sm font-semibold text-neutral-900 mb-1">
                    Nume *
                </label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors"
                    placeholder="Numele tău"
                />
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-semibold text-neutral-900 mb-1">
                    Email *
                </label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors"
                    placeholder="email@exemplu.ro"
                />
            </div>

            <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-neutral-900 mb-1">
                    Subiect *
                </label>
                <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors"
                >
                    <option value="">Alege un subiect</option>
                    {subjects.map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="message" className="block text-sm font-semibold text-neutral-900 mb-1">
                    Mesaj *
                </label>
                <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors resize-none"
                    placeholder="Scrie mesajul tău aici..."
                />
            </div>

            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    id="privacy"
                    required
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5"
                />
                <label htmlFor="privacy" className="text-sm text-foreground/70 font-body">
                    Am citit si sunt de acord cu{' '}
                    <a href="/confidentialitate" className="text-primary-600 hover:text-primary-700">
                        Politica de Confidentialitate
                    </a>
                    . *
                </label>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Se trimite...
                    </>
                ) : (
                    <>
                        Trimite mesajul
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </>
                )}
            </button>
        </form>
    );
}
