import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  children,
  className
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-bark-600">
        {label}
      </span>
      <div className="mt-2">{children}</div>
      {hint ? (
        <span className="mt-1.5 block text-xs leading-relaxed text-bark-600">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function NumberInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      inputMode="numeric"
      className={cn("input-elegant", className)}
      {...props}
    />
  );
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" className={cn("input-elegant", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input-elegant", className)} {...props}>
      {children}
    </select>
  );
}
