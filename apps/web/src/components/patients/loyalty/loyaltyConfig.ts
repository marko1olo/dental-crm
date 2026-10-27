export type LoyaltyTier = "standard" | "silver" | "gold" | "platinum";

export const LOYALTY_CONFIG: Record<
	LoyaltyTier,
	{ label: string; discountPct: number; color: string }
> = {
	standard: { label: "Базовый", discountPct: 0, color: "var(--muted, #64748b)" },
	silver: { label: "Серебро", discountPct: 5, color: "var(--muted, #94a3b8)" },
	gold: { label: "Золото", discountPct: 10, color: "var(--warn-fg, #f59e0b)" },
	platinum: { label: "Платинум", discountPct: 15, color: "var(--info-fg, #6366f1)" },
};
