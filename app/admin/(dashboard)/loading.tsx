export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded bg-neutral-200" />
      <div className="h-4 w-80 rounded bg-neutral-200" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-28 rounded-xl bg-white border border-neutral-200" />
        <div className="h-28 rounded-xl bg-white border border-neutral-200" />
        <div className="h-28 rounded-xl bg-white border border-neutral-200" />
      </div>
      <div className="h-96 rounded-xl bg-white border border-neutral-200" />
    </div>
  );
}
