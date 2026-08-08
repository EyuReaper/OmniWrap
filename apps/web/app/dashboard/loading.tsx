import { SkeletonServiceCard, SkeletonBlock } from '@/components/ui/Skeleton';

/**
 * Shown while the dashboard Server Component resolves the session and every
 * connection status. Replaces the old client-side `connectionsLoading` state —
 * the skeleton now appears before any JS runs rather than after hydration.
 */
export default function DashboardLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col items-center p-6 md:p-10">
      <div
        className="absolute inset-0 bg-gradient-to-br from-transparent via-indigo-950/5 to-purple-950/5 dark:via-indigo-950/10 dark:to-purple-950/5"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center flex-1 w-full" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading your dashboard…</span>

        <div className="flex flex-col items-center gap-4 text-center mb-10 md:mb-16 mt-6 md:mt-10">
          <SkeletonBlock className="h-12 md:h-16 w-64 md:w-96" />
          <SkeletonBlock className="h-5 w-48" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 w-full max-w-7xl">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonServiceCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
