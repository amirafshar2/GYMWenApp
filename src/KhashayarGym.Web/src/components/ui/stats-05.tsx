import { FastForward, HeartHandshake, MonitorSmartphone, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// تغییر برای پروژه: عنوان و آیتم‌ها به‌صورت props (پیش‌فرض همان محتوای اصلی)
export interface StatItem { icon: LucideIcon; iconClassName: string; value: ReactNode; label: ReactNode }
const defaultItems: StatItem[] = [
  { icon: MonitorSmartphone, iconClassName: "text-blue-500", value: "70%", label: "Faster UI development" },
  { icon: FastForward, iconClassName: "text-green-600", value: "5x", label: "Increase in productivity" },
  { icon: HeartHandshake, iconClassName: "text-red-500", value: "98%", label: "Customer satisfaction" },
];

function Stats({ title = "Built with scale in mind", subtitle = "Trusted by thousands to build modern UIs faster", items = defaultItems, className = "" }: { title?: ReactNode; subtitle?: ReactNode; items?: StatItem[]; className?: string }) {
  return (
    <div className={`mx-auto max-w-5xl px-6 py-20 ${className}`}>
      <h2 className="text-balance text-center font-medium text-4xl tracking-tight md:text-4xl">
        {title}
      </h2>
      <p className="mt-3.5 text-center text-muted-foreground text-xl tracking-[-0.015em] sm:text-lg md:text-2xl">
        {subtitle}
      </p>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border bg-muted p-6 py-7">
            <it.icon className={`mb-8 h-10 w-10 stroke-[1.75px] ${it.iconClassName}`} />
            <span className="font-medium text-5xl tracking-[-0.01em]">{it.value}</span>
            <p className="mt-4 text-foreground/80 text-xl">
              {it.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Stats;
