export function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-[var(--text-muted)] py-8 text-center">{message}</p>;
}