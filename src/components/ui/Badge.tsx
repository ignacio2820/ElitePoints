import { cn } from "@/lib/utils";

const styles = {
  saludable: "bg-sage-100 text-sage-300 ring-sage-200",
  ajustado: "bg-cream-100 text-bark-500 ring-bark-200",
  peligroso: "bg-terracotta-50 text-terracotta-500 ring-terracotta-200",
  neutral: "bg-cream-100 text-bark-500 ring-bark-100"
} as const;

export function Badge({
  tone = "neutral",
  className,
  children
}: {
  tone?: keyof typeof styles;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1",
        styles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
