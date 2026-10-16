"use client";

import { X, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ReactNode } from "react";

// تغییر برای پروژه: محتوا، لینک و بستن به‌صورت props (طراحی و کلاس‌ها دست‌نخورده)
export interface Banner1Props {
  children?: ReactNode;
  href?: string;
  label?: string;
  closeLabel?: string;
  onClose?: () => void;
  className?: string;
}

export function Banner1({ children, href = "#", label = "Promotion announcement", closeLabel = "Close announcement", onClose, className }: Banner1Props = {}) {
  return (
    <aside
      role="banner"
      aria-label={label}
      className={`relative flex items-center bg-neutral-950 py-3 pr-8 pl-6 ${className ?? ""}`}
    >
      <Link
        href={href}
        className="flex w-full cursor-pointer items-start justify-start gap-2 md:items-center md:justify-center"
      >
        <p className="text-left text-sm text-white hover:underline md:text-center">
          {children ?? (<><span className="font-semibold">New update</span> – Pro blocks are now
          available in shadcn/ui kit for Figma!</>)}
        </p>
        <ChevronsRight className="hidden h-4 w-4 text-white md:block" />
      </Link>

      <Button
        onClick={() => onClose?.()}
        className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/20"
        aria-label={closeLabel}
        variant="ghost"
        size="icon"
      >
        <X className="text-white" />
        <span className="sr-only">Close</span>
      </Button>
    </aside>
  );
}

export default Banner1;
