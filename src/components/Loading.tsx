'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'primary' | 'white';
}

export function LoadingSpinner({ size = 'md', className, variant = 'default' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };

  const variantClasses = {
    default: 'border-neutral-200 border-t-primary-500',
    primary: 'border-primary-200 border-t-primary-600',
    white: 'border-white/30 border-t-white',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full',
          sizeClasses[size],
          variantClasses[variant]
        )}
        role="status"
        aria-label="Se incarca..."
      >
        <span className="sr-only">Se incarca...</span>
      </div>
    </div>
  );
}

// Premium branded loading spinner with logo
export function LoadingBranded({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      {/* Logo with pulse animation */}
      <div className="relative">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 animate-pulse-glow">
          <svg
            className="w-9 h-9 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        {/* Rotating ring */}
        <div className="absolute inset-0 -m-1">
          <div className="w-[72px] h-[72px] border-2 border-transparent border-t-primary-400 rounded-full animate-spin" />
        </div>
      </div>
      {/* Loading dots */}
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

interface LoadingPageProps {
  message?: string;
  showBranded?: boolean;
}

export function LoadingPage({ message = 'Se incarca bunatatile...', showBranded = true }: LoadingPageProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      {showBranded ? (
        <LoadingBranded className="mb-6" />
      ) : (
        <LoadingSpinner size="lg" variant="primary" className="mb-6" />
      )}
      <p className="text-neutral-600 font-medium animate-pulse">{message}</p>
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  blur?: boolean;
}

export function LoadingOverlay({ isLoading, children, blur = true }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center z-10 transition-all duration-300',
            blur ? 'bg-white/60 backdrop-blur-sm' : 'bg-white/80'
          )}
        >
          <LoadingBranded />
        </div>
      )}
    </div>
  );
}

// Skeleton components for loading states
interface SkeletonProps {
  className?: string;
  shimmer?: boolean;
}

export function Skeleton({ className, shimmer = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg',
        shimmer ? 'skeleton-shimmer' : 'skeleton',
        className
      )}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-4 space-y-4', className)}>
      <Skeleton className="w-full aspect-product" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

export function SkeletonRecipeCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-4 space-y-4', className)}>
      <Skeleton className="w-full aspect-recipe rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export default LoadingSpinner;
