export default function ReteteLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="bg-gradient-to-br from-primary-50 to-orange-50 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="h-8 w-48 bg-neutral-200 rounded-lg mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-80 bg-neutral-200 rounded mx-auto animate-pulse" />
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-3 mb-6 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-24 bg-neutral-100 rounded-full animate-pulse shrink-0" />
          ))}
        </div>

        {/* Recipe grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
              <div className="aspect-[16/10] bg-neutral-100 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-neutral-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-neutral-100 rounded animate-pulse w-1/2" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-neutral-100 rounded-full animate-pulse" />
                  <div className="h-6 w-20 bg-neutral-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
