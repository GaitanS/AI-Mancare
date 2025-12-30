'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface SortOption {
  value: string;
  label: string;
}

interface SortSelectProps {
  options: SortOption[];
  currentSort?: string;
  currentOrder?: string;
  className?: string;
}

export default function SortSelect({
  options,
  currentSort,
  currentOrder,
  className = '',
}: SortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentValue = `${currentSort || options[0]?.value.split('-')[0] || 'created'}-${currentOrder || 'desc'}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [sortBy, sortOrder] = e.target.value.split('-');
    const params = new URLSearchParams(searchParams.toString());

    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.delete('page'); // Reset to page 1 when sorting changes

    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <select
      id="sortBy"
      value={currentValue}
      onChange={handleChange}
      className={`px-2 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-foreground font-body focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all cursor-pointer hover:border-primary-300 ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
