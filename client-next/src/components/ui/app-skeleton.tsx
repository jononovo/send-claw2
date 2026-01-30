export function AppSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-muted rounded-full" />
          <div className="h-8 w-64 bg-muted rounded" />
        </div>
        <div className="h-14 w-full bg-muted rounded-lg" />
      </div>
    </div>
  );
}
