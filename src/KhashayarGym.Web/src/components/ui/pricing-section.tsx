"use client";
/**
 * Pricing Section (21st.dev — نسخهٔ «Plans that works best…» با کارت‌های گرادیانی و سوییچ متحرک)
 * تغییرات نسبت به اصل:
 *  - پلن‌ها، متن‌ها و برچسب‌های سوییچ از props می‌آیند (فارسی، RTL)
 *  - آبی اصلی با رنگ‌های تم سایت (قرمز --color-plate و زغالی --color-chalk) جایگزین شده
 *  - TimelineContent (وابستگی جدا) با یک Reveal سادهٔ motion با همان انیمیشن blur/fade جایگزین شده
 *  - قیمت به‌صورت متن فارسی (NumberFlow ارقام فارسی ندارد) با انیمیشن عوض‌شدن
 */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState, type ElementType, type ReactNode, type RefObject } from "react";

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  priceUnit: string;
  /** قیمت قبل از تخفیف (خط‌خورده) */
  oldPrice?: string;
  /** برچسب کوچک کنار قیمت، مثلاً «۲۰٪ تخفیف جشنواره» */
  badge?: string;
  /** یک خط زیر قیمت، مثلاً «ماهانه ۲ میلیون» */
  note?: string;
  buttonText: string;
  popular?: boolean;
  features: { text: string; icon: ReactNode }[];
  includes: string[]; // [عنوان، ...موارد]
}

export interface PricingGroup {
  key: string;
  label: string;
  tag?: string;
  plans: PricingPlan[];
}

const revealVariants = {
  visible: (i: number) => ({ y: 0, opacity: 1, filter: "blur(0px)", transition: { delay: i * 0.15, duration: 0.5 } }),
  hidden: { filter: "blur(10px)", y: -20, opacity: 0 },
};

/** جایگزین TimelineContent: با ورود بخش به دید، به ترتیب شماره ظاهر می‌شود */
function TimelineContent({ as = "div", animationNum, className, children }: {
  as?: ElementType; animationNum: number; timelineRef: RefObject<HTMLElement | null>; className?: string; children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const M = (motion as unknown as Record<string, ElementType>)[as as string] ?? motion.div;
  if (reduced) { const T = as; return <T className={className}>{children}</T>; }
  return (
    <M className={className} custom={animationNum} variants={revealVariants} initial="hidden" whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}>
      {children}
    </M>
  );
}

const PricingSwitch = ({ groups, value, onSwitch }: { groups: PricingGroup[]; value: string; onSwitch: (v: string) => void }) => (
  <div className="flex justify-center">
    <div role="tablist" className="relative z-10 mx-auto flex w-fit rounded-full border border-steel-2 bg-white p-1 shadow-sm">
      {groups.map((g) => (
        <button key={g.key} role="tab" aria-selected={value === g.key} onClick={() => onSwitch(g.key)}
          className={`relative z-10 flex h-11 w-fit flex-shrink-0 cursor-pointer items-center rounded-full px-4 font-bold transition-colors sm:h-12 sm:px-6 ${value === g.key ? "text-white" : "text-rubber hover:text-chalk"}`}>
          {value === g.key && (
            <motion.span layoutId="pricing-switch"
              className="absolute inset-0 rounded-full border-4 border-plate bg-gradient-to-t from-plate-hi via-[#3a86d4] to-plate shadow-sm shadow-plate"
              transition={{ type: "spring", stiffness: 500, damping: 30 }} />
          )}
          <span className="relative flex items-center gap-2">
            {g.label}
            {g.tag && <span className="rounded-full bg-[#e7f0fa] px-2 py-0.5 text-xs font-bold text-chalk">{g.tag}</span>}
          </span>
        </button>
      ))}
    </div>
  </div>
);

export default function PricingSection({ id, title, accent, subtitle, groups, onSelect, popularLabel = "محبوب‌ترین" }: {
  id?: string;
  title: ReactNode;
  accent: ReactNode;
  subtitle: ReactNode;
  groups: PricingGroup[];
  onSelect?: (plan: PricingPlan) => void;
  popularLabel?: string;
}) {
  const [group, setGroup] = useState(groups[0]?.key ?? "");
  const pricingRef = useRef<HTMLDivElement>(null);
  const plans = groups.find((g) => g.key === group)?.plans ?? [];

  return (
    <div id={id} className="relative mx-auto overflow-hidden bg-white px-4 py-[clamp(80px,9vw,130px)]" ref={pricingRef}>
      <div aria-hidden className="pointer-events-none absolute top-0 right-[10%] left-[10%] z-0 h-full w-[80%]"
        style={{ backgroundImage: "radial-gradient(circle at center, var(--color-plate) 0%, transparent 70%)", opacity: 0.18, mixBlendMode: "multiply" }} />

      <div className="relative mx-auto mb-8 max-w-3xl text-center">
        <TimelineContent as="h2" animationNum={0} timelineRef={pricingRef} className="mb-4 text-3xl font-bold leading-[1.4] text-chalk sm:text-4xl md:text-5xl">
          {title}{" "}
          <TimelineContent as="span" animationNum={1} timelineRef={pricingRef}
            className="inline-block rounded-xl border border-dashed border-plate bg-[#e7f0fa] px-3 py-1">
            {accent}
          </TimelineContent>
        </TimelineContent>
        <TimelineContent as="p" animationNum={2} timelineRef={pricingRef} className="mx-auto w-[85%] text-sm leading-7 text-rubber sm:w-[70%] sm:text-base">
          {subtitle}
        </TimelineContent>
      </div>

      <TimelineContent as="div" animationNum={3} timelineRef={pricingRef} className="relative">
        <PricingSwitch groups={groups} value={group} onSwitch={setGroup} />
      </TimelineContent>

      <div className="relative mx-auto grid max-w-[1290px] gap-4 py-8 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, index) => (
          <TimelineContent key={group + plan.id} as="div" animationNum={4 + index} timelineRef={pricingRef}>
            <Card className={`relative h-full rounded-[14px] border-steel-2 ${plan.popular ? "bg-[#f2f7fd] ring-2 ring-plate" : "bg-white"}`}>
              <CardHeader className="text-right">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="mb-1 text-2xl font-bold text-chalk">{plan.name}</h3>
                  {plan.popular && (
                    <span className="shrink-0 rounded-full bg-plate px-3 py-1 text-xs font-bold text-white">{popularLabel}</span>
                  )}
                </div>
                <p className="mb-4 text-sm text-rubber">{plan.description}</p>
                <div className="min-h-[86px]">
                  {plan.oldPrice && <p className="text-sm text-rubber line-through">{plan.oldPrice}</p>}
                  <div className="flex items-baseline gap-2">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span key={plan.price} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}
                        className="text-4xl font-black text-chalk tabular-nums">{plan.price}</motion.span>
                    </AnimatePresence>
                    <span className="text-rubber">{plan.priceUnit}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {plan.badge && <span className="rounded-full bg-plate/10 px-2 py-0.5 font-bold text-plate">{plan.badge}</span>}
                    {plan.note && <span className="text-rubber">{plan.note}</span>}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <button type="button" onClick={() => onSelect?.(plan)}
                  className={`mb-6 w-full cursor-pointer rounded-xl p-4 text-lg font-bold text-white transition-[filter,transform] hover:brightness-110 active:scale-[.99] ${
                    plan.popular
                      ? "border border-[#3a86d4] bg-gradient-to-t from-plate-hi to-plate shadow-lg shadow-plate/50"
                      : "border border-neutral-700 bg-gradient-to-t from-neutral-900 to-neutral-600 shadow-lg shadow-neutral-900/40"}`}>
                  {plan.buttonText}
                </button>
                <ul className="space-y-2 py-4 font-bold">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="mt-0.5 grid place-content-center text-chalk">{f.icon}</span>
                      <span className="text-sm text-rubber">{f.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-3 border-t border-steel-2 pt-4">
                  <h4 className="mb-3 text-base font-bold text-chalk">{plan.includes[0]}</h4>
                  <ul className="space-y-2 font-bold">
                    {plan.includes.slice(1).map((f, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-content-center rounded-full border border-plate bg-[#e7f0fa]">
                          <CheckCheck className="h-4 w-4 text-plate" />
                        </span>
                        <span className="text-sm text-rubber">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TimelineContent>
        ))}
      </div>
    </div>
  );
}
