export function BentoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-5 auto-rows-[100px] md:auto-rows-[120px]">{children}</div>;
}
