import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-[6px] bg-ink font-serif text-[15px] font-semibold leading-none text-white",
        className,
      )}
    >
      A
    </span>
  );
}

export function Brand({
  href = "/app",
  compact,
  subtitle = "Dokumen & Persuratan",
}: {
  href?: string;
  compact?: boolean;
  subtitle?: string;
}) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2">
      <BrandMark className="h-7 w-7 shrink-0" />
      {compact ? null : (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13.5px] font-semibold tracking-[-0.02em] text-ink">
            Aksara
          </span>
          <span className="block truncate text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
            {subtitle}
          </span>
        </span>
      )}
    </Link>
  );
}
