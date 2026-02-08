export default function OferteLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="bg-gradient-to-br from-primary-50 to-orange-50 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="h-8 w-56 bg-neutral-200 rounded-lg mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-72 bg-neutral-200 rounded mx-auto animate-pulse" />
        </div>
      </div>

      {/* Store tabs skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-28 bg-neutral-100 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Search bar skeleton */}
        <div className="h-12 bg-neutral-100 rounded-xl animate-pulse mb-6" />

        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
              <div className="aspect-square bg-neutral-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-neutral-100 rounded animate-pulse w-full" />
                <div className="h-4 bg-neutral-100 rounded animate-pulse w-2/3" />
                <div className="flex justify-between items-center">
                  <div className="h-5 w-16 bg-neutral-100 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-neutral-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
