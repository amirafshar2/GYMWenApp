// 21st.dev — دموی Footer Column (FooterNewsletter)
'use client';

// lucide-react جدید آیکون برندها را ندارد؛ از فایل محلی هم‌سبک
import { Instagram, Linkedin, Twitter, Youtube } from '@/components/ui/brand-icons';
import { useId, useState, type ReactNode } from 'react';

// تغییر برای پروژه: همهٔ محتوا (متن‌ها، ستون‌ها، شبکه‌های اجتماعی، فرم خبرنامه) به‌صورت props؛
// چیدمان و کلاس‌ها همان کد اصلی است. پیش‌فرض‌ها همان محتوای نمونه هستند.
export interface FooterLink { text: string; href: string }
export interface FooterNewsletterProps {
  newsletterTitle?: ReactNode;
  newsletterText?: ReactNode;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputType?: 'email' | 'tel';
  buttonLabel?: string;
  onSubscribe?: (value: string) => Promise<string | void> | string | void;
  image?: string;
  imageAlt?: string;
  logo?: ReactNode;
  brandName?: ReactNode;
  description?: ReactNode;
  socials?: { icon: ReactNode; href: string; label: string }[];
  columns?: { title: string; links: FooterLink[] }[];
  legal?: FooterLink[];
  copyright?: ReactNode;
}

const toLinks = (xs: string[]) => xs.map((text) => ({ text, href: '#' }));
const footerColumns = [
  {
    title: 'Solutions',
    links: toLinks([
      'Business Automation',
      'Cloud Services',
      'Analytics',
      'Integrations',
      'Support',
    ]),
  },
  {
    title: 'Resources',
    links: toLinks(['Documentation', 'Case Studies', 'Blog', 'Webinars', 'Community']),
  },
  {
    title: 'Company',
    links: toLinks(['About Us', 'Careers', 'Contact', 'Partners', 'Press']),
  },
];

const legalLinks = toLinks([
  'Terms of Service',
  'Privacy Policy',
  'Cookie Settings',
  'Accessibility',
]);

const socialIcons = [
  { icon: <Instagram className="h-5 w-5" />, href: '#', label: 'Instagram' },
  { icon: <Twitter className="h-5 w-5" />, href: '#', label: 'Twitter' },
  { icon: <Linkedin className="h-5 w-5" />, href: '#', label: 'LinkedIn' },
  { icon: <Youtube className="h-5 w-5" />, href: '#', label: 'YouTube' },
];

export default function FooterNewsletter({
  newsletterTitle = 'Stay ahead with Acme Inc.',
  newsletterText = 'Join thousands of professionals who trust Acme Inc. for innovative business solutions.',
  inputLabel = 'Email',
  inputPlaceholder = 'Enter your email',
  inputType = 'email',
  buttonLabel = 'Subscribe Now',
  onSubscribe,
  image = 'https://cdn.21st.dev/assets/mirror/5f/5f8be9b79a1b224be1b30877135401f81a0aed375a10c55593e70b72c0668643.jpg',
  imageAlt = 'Acme Inc. team',
  logo,
  brandName = 'Acme Inc.',
  description = 'Empowering businesses with reliable, scalable, and innovative solutions.',
  socials = socialIcons,
  columns = footerColumns,
  legal = legalLinks,
  copyright = '© 2023 Acme Inc. All rights reserved.',
}: FooterNewsletterProps = {}) {
  const inputId = useId();
  const [status, setStatus] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'error'; msg?: string }>({ kind: 'idle' });
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get('value') ?? '');
    setStatus({ kind: 'busy' });
    try {
      const msg = await onSubscribe?.(value);
      setStatus({ kind: 'ok', msg: msg || undefined });
      e.currentTarget?.reset?.();
    } catch (err) {
      setStatus({ kind: 'error', msg: err instanceof Error ? err.message : undefined });
    }
  };
  return (
    <footer className="bg-background text-foreground relative w-full pt-20 pb-10">
      <div className="pointer-events-none absolute top-0 left-0 z-0 h-full w-full overflow-hidden">
        <div className="bg-primary absolute top-1/3 left-1/4 h-64 w-64 rounded-full opacity-10 blur-3xl" />
        <div className="bg-primary absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full opacity-10 blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass-effect mb-16 rounded-2xl p-8 md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-bold md:text-3xl">
                {newsletterTitle}
              </h3>
              <p className="text-foreground/70 mb-6">
                {newsletterText}
              </p>
              <form onSubmit={submit} className="flex flex-col gap-4 sm:flex-row">
                <label htmlFor={inputId} className="sr-only">{inputLabel}</label>
                <input
                  id={inputId}
                  name="value"
                  required
                  type={inputType}
                  inputMode={inputType === 'tel' ? 'numeric' : undefined}
                  dir={inputType === 'tel' ? 'ltr' : undefined}
                  autoComplete={inputType === 'tel' ? 'tel' : 'email'}
                  placeholder={inputPlaceholder}
                  className="border-foreground/20 bg-background focus:ring-primary rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none"
                />
                <button type="submit" disabled={status.kind === 'busy'} className="bg-primary text-primary-foreground shadow-primary/20 hover:shadow-primary/30 rounded-lg px-6 py-3 font-medium shadow-lg transition disabled:opacity-60">
                  {buttonLabel}
                </button>
              </form>
              <p role="status" className="mt-3 text-sm empty:mt-0">{status.kind === 'ok' ? status.msg : null}</p>
              <p role="alert" className="text-destructive mt-1 text-sm empty:mt-0">{status.kind === 'error' ? status.msg : null}</p>
            </div>
            <div className="hidden justify-end md:flex">
              <div className="relative">
                <div className="bg-primary/20 absolute inset-0 rotate-6 rounded-xl" />
                <img
                  src={image}
                  alt={imageAlt}
                  loading="lazy"
                  className="relative w-80 rounded-xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mb-16 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-6 flex items-center space-x-2">
              {logo ?? <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-primary-foreground h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>}
              <span className="text-xl font-bold">{brandName}</span>
            </div>
            <p className="text-foreground/60 mb-6">
              {description}
            </p>
            <div className="flex space-x-4">
              {socials.map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  aria-label={item.label}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="glass-effect hover:bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full transition"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-lg font-semibold">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map(({ text, href }) => (
                  <li key={text}>
                    <a
                      href={href}
                      className="text-foreground/60 hover:text-foreground transition"
                    >
                      {text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-foreground/10 flex flex-col items-center justify-between border-t pt-8 md:flex-row">
          <p className="text-foreground/60 mb-4 text-sm md:mb-0">
            {copyright}
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {legal.map(({ text, href }) => (
              <a
                key={text}
                href={href}
                className="text-foreground/60 hover:text-foreground text-sm"
              >
                {text}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
