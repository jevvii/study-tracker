export function EmptyState({ message, icon }: { message: string; icon?: string }) {
  return (
    <div className="py-12 text-center">
      {icon && <div className="text-3xl mb-2" aria-hidden="true">{icon}</div>}
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
    </div>
  );
}