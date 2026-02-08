export default function CartLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-40 bg-neutral-200 rounded-lg mb-6 animate-pulse" />

        {/* Cart items skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100 flex gap-4 items-center">
              <div className="w-16 h-16 bg-neutral-100 rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-neutral-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-neutral-100 rounded animate-pulse w-1/3" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-neutral-100 rounded-lg animate-pulse" />
                <div className="h-6 w-8 bg-neutral-100 rounded animate-pulse" />
                <div className="h-8 w-8 bg-neutral-100 rounded-lg animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-neutral-100 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Total skeleton */}
        <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
          <div className="flex justify-between items-center">
            <div className="h-5 w-20 bg-neutral-100 rounded animate-pulse" />
            <div className="h-6 w-24 bg-neutral-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
