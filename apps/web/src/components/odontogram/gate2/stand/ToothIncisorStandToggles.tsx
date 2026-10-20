import type React from "react";
import type { IncisorStandLayers, ToothIncisorStandTogglesProps } from "./incisorStandTypes";

interface ToggleItem {
	key: keyof IncisorStandLayers;
	label: string;
}

const TOGGLES: readonly ToggleItem[] = [
	{ key: "roots", label: "Корень" },
	{ key: "crown", label: "Коронка" },
	{ key: "mamelons", label: "Мамелоны" },
	{ key: "cingulum", label: "Бугорок (Cingulum)" },
	{ key: "sulcusLongitudinalis", label: "Борозда корня" },
	{ key: "pulp", label: "Пульпа" },
	{ key: "canals", label: "Канал" },
	{ key: "guttaPercha", label: "Гуттаперча" },
	{ key: "periapicalHalo", label: "Периапикал" },
	{ key: "veneer", label: "Винир E-Max" },
	{ key: "abfraction", label: "Клин CEJ" },
	{ key: "splinting", label: "Шина" },
	{ key: "fiberPost", label: "Штифт" },
	{ key: "implant", label: "Имплант" },
	{ key: "missing", label: "Удален" },
];

export const ToothIncisorStandToggles: React.FC<ToothIncisorStandTogglesProps> = ({
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
