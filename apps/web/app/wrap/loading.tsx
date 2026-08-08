import { SkeletonBlock, SkeletonText } from '@/components/ui/Skeleton';

/** Shown while the wrap Server Component resolves the session and cached wrap. */
export default function WrapLoading() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <p className="text-xl font-medium text-gray-400 mb-10" aria-live="polite">
        Aggregating your digital year...
      </p>
      <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/5" aria-busy="true">
        <SkeletonBlock className="h-8 w-2/3 mb-6" />
        <SkeletonText lines={3} />
        <SkeletonBlock className="h-24 w-full mt-6" />
      </div>
    </div>
  );
}
