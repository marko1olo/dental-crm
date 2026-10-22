const CATEGORY_MAP: Record<string, { label: string; className: string }> = {
	material: { label: "Материалы", className: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]" },
	materials: { label: "Материалы", className: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]" },
	anesthesia: { label: "Анестезия", className: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" },
	therapy: { label: "Терапия", className: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" },
	composite: { label: "Композиты", className: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" },
	disposables: { label: "Расходники", className: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]" },
	ppe: { label: "Расходники", className: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]" },
	surgery: { label: "Хирургия", className: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" },
	hygiene: { label: "Гигиена", className: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]" },
	endo: { label: "Эндодонтия", className: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" },
	implant: { label: "Имплантаты", className: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30" },
	suture: { label: "Шовный матер.", className: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]" },
};

export function getCategoryBadge(category?: string): { label: string; className: string } {
	if (!category) {
		return { label: "Материалы", className: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]" };
	}
	const norm = category.toLowerCase().trim();
	return CATEGORY_MAP[norm] || { label: "Материалы", className: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]" };
}
