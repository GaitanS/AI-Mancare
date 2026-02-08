export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search bar skeleton */}
        <div className="h-12 bg-neutral-100 rounded-xl animate-pulse mb-8 max-w-2xl mx-auto" />

        {/* Results grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
              <div className="aspect-square bg-neutral-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-neutral-100 rounded animate-pulse" />
                <div className="h-4 bg-neutral-100 rounded animate-pulse w-2/3" />
                <div className="h-5 w-16 bg-neutral-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
