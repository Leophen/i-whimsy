import { cn } from '@/lib/utils';

/** iWhimsy 品牌标记：四段渐变环 + 中心火花 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn('size-8 shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="iw-a" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="iw-b" x1="28" y1="4" x2="4" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="iw-c" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="iw-d" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4B5FD" />
          <stop offset="1" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      <path
        d="M16 3.5A12.5 12.5 0 0 1 28.5 16"
        stroke="url(#iw-a)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M28.5 16A12.5 12.5 0 0 1 16 28.5"
        stroke="url(#iw-b)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M16 28.5A12.5 12.5 0 0 1 3.5 16"
        stroke="url(#iw-c)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M3.5 16A12.5 12.5 0 0 1 16 3.5"
        stroke="url(#iw-d)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="3.4" fill="url(#iw-a)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">iWhimsy</span>
    </span>
  );
}
