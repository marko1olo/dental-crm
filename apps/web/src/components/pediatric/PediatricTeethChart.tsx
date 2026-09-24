/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PEDIATRIC TEETH CHART (ДЕТСКАЯ КАРТА ЗУБОВ: МОЛОЧНЫЙ И СМЕННЫЙ ПРИКУС)
 * 1-Click Primary / Mixed Dentition Switch | FDI 51–55, 61–65, 71–75, 81–85 & 16, 26, 36, 46
 * Zero Emojis | Clinical Density (32-36px desktop, >=44px touch) | Mandates 8d, 8e, 8n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import { Check, ShieldCheck, Sparkles, RefreshCw, Scissors } from "lucide-react";

export type PediatricDentitionMode = "primary" | "mixed";

export interface PediatricToothItem {
	readonly toothNumber: number;
	readonly label: string;
	readonly anatomicalNameRu: string;
	readonly isPrimary: boolean;
	readonly quadrant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
	readonly type: "incisor_central" | "incisor_lateral" | "canine" | "molar_1" | "molar_2" | "permanent_molar_1" | "permanent_incisor";
}

export type ToothClinicalFinding =
	| "Healthy"
	| "Caries"
	| "Filled"
	| "EndoTreated"
	| "Watch"
	| "Extracted"
	| "Crown";

// ─────────────────────────────────────────────────────────────────────────────
// ANATOMICAL TEETH DEFINITIONS (FDI WORLD DENTAL FEDERATION)
// ─────────────────────────────────────────────────────────────────────────────

export const PRIMARY_UPPER_RIGHT: readonly PediatricToothItem[] = [
	{ toothNumber: 55, label: "55", anatomicalNameRu: "Верхний правый второй молочный моляр", isPrimary: true, quadrant: 5, type: "molar_2" },
	{ toothNumber: 54, label: "54", anatomicalNameRu: "Верхний правый первый молочный моляр", isPrimary: true, quadrant: 5, type: "molar_1" },
	{ toothNumber: 53, label: "53", anatomicalNameRu: "Верхний правый молочный клык", isPrimary: true, quadrant: 5, type: "canine" },
	{ toothNumber: 52, label: "52", anatomicalNameRu: "Верхний правый боковой молочный резец", isPrimary: true, quadrant: 5, type: "incisor_lateral" },
	{ toothNumber: 51, label: "51", anatomicalNameRu: "Верхний правый центральный молочный резец", isPrimary: true, quadrant: 5, type: "incisor_central" },
];

export const PRIMARY_UPPER_LEFT: readonly PediatricToothItem[] = [
	{ toothNumber: 61, label: "61", anatomicalNameRu: "Верхний левый центральный молочный резец", isPrimary: true, quadrant: 6, type: "incisor_central" },
	{ toothNumber: 62, label: "62", anatomicalNameRu: "Верхний левый боковой молочный резец", isPrimary: true, quadrant: 6, type: "incisor_lateral" },
	{ toothNumber: 63, label: "63", anatomicalNameRu: "Верхний левый молочный клык", isPrimary: true, quadrant: 6, type: "canine" },
	{ toothNumber: 64, label: "64", anatomicalNameRu: "Верхний левый первый молочный моляр", isPrimary: true, quadrant: 6, type: "molar_1" },
	{ toothNumber: 65, label: "65", anatomicalNameRu: "Верхний левый второй молочный моляр", isPrimary: true, quadrant: 6, type: "molar_2" },
];

export const PRIMARY_LOWER_RIGHT: readonly PediatricToothItem[] = [
	{ toothNumber: 85, label: "85", anatomicalNameRu: "Нижний правый второй молочный моляр", isPrimary: true, quadrant: 8, type: "molar_2" },
	{ toothNumber: 84, label: "84", anatomicalNameRu: "Нижний правый первый молочный моляр", isPrimary: true, quadrant: 8, type: "molar_1" },
	{ toothNumber: 83, label: "83", anatomicalNameRu: "Нижний правый молочный клык", isPrimary: true, quadrant: 8, type: "canine" },
	{ toothNumber: 82, label: "82", anatomicalNameRu: "Нижний правый боковой молочный резец", isPrimary: true, quadrant: 8, type: "incisor_lateral" },
	{ toothNumber: 81, label: "81", anatomicalNameRu: "Нижний правый центральный молочный резец", isPrimary: true, quadrant: 8, type: "incisor_central" },
];

export const PRIMARY_LOWER_LEFT: readonly PediatricToothItem[] = [
	{ toothNumber: 71, label: "71", anatomicalNameRu: "Нижний левый центральный молочный резец", isPrimary: true, quadrant: 7, type: "incisor_central" },
	{ toothNumber: 72, label: "72", anatomicalNameRu: "Нижний левый боковой молочный резец", isPrimary: true, quadrant: 7, type: "incisor_lateral" },
	{ toothNumber: 73, label: "73", anatomicalNameRu: "Нижний левый молочный клык", isPrimary: true, quadrant: 7, type: "canine" },
	{ toothNumber: 74, label: "74", anatomicalNameRu: "Нижний левый первый молочный моляр", isPrimary: true, quadrant: 7, type: "molar_1" },
	{ toothNumber: 75, label: "75", anatomicalNameRu: "Нижний левый второй молочный моляр", isPrimary: true, quadrant: 7, type: "molar_2" },
];

// Permanent 6-year molars for mixed dentition (первые постоянные моляры "шестёрки")
export const PERMANENT_SIX_TEETH: Readonly<Record<number, PediatricToothItem>> = {
	16: { toothNumber: 16, label: "16", anatomicalNameRu: "Верхний правый первый постоянный моляр (шестёрка)", isPrimary: false, quadrant: 1, type: "permanent_molar_1" },
	26: { toothNumber: 26, label: "26", anatomicalNameRu: "Верхний левый первый постоянный моляр (шестёрка)", isPrimary: false, quadrant: 2, type: "permanent_molar_1" },
	36: { toothNumber: 36, label: "36", anatomicalNameRu: "Нижний левый первый постоянный моляр (шестёрка)", isPrimary: false, quadrant: 3, type: "permanent_molar_1" },
	46: { toothNumber: 46, label: "46", anatomicalNameRu: "Нижний правый первый постоянный моляр (шестёрка)", isPrimary: false, quadrant: 4, type: "permanent_molar_1" },
};

export interface PediatricTeethChartProps {
	/** Активный номер зуба (выделен в карте) */
	readonly activeTooth?: number | null | undefined;
	/** Обработчик выбора зуба */
	readonly onSelectTooth: (toothNumber: number) => void;
	/** Режим прикуса: молочный (20 зубов) или сменный (с молярами 16, 26, 36, 46) */
	readonly mode?: PediatricDentitionMode;
	/** Обработчик переключения прикуса */
	readonly onModeChange?: (mode: PediatricDentitionMode) => void;
	/** Словарь состояний зубов: toothNumber -> finding state */
	readonly toothFindings?: Readonly<Record<number, ToothClinicalFinding>>;
	/** Пакетный обработчик установки всех молочных в здоровые */
	readonly onSetAllHealthy?: () => void;
	/** Пакетный обработчик физиологической смены прикуса */
	readonly onApplyMixedDentitionPreset?: () => void;
	/** Дополнительный CSS класс */
	readonly className?: string;
}

export const PediatricTeethChart: React.FC<PediatricTeethChartProps> = ({
	activeTooth = 54,
	onSelectTooth,
	mode = "primary",
	onModeChange,
	toothFindings = {},
	onSetAllHealthy,
	onApplyMixedDentitionPreset,
	className = "",
}) => {
	const isMixed = mode === "mixed";

	// Upper row teeth (right to left)
	const upperRow = useMemo<readonly PediatricToothItem[]>(() => {
		const right = isMixed ? [PERMANENT_SIX_TEETH[16]!, ...PRIMARY_UPPER_RIGHT] : PRIMARY_UPPER_RIGHT;
		const left = isMixed ? [...PRIMARY_UPPER_LEFT, PERMANENT_SIX_TEETH[26]!] : PRIMARY_UPPER_LEFT;
		return [...right, ...left];
	}, [isMixed]);

	// Lower row teeth (right to left)
	const lowerRow = useMemo<readonly PediatricToothItem[]>(() => {
		const right = isMixed ? [PERMANENT_SIX_TEETH[46]!, ...PRIMARY_LOWER_RIGHT] : PRIMARY_LOWER_RIGHT;
		const left = isMixed ? [...PRIMARY_LOWER_LEFT, PERMANENT_SIX_TEETH[36]!] : PRIMARY_LOWER_LEFT;
		return [...right, ...left];
	}, [isMixed]);

	const renderToothButton = (tooth: PediatricToothItem) => {
		const isSelected = activeTooth === tooth.toothNumber;
		const finding = toothFindings[tooth.toothNumber] ?? "Healthy";

		// Semantic color according to clinical finding
		let findingBadge = "";
		let findingClass = "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)]";

		if (finding === "Caries") {
			findingBadge = "Кариес";
			findingClass = "bg-amber-50 text-amber-900 border-amber-400 dark:bg-amber-950/60 dark:text-amber-200";
		} else if (finding === "Filled") {
			findingBadge = "Пломба";
			findingClass = "bg-teal-50 text-teal-900 border-teal-400 dark:bg-teal-950/60 dark:text-teal-200";
		} else if (finding === "EndoTreated") {
			findingBadge = "Пульпотомия";
			findingClass = "bg-rose-50 text-rose-900 border-rose-400 dark:bg-rose-950/60 dark:text-rose-200";
		} else if (finding === "Watch") {
			findingBadge = "Фтор";
			findingClass = "bg-purple-50 text-purple-900 border-purple-400 dark:bg-purple-950/60 dark:text-purple-200";
		} else if (finding === "Crown") {
			findingBadge = "Коронка";
			findingClass = "bg-amber-100 text-amber-950 border-amber-500 dark:bg-amber-900/60 dark:text-amber-100";
		} else if (finding === "Extracted") {
			findingBadge = "Удалён";
			findingClass = "bg-slate-100 text-slate-500 border-slate-300 line-through dark:bg-slate-800 dark:text-slate-400";
		}

		return (
			<button
				key={tooth.toothNumber}
				type="button"
				onClick={() => onSelectTooth(tooth.toothNumber)}
				className={`relative flex flex-col items-center justify-center rounded-xl border p-1 transition-all select-none cursor-pointer touch-manipulation min-w-[36px] sm:min-w-[42px] min-h-[44px] sm:min-h-[48px] active:scale-95 ${
					isSelected
						? "border-teal-600 bg-teal-50/90 text-teal-950 shadow-sm ring-2 ring-teal-500/40 dark:border-teal-400 dark:bg-teal-950/70 dark:text-teal-100 font-extrabold z-10"
						: `${findingClass} hover:border-teal-400 hover:bg-[var(--paper-soft,#f8fafc)]`
				} ${!tooth.isPrimary ? "ring-1 ring-sky-500/30" : ""}`}
				title={`${tooth.toothNumber} — ${tooth.anatomicalNameRu}${findingBadge ? ` (${findingBadge})` : ""}`}
				data-testid={`pediatric-tooth-btn-${tooth.toothNumber}`}
			>
				{/* Permanent molar indicator badge */}
				{!tooth.isPrimary && (
					<span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded bg-sky-600 px-1 text-[8px] font-black uppercase text-white tracking-tighter">
						Пост
					</span>
				)}

				<span className="font-mono text-xs sm:text-sm font-black tracking-tight">
					{tooth.label}
				</span>

				<span className="text-[9px] uppercase tracking-tighter text-[var(--muted,#64748b)]">
					{tooth.type.startsWith("molar") ? "моляр" : tooth.type.includes("canine") ? "клык" : "резец"}
				</span>

				{findingBadge && finding !== "Healthy" && (
					<span className="mt-0.5 rounded px-1 text-[8px] font-bold bg-black/5 dark:bg-white/10 truncate max-w-full">
						{findingBadge}
					</span>
				)}
			</button>
		);
	};

	return (
		<div
			className={`pediatric-teeth-chart rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] p-3 sm:p-4 ${className}`.trim()}
			data-testid="pediatric-teeth-chart"
		>
			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* ШАПКА: 1-КЛИК ПЕРЕКЛЮЧАТЕЛЬ ПРИКУСА (МОЛОЧНЫЙ / СМЕННЫЙ) */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2.5">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)]">
						Детская карта зубов (FDI):
					</span>
					<span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-xs font-bold font-mono text-teal-700 dark:text-teal-300">
						{isMixed ? "Сменный прикус (24 зуба)" : "Временный молочный прикус (20 зубов)"}
					</span>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					{/* 1-Клик переключатель прикуса (12-Hour Shift Invariant) */}
					<div
						role="group"
						aria-label="Режим детского прикуса"
						className="inline-flex rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-0.5"
						data-testid="pediatric-dentition-mode-toggle"
					>
						<button
							type="button"
							onClick={() => onModeChange?.("primary")}
							className={`min-h-[32px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
								!isMixed
									? "bg-teal-600 text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="mode-primary-btn"
							title="Только 20 молочных зубов (51–55, 61–65, 71–75, 81–85)"
						>
							Молочный (51–85)
						</button>
						<button
							type="button"
							onClick={() => onModeChange?.("mixed")}
							className={`min-h-[32px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
								isMixed
									? "bg-sky-600 text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="mode-mixed-btn"
							title="Сменный прикус: молочные + постоянные первые моляры 16, 26, 36, 46"
						>
							Сменный (+ 16, 26, 36, 46)
						</button>
					</div>

					{/* 1-Клик: все временные интактны */}
					{onSetAllHealthy && (
						<button
							type="button"
							onClick={onSetAllHealthy}
							className="min-h-[32px] sm:min-h-0 sm:h-7 px-2 rounded-lg border border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
							title="1-клик: все молочные зубы здоровы (индекс кп=0)"
							data-testid="pediatric-all-healthy-btn"
						>
							<ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span className="hidden md:inline">Все интактны</span>
						</button>
					)}

					{/* 1-Клик: пресет смены резцов */}
					{onApplyMixedDentitionPreset && (
						<button
							type="button"
							onClick={onApplyMixedDentitionPreset}
							className="min-h-[32px] sm:min-h-0 sm:h-7 px-2 rounded-lg border border-sky-500/30 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 hover:bg-sky-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
							title="1-клик: смена резцов и появление первых моляров 16, 26, 36, 46"
							data-testid="pediatric-mixed-preset-btn"
						>
							<Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
							<span className="hidden md:inline">Смена резцов</span>
						</button>
					)}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* ЗУБНАЯ ДУГА: ВЕРХНЯЯ ЧЕЛЮСТЬ (ВЕРХНИЕ ЗУБЫ) */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="mb-2">
				<div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
					<span>Правый верх (Квадрант 5 / 1)</span>
					<span className="text-[11px] font-extrabold text-[var(--ink,#0f172a)]">Верхняя челюсть</span>
					<span>Левый верх (Квадрант 6 / 2)</span>
				</div>
				<div className="overflow-x-auto pb-1">
					<div
						className={`grid gap-1 sm:gap-1.5 mx-auto justify-center ${
							isMixed ? "grid-cols-12 min-w-[520px]" : "grid-cols-10 min-w-[440px]"
						}`}
						data-testid="pediatric-upper-arch"
					>
						{upperRow.map(renderToothButton)}
					</div>
				</div>
			</div>

			{/* Разделитель окклюзии */}
			<div className="relative my-2.5 flex items-center justify-center">
				<div className="w-full border-t border-dashed border-[var(--line,#e2e8f0)]" />
				<span className="absolute bg-[var(--paper-soft,#f8fafc)] px-2 text-[10px] font-mono font-bold uppercase text-[var(--muted,#64748b)]">
					Окклюзионная плоскость
				</span>
			</div>

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* ЗУБНАЯ ДУГА: НИЖНЯЯ ЧЕЛЮСТЬ (НИЖНИЕ ЗУБЫ) */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div>
				<div className="overflow-x-auto pb-1">
					<div
						className={`grid gap-1 sm:gap-1.5 mx-auto justify-center ${
							isMixed ? "grid-cols-12 min-w-[520px]" : "grid-cols-10 min-w-[440px]"
						}`}
						data-testid="pediatric-lower-arch"
					>
						{lowerRow.map(renderToothButton)}
					</div>
				</div>
				<div className="mt-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
					<span>Правый низ (Квадрант 8 / 4)</span>
					<span className="text-[11px] font-extrabold text-[var(--ink,#0f172a)]">Нижняя челюсть</span>
					<span>Левый низ (Квадрант 7 / 3)</span>
				</div>
			</div>
		</div>
	);
};

export default PediatricTeethChart;
