/**
 * DENTE CRM — Canonical Button Design Token Matrix
 * Authority: rules/frontend.md (Section 17) & DESIGNER_VISUAL_INQUISITION_BIBLE.md
 *
 * Unified matrix of 5 button tiers:
 * 1. Primary CTA:      h-10 px-4 rounded-xl bg-[var(--teal,#0d9488)] text-white hover:bg-[var(--teal-hover,#0f766e)] font-medium text-sm transition-all shadow-sm active:scale-[0.98]
 * 2. Secondary Button: h-10 px-4 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line-dark,#1e293b)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-dark,#0f172a)] text-[var(--foreground,#0f172a)] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-all
 * 3. Ghost / Sub:      h-9 px-3 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs transition-all
 * 4. Pills / Presets:  h-8 px-3 rounded-lg text-xs font-medium with clear active accent state
 * 5. Icon-only:        36x36px desktop / 44x44px touch, centered Lucide vector icon
 */

export const BUTTON_CLASSES = {
	/** 1. Primary CTA — Single dominant action per screen (h-10 / 40px, rounded-xl) */
	primary:
		"h-10 px-4 rounded-xl bg-[var(--teal,#0d9488)] text-white hover:bg-[var(--teal-hover,#0f766e)] font-medium text-sm transition-all shadow-sm active:scale-[0.98] inline-flex items-center justify-center gap-2 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none",

	/** 2. Secondary Button — Neutral noble framed action (h-10 / 40px, rounded-xl) */
	secondary:
		"h-10 px-4 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line-dark,#1e293b)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-dark,#0f172a)] text-[var(--foreground,#0f172a)] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-all inline-flex items-center justify-center gap-2 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none",

	/** 3. Ghost / Sub-action — Subtle bordered or transparent action (h-9 / 36px, rounded-lg) */
	ghost:
		"h-9 px-3 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs transition-all inline-flex items-center justify-center gap-1.5 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none",

	/** 4. Pills / Presets — Filter chips and quick selection buttons (h-8 / 32px, rounded-lg) */
	pill:
		"h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line,#e2e8f0)] dark:border-[var(--line-dark,#1e293b)] bg-[var(--paper-soft,#f4f7f6)] dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-[var(--paper,#ffffff)] dark:hover:bg-slate-700/80 transition-all inline-flex items-center justify-center gap-1.5 select-none cursor-pointer",

	/** Active state for Pill */
	pillActive:
		"h-8 px-3 rounded-lg text-xs font-semibold border border-[var(--teal,#0d9488)] bg-[var(--teal-soft,#ccfbf1)] dark:bg-[var(--teal,#0d9488)]/20 text-[var(--teal-dark,#0f766e)] dark:text-[#2dd4bf] shadow-xs inline-flex items-center justify-center gap-1.5 select-none cursor-pointer",

	/** 5. Icon-only Button — 36x36px desktop, 44x44px touch */
	icon:
		"w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 sm:w-9 sm:h-9 touch:w-11 touch:h-11 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line-dark,#1e293b)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-dark,#0f172a)] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white inline-flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none p-0",
} as const;

export type ButtonVariant = keyof typeof BUTTON_CLASSES;

/** Helper function to join class names safely */
export function getButtonClassName(variant: ButtonVariant, extraClassName?: string): string {
	const base = BUTTON_CLASSES[variant];
	return extraClassName ? `${base} ${extraClassName}` : base;
}
