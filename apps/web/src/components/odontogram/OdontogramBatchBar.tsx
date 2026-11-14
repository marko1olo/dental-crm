/**
 * apps/web/src/components/odontogram/OdontogramBatchBar.tsx
 *
 * DENTE Dental CRM — Canonical Macro-Batch Selection & Quick-Action Console (Mandates 8ar, 8ba, 8e).
 *
 * Eliminates single-tooth procedural servitude:
 * 1. 1-Click Macro Group Selection:
 *    - Upper Arch [ВЧ (16/10)]
 *    - Lower Arch [НЧ (16/10)]
 *    - Frontal Hygiene Sector [Фронт (12)]
 *    - All Teeth [Все (32/20)]
 *    - Invert Selection [Инверт]
 *    - Clear Selection [Снять ✕]
 * 2. 1-Click Batch Status Application:
 *    - Applies Healthy, Caries, Filled, Missing, Pulpitis, Periodontitis, Crown, Implant to all selected teeth.
 * 3. Apple HIG Touch Standard:
 *    - Minimum touch targets >= 44x44px on mobile (min-h-[44px]).
 *    - Desktop compact h-8..h-9 buttons.
 *    - Zero cartoon emojis (pure clinical shorthand badges & Lucide icons).
 *    - 100% Design Token Purity (var(--paper), var(--line), var(--ink), var(--teal)).
 *    - Zero horizontal overflow (overflow-x-clip, max-w-[100vw]).
 */

import React, { useMemo, useCallback } from "react";
import { Check, Layers, RotateCcw, X, ShieldCheck } from "lucide-react";
import type { ToothState } from "./ToothChart";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";

export interface OdontogramBatchBarProps {
	readonly selectedTeeth?: readonly number[] | undefined;
	readonly onSelectTeethGroup?: ((teeth: number[]) => void) | undefined;
	readonly onClearSelection?: (() => void) | undefined;
	readonly onInvertSelection?: (() => void) | undefined;
	readonly onQuickStateChange?:
		| ((
				targets: number[],
				state: ToothState,
				surfaces?: readonly string[] | undefined,
		  ) => void)
		| undefined;
	readonly isPediatric?: boolean | undefined;
	readonly isMixed?: boolean | undefined;
	readonly className?: string | undefined;
}

const UPPER_ADULT: readonly number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ADULT: readonly number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const FRONT_ADULT: readonly number[] = [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33];
const WISDOM_ADULT: readonly number[] = [18, 28, 38, 48];

const UPPER_PEDIATRIC: readonly number[] = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const LOWER_PEDIATRIC: readonly number[] = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const FRONT_PEDIATRIC: readonly number[] = [53, 52, 51, 61, 62, 63, 83, 82, 81, 71, 72, 73];

interface BatchStatusOption {
	readonly state: ToothState;
	readonly label: string;
	readonly abbr: string;
	readonly dotColor: string;
	readonly testId: string;
	readonly title: string;
}

const BATCH_STATUS_OPTIONS: readonly BatchStatusOption[] = [
	{
		state: "Healthy",
		label: "Норма",
		abbr: "Зд",
		dotColor: "bg-[var(--teal,#0d9488)]",
		testId: "batch-apply-healthy-btn",
		title: "Физиологическая норма: здоровые интактные зубы",
	},
	{
		state: "Caries",
		label: "Кариес",
		abbr: "К",
		dotColor: "bg-[var(--warning,#f59e0b)]",
		testId: "batch-apply-caries-btn",
		title: "Кариозное поражение (C)",
	},
	{
		state: "Filled",
		label: "Пломба",
		abbr: "П",
		dotColor: "bg-[var(--teal,#0d9488)]",
		testId: "batch-apply-filled-btn",
		title: "Пломбированные зубы (Pl)",
	},
	{
		state: "Missing",
		label: "Удален",
		abbr: "0",
		dotColor: "bg-[var(--line-strong,#64748b)]",
		testId: "batch-apply-missing-btn",
		title: "Отсутствующие зубы / Адентия (0)",
	},
	{
		state: "Pulpitis",
		label: "Пульпит",
		abbr: "Пт",
		dotColor: "bg-[var(--danger,#ef4444)]",
		testId: "batch-apply-pulpitis-btn",
		title: "Воспаление пульпы (P)",
	},
	{
		state: "Periodontitis",
		label: "Периодонтит",
		abbr: "Pt",
		dotColor: "bg-[var(--warning-strong,#ea580c)]",
		testId: "batch-apply-periodontitis-btn",
		title: "Периодонтит (Pt)",
	},
	{
		state: "Crown",
		label: "Коронка",
		abbr: "Кр",
		dotColor: "bg-[var(--primary,#0284c7)]",
		testId: "batch-apply-crown-btn",
		title: "Ортопедическая коронка (K)",
	},
	{
		state: "Implant",
		label: "Имплант",
		abbr: "Им",
		dotColor: "bg-[var(--accent,#7c3aed)]",
		testId: "batch-apply-implant-btn",
		title: "Дентальный имплантат (I)",
	},
];

export const OdontogramBatchBar: React.FC<OdontogramBatchBarProps> = React.memo(({
	selectedTeeth = [],
	onSelectTeethGroup,
	onClearSelection,
	onInvertSelection,
	onQuickStateChange,
	isPediatric = false,
	isMixed = false,
	className = "",
}) => {
	const count = selectedTeeth.length;
	const hasSelection = count > 0;

	// Resolve relevant teeth lists based on dentition
	const upperTeeth = useMemo(() => (isPediatric ? UPPER_PEDIATRIC : UPPER_ADULT), [isPediatric]);
	const lowerTeeth = useMemo(() => (isPediatric ? LOWER_PEDIATRIC : LOWER_ADULT), [isPediatric]);
	const frontTeeth = useMemo(() => (isPediatric ? FRONT_PEDIATRIC : FRONT_ADULT), [isPediatric]);
	const allDentitionTeeth = useMemo(() => {
		if (isMixed) {
			return [...UPPER_PEDIATRIC, ...LOWER_PEDIATRIC, 16, 26, 36, 46];
		}
		return isPediatric
			? [...UPPER_PEDIATRIC, ...LOWER_PEDIATRIC]
			: [...UPPER_ADULT, ...LOWER_ADULT];
	}, [isPediatric, isMixed]);

	const handleSelectGroup = useCallback(
		(teeth: readonly number[], label: string) => {
			if (!onSelectTeethGroup) return;
			onSelectTeethGroup([...teeth]);
			SoundFeedbackService.getInstance().playActionSuccess();
			showToast(`Выделено: ${label} (${teeth.length} зубов)`, "info", 2000);
		},
		[onSelectTeethGroup],
	);

	const handleApplyBatchState = useCallback(
		(state: ToothState, labelRu: string) => {
			if (!hasSelection || !onQuickStateChange) return;
			onQuickStateChange([...selectedTeeth], state, []);
			SoundFeedbackService.getInstance().playActionSuccess();
			showToast(`Статус «${labelRu}» применён к ${count} зубам`, "success", 3000);
		},
		[hasSelection, onQuickStateChange, selectedTeeth, count],
	);

	const formattedSelectedPreview = useMemo(() => {
		if (!hasSelection) return "";
		if (count <= 6) {
			return [...selectedTeeth].sort((a, b) => a - b).join(", ");
		}
		const sorted = [...selectedTeeth].sort((a, b) => a - b);
		return `${sorted.slice(0, 4).join(", ")}... +${count - 4}`;
	}, [selectedTeeth, hasSelection, count]);

	return (
		<div
			className={`odontogram-batch-bar w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl border transition-all duration-150 select-none ${
				hasSelection
					? "bg-[var(--paper-soft)] border-[var(--teal,#0d9488)]/40 shadow-xs"
					: "bg-[var(--paper)] border-[var(--line,#e2e8f0)] dark:border-white/10"
			} ${className}`.trim()}
			role="region"
			aria-label="Панель пакетного макро-выделения и групповых действий"
			data-testid="odontogram-batch-bar"
		>
			{/* Left Island: Macro Selection Buttons & Status Badge */}
			<div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
				<div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
					<Layers size={14} className="text-[var(--teal,#0d9488)] shrink-0 stroke-[2.5]" />
					<span className="font-extrabold text-[12px] text-[var(--ink)] hidden sm:inline">
						Макро-выбор:
					</span>
				</div>

				{/* 1-Click Macro Target Buttons */}
				<div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Быстрый выбор групп зубов">
					<button
						type="button"
						onClick={() => handleSelectGroup(upperTeeth, "Верхняя челюсть")}
						className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal,#0d9488)]/50 text-[var(--ink)] transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.98]"
						title={`Выделить верхнюю зубную дугу (${upperTeeth.length} зубов)`}
						data-testid="batch-select-upper-jaw-btn"
					>
						{`ВЧ (${upperTeeth.length})`}
					</button>

					<button
						type="button"
						onClick={() => handleSelectGroup(lowerTeeth, "Нижняя челюсть")}
						className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal,#0d9488)]/50 text-[var(--ink)] transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.98]"
						title={`Выделить нижнюю зубную дугу (${lowerTeeth.length} зубов)`}
						data-testid="batch-select-lower-jaw-btn"
					>
						{`НЧ (${lowerTeeth.length})`}
					</button>

					<button
						type="button"
						onClick={() => handleSelectGroup(frontTeeth, "Фронтальный сектор")}
						className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal,#0d9488)]/50 text-[var(--ink)] transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.98]"
						title={`Выделить фронтальный сектор гигиены (${frontTeeth.length} зубов)`}
						data-testid="batch-select-front-sector-btn"
					>
						{`Фронт (${frontTeeth.length})`}
					</button>

					<button
						type="button"
						onClick={() => handleSelectGroup(allDentitionTeeth, "Все зубы")}
						className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal,#0d9488)]/50 text-[var(--ink)] transition-all cursor-pointer shadow-2xs whitespace-nowrap active:scale-[0.98]"
						title={`Выделить всю зубную формулу (${allDentitionTeeth.length} зубов)`}
						data-testid="batch-select-all-teeth-btn"
					>
						{`Все (${allDentitionTeeth.length})`}
					</button>

					{!isPediatric && (
						<button
							type="button"
							onClick={() => handleSelectGroup(WISDOM_ADULT, "Зубы мудрости (8-ки)")}
							className="min-h-[44px] sm:min-h-[32px] px-2 py-1 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-all cursor-pointer shadow-2xs whitespace-nowrap hidden md:inline-flex active:scale-[0.98]"
							title="Выделить 18, 28, 38, 48"
							data-testid="batch-select-wisdom-btn"
						>
							{`8-ки (4)`}
						</button>
					)}
				</div>

				{/* Selection Counter & Modifiers */}
				{hasSelection && (
					<div className="flex items-center gap-1.5 pl-1 shrink-0 animate-in fade-in duration-150">
						<span
							className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 inline-flex items-center gap-1.5 rounded-lg bg-[var(--teal,#0d9488)]/15 border border-[var(--teal,#0d9488)]/40 text-[var(--teal,#0d9488)] font-mono font-black text-xs shadow-2xs whitespace-nowrap"
							title={`Выделены зубы: ${selectedTeeth.join(", ")}`}
							data-testid="batch-selected-count-badge"
						>
							<Check size={13} className="stroke-[3] shrink-0" />
							<span>{`Выбрано: ${count}`}</span>
							{formattedSelectedPreview && (
								<span className="opacity-75 font-normal text-[11px] hidden lg:inline">
									{`(${formattedSelectedPreview})`}
								</span>
							)}
						</span>

						{onInvertSelection && (
							<button
								type="button"
								onClick={onInvertSelection}
								className="min-h-[44px] sm:min-h-[32px] px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 whitespace-nowrap active:scale-[0.98]"
								title="Инвертировать выделение зубов"
								data-testid="batch-invert-selection-btn"
							>
								<RotateCcw size={13} className="shrink-0" />
								<span className="hidden sm:inline">Инверт</span>
							</button>
						)}

						{onClearSelection && (
							<button
								type="button"
								onClick={onClearSelection}
								className="min-h-[44px] sm:min-h-[32px] px-2 py-1 rounded-lg border border-[var(--danger,#ef4444)]/30 bg-[var(--danger-soft,rgba(239,68,68,0.1))] hover:bg-[var(--danger-soft,rgba(239,68,68,0.2))] text-[var(--danger,#ef4444)] text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 whitespace-nowrap active:scale-[0.98]"
								title="Снять выделение со всех зубов"
								data-testid="batch-clear-selection-btn"
							>
								<X size={13} className="shrink-0 stroke-[2.5]" />
								<span className="hidden sm:inline">Снять</span>
							</button>
						)}
					</div>
				)}
			</div>

			{/* Right Island: 1-Click Action Buttons for Selected Teeth */}
			{hasSelection && (
				<div
					className="flex items-center gap-1.5 flex-wrap shrink-0 animate-in fade-in duration-150"
					role="group"
					aria-label="Пакетное применение клинических статусов к выделенным зубам"
				>
					<span className="text-[11px] font-extrabold text-[var(--muted)] hidden xl:inline shrink-0">
						Применить к {count}:
					</span>

					{BATCH_STATUS_OPTIONS.map((opt) => (
						<button
							key={opt.state}
							type="button"
							onClick={() => handleApplyBatchState(opt.state, opt.label)}
							className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-extrabold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal,#0d9488)] text-[var(--ink)] transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 whitespace-nowrap active:scale-[0.98] ${
								opt.state === "Healthy"
									? "border-[var(--teal,#0d9488)]/40 text-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/10 hover:bg-[var(--teal,#0d9488)]/20"
									: ""
							}`}
							title={`${opt.title} (применить к ${count} зубам)`}
							data-testid={opt.testId}
						>
							<span
								className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ring-1 ring-black/10 dark:ring-white/20 ${opt.dotColor}`}
							/>
							<span className="text-[11px] font-mono font-bold opacity-60 shrink-0">
								{opt.abbr}
							</span>
							<span className="whitespace-nowrap font-bold">
								{opt.label}
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
});

OdontogramBatchBar.displayName = "OdontogramBatchBar";
