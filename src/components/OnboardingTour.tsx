'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Step {
    target: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const steps: Step[] = [
    {
        target: '#catalog-section',
        content: '👋 Bine ai venit! Aici găsești cataloagele actualizate săptămânal.',
        position: 'bottom'
    },
    {
        target: '#ai-recipes',
        content: '🤖 AI-ul nostru generează rețete delicioase bazate pe produsele la reducere!',
        position: 'top'
    },
    {
        target: '#smart-cart',
        content: '🛒 Coșul Inteligent compară prețurile automat între magazine pentru a te ajuta să economisesti.',
        position: 'bottom'
    }
];

export default function OnboardingTour() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        // Check if user has seen the tour
        const hasSeenTour = localStorage.getItem('hasSeenOnboarding');
        if (!hasSeenTour) {
            // Small delay to ensure rendering
            setTimeout(() => {
                setIsVisible(true);
            }, 1000);
        }
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        const updatePosition = () => {
            const step = steps[currentStep];
            const element = document.querySelector(step.target);

            if (element) {
                // Scroll to element with smooth behavior
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Get coordinates
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);
            } else {
                // If element not found, skip to next or finish
                handleNext();
            }
        };

        // Update position initially and on resize/scroll
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        };
    }, [currentStep, isVisible]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        localStorage.setItem('hasSeenOnboarding', 'true');
    };

    if (!isVisible || !targetRect) return null;

    // Portal to body to ensure z-index works correctly
    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Dark Overlay with cutout */}
            <div className="absolute inset-0 bg-neutral-900/60 transition-opacity duration-300 pointer-events-auto">
                {/* We use a clip-path or multiple divs to create a "hole" - simplified here using just overlay */}
            </div>

            {/* Highlight Box */}
            <div
                className="absolute transition-all duration-500 ease-in-out border-2 border-white rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
                style={{
                    top: targetRect.top - 8,
                    left: targetRect.left - 8,
                    width: targetRect.width + 16,
                    height: targetRect.height + 16,
                }}
            />

            {/* Tooltip Card */}
            <div
                className="absolute pointer-events-auto transition-all duration-500 ease-in-out"
                style={{
                    top: currentStep === 1
                        ? targetRect.top - 180 // Above for recipes (usually lower on page)
                        : targetRect.bottom + 24, // Below for others
                    left: window.innerWidth < 640
                        ? 16
                        : Math.max(16, targetRect.left + (targetRect.width / 2) - 160),
                    right: window.innerWidth < 640 ? 16 : 'auto',
                    width: window.innerWidth < 640 ? 'auto' : 320,
                }}
            >
                <div className="bg-white rounded-2xl p-5 shadow-2xl animate-fade-in-up border border-neutral-100">
                    <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-bold text-primary-600 uppercase tracking-wider bg-primary-50 px-2 py-1 rounded-lg">
                            Tur Ghidat {currentStep + 1}/{steps.length}
                        </span>
                        <button
                            onClick={handleComplete}
                            className="text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <p className="text-neutral-800 font-medium mb-6 leading-relaxed">
                        {steps[currentStep].content}
                    </p>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleComplete}
                            className="text-sm font-semibold text-neutral-500 hover:text-neutral-700 transition-colors"
                        >
                            Închide
                        </button>
                        <button
                            onClick={handleNext}
                            className="px-6 py-2 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
                        >
                            {currentStep === steps.length - 1 ? 'Gata!' : 'Următorul'}
                        </button>
                    </div>

                    {/* Arrow */}
                    <div
                        className="absolute w-4 h-4 bg-white transform rotate-45 border-l border-t border-neutral-100"
                        style={{
                            top: currentStep === 1 ? 'auto' : -8,
                            bottom: currentStep === 1 ? -8 : 'auto',
                            left: window.innerWidth < 640 ? '50%' : '50%',
                            marginLeft: -8,
                            borderLeft: currentStep === 1 ? 'none' : undefined,
                            borderTop: currentStep === 1 ? 'none' : undefined,
                            borderRight: currentStep === 1 ? '1px solid #e5e5e5' : undefined,
                            borderBottom: currentStep === 1 ? '1px solid #e5e5e5' : undefined,
                        }}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
}
