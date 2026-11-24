import type React from "react";
import { Zap, ShieldCheck, ChevronUp, ChevronDown } from "lucide-react";
import type { BlackCavityClass } from "@dental/shared";

interface TherapyWidgetHeaderProps {
	effectiveTooth: number;
	isToothSelected?: boolean;
	selectedSurfaces: string[];
	blackClass: BlackCavityClass;
	warranty: { warrantyMonths: number; rationaleRu: string };
	showDetailsAccordion: boolean;
	onToggleDetails: () => void;
}

export const TherapyWidgetHeader: React.FC<TherapyWidgetHeaderProps> = ({
	effectiveTooth,
	isToothSelected = true,
	selectedSurfaces,
	blackClass,
	warranty,
	showDetailsAccordion,
	onToggleDetails,
}) => {
	const classBadge = blackClass === "class_I" ? "I класс"
		: blackClass === "class_II" ? "II класс (MOD)"
		: blackClass === "class_III" ? "III класс"
		: blackClass === "class_IV" ? "IV класс (Угол)"
		: blackClass === "class_V" ? "V класс (Шейка)" : "VI класс";

	return (
		<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
			<div className="flex items-center gap-2">
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)] shrink-0">
					<Zap className="h-5 w-5" />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h3 className="text-sm font-semibold text-[var(--ink)]">
							{isToothSelected
								? `Терапевтический протокол: Зуб ${effectiveTooth}`
								: `Терапевтический протокол: Зуб #${effectiveTooth} (не выбран)`}
						</h3>
						<span className="rounded-md border border-[var(--line)] bg-[var(--paper-soft)] px-2 py-0.5 text-xs font-mono font-bold text-[var(--primary)]">
							{selectedSurfaces.join("") || "O"}
						</span>
						<span className="hidden sm:inline-block rounded-md border border-[var(--line)] bg-[var(--paper-soft)] px-2 py-0.5 text-xs font-medium text-[var(--ink)]">
							{classBadge}
						</span>
					</div>
					<p className="text-xs text-[var(--ink-muted)]">Быстрая фиксация кариеса и эстетических реставраций</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div
					className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-2.5 py-1 text-xs font-medium text-[var(--ink)]"
					title={warranty.rationaleRu}
				>
					<ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
					<span>Гарантия {warranty.warrantyMonths} мес.</span>
				</div>

				<button
					type="button"
					onClick={onToggleDetails}
					className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--paper-soft)] cursor-pointer"
					title="Показать / скрыть подробности протокола"
				>
					<span>Параметры</span>
					{showDetailsAccordion ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
				</button>
			</div>
		</div>
	);
};
