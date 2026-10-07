export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <p className="animate-pulse text-2xl font-semibold tracking-tightest text-coffee-900">AFRA°</p>
      <div className="h-px w-24 overflow-hidden bg-cream-200">
        <div className="h-full w-1/3 animate-loading-bar bg-coffee-800" />
      </div>
    </div>
  );
}
