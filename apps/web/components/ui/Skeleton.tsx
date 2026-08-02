export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div role="presentation" className={`skeleton rounded-lg ${className}`} />;
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonServiceCard() {
  return (
    <div className="rounded-2xl p-6 md:p-7 border border-border bg-surface/60 flex flex-col items-center">
      <SkeletonBlock className="w-14 h-14 md:w-16 md:h-16 rounded-full mb-5" />
      <SkeletonBlock className="h-6 w-32 mb-3" />
      <SkeletonText lines={1} className="w-full mb-6" />
      <SkeletonBlock className="h-11 w-full rounded-xl" />
    </div>
  );
}
