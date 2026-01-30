export function TableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Table header skeleton */}
      <div className="border rounded-lg">
        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-t-lg flex items-center px-4">
          <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-20 animate-pulse"></div>
          <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-32 ml-8 animate-pulse"></div>
          <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-24 ml-8 animate-pulse"></div>
          <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-16 ml-auto animate-pulse"></div>
        </div>
        
        {/* Table rows skeleton */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 border-t flex items-center px-4 space-x-8">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-20 ml-auto animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}