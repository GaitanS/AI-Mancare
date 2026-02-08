export default function PlanLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="bg-gradient-to-br from-primary-50 to-orange-50 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="h-8 w-52 bg-neutral-200 rounded-lg mx-auto mb-3 animate-pulse" />
          <div className="h-4 w-64 bg-neutral-200 rounded mx-auto animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats bar skeleton */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
              <div className="h-4 w-20 bg-neutral-100 rounded animate-pulse mb-2" />
              <div className="h-6 w-12 bg-neutral-100 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Day columns skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
              <div className="h-5 w-24 bg-neutral-100 rounded animate-pulse mb-4" />
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex gap-3 mb-3">
                  <div className="w-16 h-16 bg-neutral-100 rounded-lg animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-neutral-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
