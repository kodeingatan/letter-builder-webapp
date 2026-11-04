export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-200/70 print:bg-white">{children}</div>;
}
