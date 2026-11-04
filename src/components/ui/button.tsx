import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary:
    "bg-brand text-white border border-transparent hover:bg-brand-strong active:scale-[0.985] shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
  secondary:
    "bg-warm text-ink border border-line hover:bg-warm-deep active:scale-[0.985]",
  outline:
    "bg-canvas text-ink border border-line-strong hover:bg-warm active:scale-[0.985]",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-warm",
  danger:
    "bg-danger text-white border border-transparent hover:bg-[#a52b23] active:scale-[0.985]",
  link: "bg-transparent text-brand border border-transparent hover:underline underline-offset-2 p-0 h-auto",
} as const;

const SIZES = {
  xs: "h-7 px-2 text-[12px] gap-1.5 rounded-[4px]",
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-[5px]",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-[6px]",
  icon: "h-8 w-8 rounded-[5px]",
  "icon-sm": "h-7 w-7 rounded-[4px]",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,transform,color,box-shadow] duration-100",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});
