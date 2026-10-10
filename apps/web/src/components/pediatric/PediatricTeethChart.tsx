/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PEDIATRIC TEETH CHART (ДЕТСКАЯ КАРТА ЗУБОВ: МОЛОЧНЫЙ И СМЕННЫЙ ПРИКУС)
 * 1-Click Primary / Mixed Dentition Switch | FDI 51–55, 61–65, 71–75, 81–85 & 16, 26, 36, 46
 * Zero Emojis | Clinical Density (32-36px desktop, >=44px touch) | Mandates 8d, 8e, 8n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { ToothDeciduous } from "../icons/DentalIcons";
import {
	type ResorptionStagePercent,
	RESORPTION_STAGE_DEFINITIONS,
	isPrimaryTooth,
} from "../odontogram/pediatricDentitionEngine";

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

export type ToothSurfaceCode = "O" | "V" | "L" | "M" | "D";

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
	readonly onSelectTooth?: ((toothNumber: number) => void) | undefined;
	/** Режим прикуса: молочный (20 зубов) или сменный (с молярами 16, 26, 36, 46) */
	readonly mode?: PediatricDentitionMode;
	/** Обработчик переключения прикуса */
	readonly onModeChange?: (mode: PediatricDentitionMode) => void;
	/** Словарь состояний зубов: toothNumber -> finding state */
	readonly toothFindings?: Readonly<Record<number, ToothClinicalFinding>>;
	/** Стадии резорбции корней временных зубов: toothNumber -> ResorptionStagePercent (0, 25, 50, 75, 100) */
	readonly resorptionStages?: Readonly<Record<number, ResorptionStagePercent>> | undefined;
	/** Обработчик изменения стадии резорбции зуба */
	readonly onResorptionChange?: ((toothNumber: number, stage: ResorptionStagePercent) => void) | undefined;
	/** Обработчик быстрого изменения клинического состояния зуба (Mandate 8e: автономия врача в 1 клик) */
	readonly onToothFindingChange?: ((toothNumber: number, finding: ToothClinicalFinding) => void) | undefined;
	/** Выбранные поверхности для зубов (O, V, L, M, D) */
	readonly toothSurfaces?: Readonly<Record<number, readonly ToothSurfaceCode[]>> | undefined;
	/** Обработчик переключения поверхности зуба в 1 клик */
	readonly onSurfaceToggle?: ((toothNumber: number, surface: ToothSurfaceCode) => void) | undefined;
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
	resorptionStages = {},
	toothSurfaces = {},
	onResorptionChange,
	onToothFindingChange,
	onSurfaceToggle,
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

	// Квадранты для суверенного мобильного режима (Apple HIG: Natural Thumb Zone & Anti-Desktop-Squeeze)
	const quadrant5Teeth = useMemo<readonly PediatricToothItem[]>(() => {
		return isMixed ? [PERMANENT_SIX_TEETH[16]!, ...PRIMARY_UPPER_RIGHT] : PRIMARY_UPPER_RIGHT;
	}, [isMixed]);

	const quadrant6Teeth = useMemo<readonly PediatricToothItem[]>(() => {
		return isMixed ? [...PRIMARY_UPPER_LEFT, PERMANENT_SIX_TEETH[26]!] : PRIMARY_UPPER_LEFT;
	}, [isMixed]);

	const quadrant7Teeth = useMemo<readonly PediatricToothItem[]>(() => {
		return isMixed ? [...PRIMARY_LOWER_LEFT, PERMANENT_SIX_TEETH[36]!] : PRIMARY_LOWER_LEFT;
	}, [isMixed]);

	const quadrant8Teeth = useMemo<readonly PediatricToothItem[]>(() => {
		return isMixed ? [PERMANENT_SIX_TEETH[46]!, ...PRIMARY_LOWER_RIGHT] : PRIMARY_LOWER_RIGHT;
	}, [isMixed]);

	const getQuadrantKeyForTooth = (t: number | null | undefined): "q5" | "q6" | "q7" | "q8" => {
		if (!t) return "q5";
		if (t === 16 || (t >= 51 && t <= 55)) return "q5";
		if (t === 26 || (t >= 61 && t <= 65)) return "q6";
		if (t === 36 || (t >= 71 && t <= 75)) return "q7";
		if (t === 46 || (t >= 81 && t <= 85)) return "q8";
		return "q5";
	};

	const [activeMobileQuadrant, setActiveMobileQuadrant] = React.useState<"q5" | "q6" | "q7" | "q8">(() =>
		getQuadrantKeyForTooth(activeTooth),
	);

	React.useEffect(() => {
		if (activeTooth) {
			setActiveMobileQuadrant(getQuadrantKeyForTooth(activeTooth));
		}
	}, [activeTooth]);

	const mobileQuadrantsMeta = useMemo(
		() => [
			{ key: "q5" as const, labelRu: "Q5 Верх-Право", shortLabelRu: "Q5 В/П", jawRu: "Верхняя челюсть (справа)", teeth: quadrant5Teeth },
			{ key: "q6" as const, labelRu: "Q6 Верх-Лево", shortLabelRu: "Q6 В/Л", jawRu: "Верхняя челюсть (слева)", teeth: quadrant6Teeth },
			{ key: "q7" as const, labelRu: "Q7 Низ-Лево", shortLabelRu: "Q7 Н/Л", jawRu: "Нижняя челюсть (слева)", teeth: quadrant7Teeth },
			{ key: "q8" as const, labelRu: "Q8 Низ-Право", shortLabelRu: "Q8 Н/П", jawRu: "Нижняя челюсть (справа)", teeth: quadrant8Teeth },
		],
		[quadrant5Teeth, quadrant6Teeth, quadrant7Teeth, quadrant8Teeth],
	);

	const activeQuadrantObj = useMemo(() => {
		return mobileQuadrantsMeta.find((q) => q.key === activeMobileQuadrant) ?? mobileQuadrantsMeta[0]!;
	}, [mobileQuadrantsMeta, activeMobileQuadrant]);

	const renderToothButton = (tooth: PediatricToothItem, isMobileCard = false) => {
		const isSelected = activeTooth === tooth.toothNumber;
		const finding = toothFindings[tooth.toothNumber] ?? "Healthy";
		const isPrimary = tooth.isPrimary;
		const resorption = isPrimary && resorptionStages ? resorptionStages[tooth.toothNumber] : undefined;
		const surfaces = toothSurfaces[tooth.toothNumber] || [];
		const surfacesBadge = surfaces.length > 0 ? surfaces.join("") : "";

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

		const sizeClass = isMobileCard
			? "min-w-[50px] min-h-[56px] py-1.5 px-1 sm:min-w-0"
			: "min-w-[40px] sm:min-w-[42px] min-h-[44px] sm:min-h-[48px] p-1";

		return (
			<button
				key={`${isMobileCard ? "mob-" : ""}${tooth.toothNumber}`}
				type="button"
				onClick={() => onSelectTooth?.(tooth.toothNumber)}
				className={`relative flex flex-col items-center justify-center rounded-xl border transition-all select-none cursor-pointer touch-manipulation active:scale-95 ${sizeClass} ${
					isSelected
						? "border-teal-600 bg-teal-50/90 text-teal-950 shadow-sm ring-2 ring-teal-500/40 dark:border-teal-400 dark:bg-teal-950/70 dark:text-teal-100 font-extrabold z-10"
						: `${findingClass} hover:border-teal-400 hover:bg-[var(--paper-soft,#f8fafc)]`
				} ${!tooth.isPrimary ? "ring-1 ring-sky-500/30" : ""}`}
				title={`${tooth.toothNumber} — ${tooth.anatomicalNameRu}${findingBadge ? ` (${findingBadge})` : ""}${typeof resorption === "number" && resorption > 0 ? ` [Резорбция: ${resorption}%]` : ""}${surfacesBadge ? ` [Поверхности: ${surfacesBadge}]` : ""}`}
				data-testid={`pediatric-tooth-btn-${tooth.toothNumber}`}
			>
				{/* Permanent molar indicator badge */}
				{!tooth.isPrimary && (
					<span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded bg-sky-600 px-1 text-[8px] font-black uppercase text-white tracking-tighter">
						Пост
					</span>
				)}

				<span className={`font-mono font-black tracking-tight ${isMobileCard ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>
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

				{surfacesBadge && (
					<span
						className="mt-0.5 rounded px-1 text-[7px] font-mono font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 truncate max-w-full"
						title={`Поверхности: ${surfacesBadge}`}
						data-testid={`tooth-surfaces-badge-${tooth.toothNumber}`}
					>
						{surfacesBadge}
					</span>
				)}

				{/* Root resorption stage indicator badge for milk teeth */}
				{isPrimary && typeof resorption === "number" && resorption > 0 && (
					<span
						className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded px-1 text-[8px] font-mono font-black tracking-tight"
						style={{
							backgroundColor: RESORPTION_STAGE_DEFINITIONS[resorption]?.badgeBg ?? "rgba(239, 68, 68, 0.15)",
							color: RESORPTION_STAGE_DEFINITIONS[resorption]?.badgeColor ?? "#ef4444",
							border: `1px solid ${RESORPTION_STAGE_DEFINITIONS[resorption]?.badgeColor ?? "rgba(239, 68, 68, 0.35)"}`,
						}}
						title={`Резорбция корня: ${resorption}% (${RESORPTION_STAGE_DEFINITIONS[resorption]?.descriptionRu})`}
						data-testid={`tooth-resorption-badge-${tooth.toothNumber}`}
					>
						{`R${resorption}%`}
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
						className="inline-flex rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-0.5 gap-1"
						data-testid="pediatric-dentition-mode-toggle"
					>
						<button
							type="button"
							onClick={() => onModeChange?.("primary")}
							className={`min-h-[44px] sm:min-h-[32px] sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
								!isMixed
									? "shadow-xs"
									: "hover:text-[var(--ink,#0f172a)]"
							}`}
							style={{
								backgroundColor: !isMixed ? "var(--accent, #0d9488)" : "transparent",
								color: !isMixed ? "#ffffff" : "var(--muted, #64748b)",
							}}
							data-testid="mode-primary-btn"
							title="Только 20 молочных зубов (51–55, 61–65, 71–75, 81–85)"
						>
							Молочный (51–85)
						</button>
						<button
							type="button"
							onClick={() => onModeChange?.("mixed")}
							className={`min-h-[44px] sm:min-h-[32px] sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center justify-center ${
								isMixed
									? "shadow-xs"
									: "hover:text-[var(--ink,#0f172a)]"
							}`}
							style={{
								backgroundColor: isMixed ? "#0284c7" : "transparent",
								color: isMixed ? "#ffffff" : "var(--muted, #64748b)",
							}}
							data-testid="mode-mixed-btn"
							title="Сменный прикус: молочные + постоянные первые моляры 16, 26, 36, 46"
						>
							Сменный (+ 16, 26, 36, 46)
						</button>
					</div>

					{onSetAllHealthy && (
						<button
							type="button"
							onClick={onSetAllHealthy}
							className="min-h-[44px] sm:min-h-[32px] sm:h-7 px-2 rounded-lg border border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 touch-manipulation"
							title="Все молочные зубы здоровы (индекс кп=0)"
							data-testid="pediatric-all-healthy-btn"
						>
							<ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span className="hidden md:inline">Все интактны</span>
						</button>
					)}

					{onApplyMixedDentitionPreset && (
						<button
							type="button"
							onClick={onApplyMixedDentitionPreset}
							className="min-h-[44px] sm:min-h-[32px] sm:h-7 px-2 rounded-lg border border-sky-500/30 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 hover:bg-sky-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 touch-manipulation"
							title="Смена резцов и появление первых моляров 16, 26, 36, 46"
							data-testid="pediatric-mixed-preset-btn"
						>
							<ToothDeciduous className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
							<span className="hidden md:inline">Смена резцов</span>
						</button>
					)}
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* МОБИЛЬНЫЙ СУВЕРЕННЫЙ РЕЖИМ (APPLE HIG: ПЕРЕКЛЮЧАТЕЛЬ КВАДРАНТОВ) */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="sm:hidden mb-2" data-testid="pediatric-mobile-quadrant-view">
				<div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[var(--muted,#64748b)]">
					<span>Квадрант детского прикуса:</span>
					<span className="font-extrabold text-[var(--ink,#0f172a)]">{activeQuadrantObj.labelRu}</span>
				</div>

				{/* 4 тач-кнопки квадрантов */}
				<div className="grid grid-cols-2 gap-1.5 mb-2.5" data-testid="pediatric-quadrants-selector">
					{mobileQuadrantsMeta.map((q) => {
						const isQActive = activeMobileQuadrant === q.key;
						return (
							<button
								key={q.key}
								type="button"
								onClick={() => {
									setActiveMobileQuadrant(q.key);
									const firstTooth = q.teeth[0]?.toothNumber;
									if (firstTooth && onSelectTooth) {
										onSelectTooth(firstTooth);
									}
								}}
								className={`min-h-[44px] h-[44px] px-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-between cursor-pointer touch-manipulation select-none active:scale-[0.98] ${
									isQActive
										? "shadow-sm"
										: "hover:bg-[var(--paper-soft,#f8fafc)]"
								}`}
								style={{
									backgroundColor: isQActive ? "var(--accent, #0d9488)" : "var(--paper, #ffffff)",
									color: isQActive ? "#ffffff" : "var(--ink, #0f172a)",
									borderColor: isQActive ? "var(--accent, #0d9488)" : "var(--line, #e2e8f0)",
								}}
								data-testid={`pediatric-quadrant-btn-${q.key}`}
							>
								<span className="whitespace-nowrap">{q.labelRu}</span>
								<span
									className="text-[10px] font-mono shrink-0 ml-1"
									style={{ color: isQActive ? "rgba(255, 255, 255, 0.9)" : "var(--muted, #64748b)" }}
								>
									({q.teeth.length} з.)
								</span>
							</button>
						);
					})}
				</div>

				{/* Крупные зубы выбранного квадранта (ровно 5 или 6 в ряд без скролла) */}
				<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-2">
					<div className="mb-1.5 flex items-center justify-between text-[10px] uppercase font-bold text-[var(--muted,#64748b)]">
						<span>{activeQuadrantObj.jawRu}</span>
						<span>{activeQuadrantObj.teeth[0]?.type.startsWith("molar") ? "Моляры → Резцы" : "Резцы → Моляры"}</span>
					</div>
					<div
						className={`grid gap-1.5 justify-center ${
							activeQuadrantObj.teeth.length >= 6 ? "grid-cols-6" : "grid-cols-5"
						}`}
						data-testid="pediatric-mobile-teeth-grid"
					>
						{activeQuadrantObj.teeth.map((t) => renderToothButton(t, true))}
					</div>
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* ДЕСКТОПНЫЙ РЕЖИМ: ПОЛНЫЕ ДУГИ ВЕРХНЕЙ И НИЖНЕЙ ЧЕЛЮСТЕЙ       */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			<div className="hidden sm:block">
				{/* ЗУБНАЯ ДУГА: ВЕРХНЯЯ ЧЕЛЮСТЬ (ВЕРХНИЕ ЗУБЫ) */}
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
							{upperRow.map((t) => renderToothButton(t, false))}
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

				{/* ЗУБНАЯ ДУГА: НИЖНЯЯ ЧЕЛЮСТЬ (НИЖНИЕ ЗУБЫ) */}
				<div>
					<div className="overflow-x-auto pb-1">
						<div
							className={`grid gap-1 sm:gap-1.5 mx-auto justify-center ${
								isMixed ? "grid-cols-12 min-w-[520px]" : "grid-cols-10 min-w-[440px]"
							}`}
							data-testid="pediatric-lower-arch"
						>
							{lowerRow.map((t) => renderToothButton(t, false))}
						</div>
					</div>
					<div className="mt-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
						<span>Правый низ (Квадрант 8 / 4)</span>
						<span className="text-[11px] font-extrabold text-[var(--ink,#0f172a)]">Нижняя челюсть</span>
						<span>Левый низ (Квадрант 7 / 3)</span>
					</div>
				</div>
			</div>

			{/* ═════════════════════════════════════════════════════════════════ */}
			{/* БЫСТРАЯ СМЕНА СТАТУСА И РЕЗОРБЦИИ АКТИВНОГО ЗУБА (МАНДАТ 8e В 1 КЛИК) */}
			{/* ═════════════════════════════════════════════════════════════════ */}
			{activeTooth && (onToothFindingChange || onResorptionChange || onSurfaceToggle) && (
				<div
					className="mt-3 pt-2.5 border-t border-[var(--line,#e2e8f0)] flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"
					data-testid="pediatric-active-tooth-toolbar"
				>
					<div className="flex flex-col gap-1.5 sm:flex-row sm:items-center min-w-0">
						<span className="text-[11px] font-black uppercase text-[var(--muted,#64748b)] shrink-0">
							Зуб {activeTooth}:
						</span>
						{onToothFindingChange && (
							<div className="flex flex-wrap items-center gap-1.5" data-testid="active-tooth-findings-group">
								{(
									[
										{ id: "Healthy", label: "Здоров" },
										{ id: "Caries", label: "Кариес" },
										{ id: "Filled", label: "Пломба" },
										{ id: "EndoTreated", label: "Пульпотомия" },
										{ id: "Watch", label: "Фтор" },
										{ id: "Crown", label: "Коронка" },
										{ id: "Extracted", label: "Удалён" },
									] as const
								).map((st) => {
									const isCurrent = (toothFindings[activeTooth] ?? "Healthy") === st.id;
									return (
										<button
											key={st.id}
											type="button"
											onClick={() => onToothFindingChange(activeTooth, st.id)}
											className={`h-7 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer select-none active:scale-95 flex items-center justify-center shrink-0 ${
												isCurrent
													? "primary-button shadow-xs"
													: "secondary-button hover:bg-[var(--paper-soft,#f8fafc)]"
											}`}
											data-testid={`active-tooth-finding-${st.id}`}
										>
											{st.label}
										</button>
									);
								})}
							</div>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{onSurfaceToggle && (
							<details
								className="group/surfaces relative rounded-xl sm:rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-zinc-850 px-2.5 sm:px-2 py-1 sm:py-0.5 text-xs shrink-0"
								data-testid="pediatric-surfaces-disclosure"
							>
								<summary
									className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] sm:text-[10px] font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors list-none min-h-[36px] sm:min-h-0"
									title="Указать анатомические поверхности коронки (опционально)"
								>
									<span>Поверхности</span>
									{(toothSurfaces[activeTooth] || []).length > 0 && (
										<span className="font-mono text-[10px] sm:text-[9px] font-bold text-teal-600 dark:text-teal-400">
											[{(toothSurfaces[activeTooth] || []).join("")}]
										</span>
									)}
									<span className="text-[8px] text-[var(--muted,#64748b)] transition-transform group-open/surfaces:rotate-180">
										▼
									</span>
								</summary>
								<div
									className="flex flex-wrap items-center gap-1 pt-1.5 pb-0.5"
									data-testid="active-tooth-surfaces-group"
								>
									{(
										[
											{ id: "O", label: "O (Ж)", title: "Окклюзионная (жевательная)" },
											{ id: "V", label: "V (В)", title: "Вестибулярная (щечная/губная)" },
											{ id: "L", label: "L (Я)", title: "Язычная / нёбная" },
											{ id: "M", label: "M (М)", title: "Медиальная" },
											{ id: "D", label: "D (Д)", title: "Дистальная" },
										] as const
									).map((sf) => {
										const currentSurfaces = toothSurfaces[activeTooth] || [];
										const isSelected = currentSurfaces.includes(sf.id);
										return (
											<button
												key={sf.id}
												type="button"
												onClick={() => onSurfaceToggle(activeTooth, sf.id)}
												className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-5 px-2 sm:px-1.5 rounded-xl sm:rounded text-xs sm:text-[10px] font-mono font-medium border transition cursor-pointer select-none active:scale-95 flex items-center justify-center ${
													isSelected
														? "bg-zinc-700 text-white border-zinc-700 shadow-xs dark:bg-zinc-600"
														: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]"
												}`}
												title={sf.title}
												data-testid={`active-tooth-surface-${sf.id}`}
											>
												{sf.label}
											</button>
										);
									})}
								</div>
							</details>
						)}

						{isPrimaryTooth(activeTooth) && onResorptionChange && (
							<div className="flex items-center gap-1 shrink-0" data-testid="active-tooth-resorption-group">
								<span className="text-[11px] sm:text-[10px] font-black uppercase text-[var(--muted,#64748b)] mr-0.5">
									Резорбция:
								</span>
								{([0, 25, 50, 75, 100] as const).map((r) => {
									const currentRes = resorptionStages?.[activeTooth] ?? 0;
									const isCurrent = currentRes === r;
									return (
										<button
											key={r}
											type="button"
											onClick={() => onResorptionChange(activeTooth, r)}
											className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-6 px-2 sm:px-1.5 rounded-xl sm:rounded text-xs sm:text-[10px] font-mono font-bold border transition cursor-pointer select-none active:scale-95 flex items-center justify-center ${
												isCurrent
													? "shadow-xs"
													: "hover:bg-[var(--paper-soft,#f8fafc)]"
											}`}
											style={{
												backgroundColor: isCurrent ? "#e11d48" : "var(--paper, #ffffff)",
												color: isCurrent ? "#ffffff" : "var(--ink, #0f172a)",
												borderColor: isCurrent ? "#e11d48" : "var(--line, #e2e8f0)",
											}}
											title={`Резорбция ${r}%: ${RESORPTION_STAGE_DEFINITIONS[r]?.descriptionRu}`}
											data-testid={`active-tooth-resorption-${r}`}
										>
											{r}%
										</button>
									);
								})}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default PediatricTeethChart;
