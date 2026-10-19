import type React from "react";
import type { Tooth16LayerFlags } from "./tooth16Types";

export interface Tooth16StandTogglesProps {
	layers: Tooth16LayerFlags;
	onToggle: (k: keyof Tooth16LayerFlags) => void;
}

const TOGGLES: { key: keyof Tooth16LayerFlags; label: string }[] = [
	{ key: "roots", label: "3 Корня" },
	{ key: "crown", label: "Коронка" },
	{ key: "cusps", label: "4 Бугра" },
	{ key: "cristaObliqua", label: "Crista Obliqua" },
	{ key: "carabelli", label: "Карабелли" },
	{ key: "fissures", label: "Фиссуры" },
	{ key: "pulp", label: "Пульпа" },
	{ key: "canals", label: "4 Канала" },
	{ key: "guttaPercha", label: "Гуттаперча" },
	{ key: "periapicalHalo", label: "Периапикал" },
	{ key: "caries", label: "Кариес" },
	{ key: "composite", label: "Пломба A2" },
	{ key: "abfraction", label: "Клин CEJ" },
	{ key: "postCore", label: "Штифт P" },
	{ key: "calculus", label: "Камень" },
	{ key: "crack", label: "Трещина" },
	{ key: "implant", label: "Имплант" },
	{ key: "missing", label: "Удален" },
];

/**
 * DENTE Dental CRM — Layer Toggles Bar for Upper Molars 16 / 26
 * Mandate 8b <= 120 lines. Zero cartoon emojis, clean clinical typography.
 */
export const Tooth16StandToggles: React.FC<Tooth16StandTogglesProps> = ({
	layers,
	onToggle,
}) => (
	<div className="w-full flex md:flex-wrap items-center gap-1.5 pt-1 overflow-x-auto md:overflow-visible scrollbar-none touch-pan-x overscroll-x-contain [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)] md:[mask-image:none]">
		<span className="text-[11px] font-semibold uppercase tracking-wider opacity-60 mr-0.5 shrink-0 hidden sm:inline">
			Слои:
		</span>
		{TOGGLES.map((t) => {
			const active = Boolean(layers[t.key]);
			return (
				<button
					key={t.key}
					type="button"
					onClick={() => onToggle(t.key)}
					className={`text-xs px-2.5 py-1 min-h-[44px] sm:min-h-[28px] rounded-lg border transition-all whitespace-nowrap shrink-0 md:shrink font-medium ${
						active
							? "bg-teal-500/15 border-teal-500/50 text-teal-600 dark:text-teal-300 font-semibold"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] opacity-70 hover:opacity-100"
					}`}
				>
					{active ? "✓ " : ""}
					{t.label}
				</button>
			);
		})}
	</div>
);
