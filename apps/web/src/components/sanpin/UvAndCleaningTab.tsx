/**
 * apps/web/src/components/sanpin/UvAndCleaningTab.tsx
 *
 * Канонический модуль учета бактерицидных ламп и уборок (Мандаты 8b, 8e, 8n, 8x, Apple HIG).
 * - Живой клинический язык: «Учет бактерицидных ламп и уборок».
 * - Никаких советских номеров приказов в интерфейсе.
 * - Объединяет бактерицидные рециркуляторы (Дезар), журналы уборок и готовность кабинетов.
 * - На смартфонах (390x844): высота строк >= 52px, 0px горизонтального скролла.
 * - Размер: 200–300 строк (Sweet Spot).
 */

import React, { useState } from "react";
import {
	Wind,
	Sparkles,
	ShieldCheck,
	CheckCircle2,
	Clock,
	Calendar,
	Building2,
	Printer,
} from "lucide-react";
import { BactericidalRegisterTab } from "./BactericidalRegisterTab";
import { CabinetReadinessTab } from "./CabinetReadinessTab";
import { GeneralCleaningRegisterTab } from "./GeneralCleaningRegisterTab";

export type UvAndCleaningSubTab = "bactericidal" | "cleaning" | "readiness";

export interface UvAndCleaningTabProps {
	readonly initialSubTab?: UvAndCleaningSubTab;
	readonly className?: string;
}

export function UvAndCleaningTab({
	initialSubTab = "bactericidal",
	className = "",
}: UvAndCleaningTabProps) {
	const [activeSubTab, setActiveSubTab] = useState<UvAndCleaningSubTab>(initialSubTab);

	return (
		<div
			className={`uv-and-cleaning-tab flex flex-col gap-3.5 w-full max-w-full overflow-x-clip ${className}`}
			role="region"
			aria-label="Учет бактерицидных ламп и уборок"
		>
			{/* ВЕРХНЯЯ НАВИГАЦИОННАЯ ПАНЕЛЬ ПОДРАЗДЕЛОВ */}
			<div className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex-wrap">
				<div
					className="inline-flex bg-[var(--paper,#fff)] border border-[var(--line,#cbd5e1)] rounded-lg p-0.5 gap-0.5"
					role="tablist"
					aria-label="Подразделы санитарного режима"
				>
					<button
						type="button"
						role="tab"
						aria-selected={activeSubTab === "bactericidal"}
						onClick={() => setActiveSubTab("bactericidal")}
						className="px-3 py-1.5 text-xs rounded-md font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
						style={{
							background: activeSubTab === "bactericidal" ? "var(--teal, #0d9488)" : "transparent",
							color: activeSubTab === "bactericidal" ? "#ffffff" : "var(--muted, #64748b)",
							border: "none",
						}}
						data-testid="subtab-bactericidal-btn"
					>
						<Wind size={13} />
						<span className="hidden sm:inline">Бактерицидные лампы</span>
						<span className="inline sm:hidden">Лампы</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeSubTab === "cleaning"}
						onClick={() => setActiveSubTab("cleaning")}
						className="px-3 py-1.5 text-xs rounded-md font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
						style={{
							background: activeSubTab === "cleaning" ? "var(--teal, #0d9488)" : "transparent",
							color: activeSubTab === "cleaning" ? "#ffffff" : "var(--muted, #64748b)",
							border: "none",
						}}
						data-testid="subtab-cleaning-btn"
					>
						<Sparkles size={13} />
						<span className="hidden sm:inline">Журнал уборок</span>
						<span className="inline sm:hidden">Уборки</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeSubTab === "readiness"}
						onClick={() => setActiveSubTab("readiness")}
						className="px-3 py-1.5 text-xs rounded-md font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
						style={{
							background: activeSubTab === "readiness" ? "var(--teal, #0d9488)" : "transparent",
							color: activeSubTab === "readiness" ? "#ffffff" : "var(--muted, #64748b)",
							border: "none",
						}}
						data-testid="subtab-readiness-btn"
					>
						<ShieldCheck size={13} />
						<span className="hidden sm:inline">Готовность кабинетов</span>
						<span className="inline sm:hidden">Кабинеты</span>
					</button>
				</div>

				<div className="text-xs text-[var(--muted,#64748b)] hidden md:flex items-center gap-2">
					<span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
						<CheckCircle2 size={12} />
						<span>Лампы: в норме</span>
					</span>
					<span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
						<CheckCircle2 size={12} />
						<span>Текущая уборка: выполнена</span>
					</span>
				</div>
			</div>

			{/* КОНТЕНТ АКТИВНОГО ПОДРАЗДЕЛА */}
			{activeSubTab === "bactericidal" && (
				<div className="bactericidal-subtab-wrap flex flex-col gap-3">
					<BactericidalRegisterTab />
				</div>
			)}

			{activeSubTab === "cleaning" && (
				<div className="cleaning-subtab-wrap flex flex-col gap-3">
					<GeneralCleaningRegisterTab />
				</div>
			)}

			{activeSubTab === "readiness" && (
				<div className="readiness-subtab-wrap flex flex-col gap-3">
					<CabinetReadinessTab />
				</div>
			)}
		</div>
	);
}

export { UvAndCleaningTab as SanpinUvAndCleaningRegisterTab };
export default UvAndCleaningTab;
