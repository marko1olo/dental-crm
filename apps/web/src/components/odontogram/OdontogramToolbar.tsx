import React, { useEffect, useRef, useState } from "react";
import {
	Activity,
	ChevronDown,
	Coins,
	Eye,
	EyeOff,
	FileText,
	Mic,
	MicOff,
	MoreVertical,
	Paintbrush,
	Sparkles,
	Stethoscope,
	Trash2,
	Zap,
} from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import type { ToothState, DentitionMode } from "./ToothChart";

export interface OdontogramViewOption {
	mode: OdontogramViewMode;
	label: string;
	shortLabel: string;
	icon: React.ReactNode;
	tooltip: string;
	badge?: string;
}

export const ODONTOGRAM_VIEW_MODES: readonly OdontogramViewOption[] = [
	{
		mode: "anatomical_svg",
		label: "3D Анатомический",
		shortLabel: "3D Анатомический",
		icon: <Sparkles size={14} className="text-indigo-500 shrink-0" />,
		tooltip: "Векторная анатомическая визуализация коронок, корней и каналов",
		badge: "3D",
	},
	{
		mode: "compact_clinical",
		label: "Клинический 6-поверхностный",
		shortLabel: "6-Поверхностный",
		icon: <Zap size={14} className="text-amber-500 shrink-0" />,
		tooltip: "Быстрая разметка патологий по 6 граням зуба (O, V, L/P, M, D, C)",
		badge: "FDI",
	},
	{
		mode: "classic_gost",
		label: "ГОСТ 043/у",
		shortLabel: "ГОСТ 043/у",
		icon: <FileText size={14} className="text-[var(--teal,#0d9488)] shrink-0" />,
		tooltip: "Табличная форма карты стоматологического больного (Минздрав РФ)",
		badge: "МЗ РФ",
	},
] as const;

export interface OdontogramToolbarProps {
	activeMode: OdontogramViewMode;
	onModeChange: (mode: OdontogramViewMode) => void;
	dentitionMode?: DentitionMode | undefined;
	onDentitionModeChange?: ((mode: DentitionMode) => void) | undefined;
	activeStampTool: ToothState | null;
	onStampToolChange: (stamp: ToothState | null) => void;
	isMultiSelectMode?: boolean | undefined;
	onToggleMultiSelect?: ((enabled: boolean) => void) | undefined;
	onTriggerSanitation?: (() => void) | undefined;
	onMarkIntactDentition?: (() => void) | undefined;
	onMarkWisdomTeethMissing?: (() => void) | undefined;
	onMarkMolarsMissing?: (() => void) | undefined;
	onMarkFrontIntact?: (() => void) | undefined;
	onMarkProHygieneDone?: (() => void) | undefined;
	onApplyFastCariesK021?: (() => void) | undefined;
	onOpenPediatricModal?: (() => void) | undefined;
	onTogglePerio?: (() => void) | undefined;
	isPerioOpen?: boolean | undefined;
	onLoadDiagnocat?: (() => void) | undefined;
	diagnocatLoading?: boolean | undefined;
	showWisdomTeeth: boolean;
	onToggleWisdomTeeth: () => void;
	showPulpAndCanals: boolean;
	onTogglePulpAndCanals: () => void;
	isFastExtractMode: boolean;
	onToggleFastExtract: () => void;
	isLiveInvoiceOpen: boolean;
	onToggleLiveInvoice: () => void;
	isVoiceListening: boolean;
	onToggleVoiceDictation: () => void;
	onOpenJawModal?: ((target: "JU" | "JL" | "C") => void) | undefined;
	className?: string | undefined;
}

export const OdontogramToolbar: React.FC<OdontogramToolbarProps> = ({
	activeMode,
	onModeChange,
	dentitionMode = "adult",
	onDentitionModeChange,
	activeStampTool,
	onStampToolChange,
	isMultiSelectMode,
	onToggleMultiSelect,
	onTriggerSanitation,
	onMarkIntactDentition,
	onMarkWisdomTeethMissing,
	onMarkMolarsMissing,
	onMarkFrontIntact,
	onMarkProHygieneDone,
	onApplyFastCariesK021,
	onOpenPediatricModal,
	onTogglePerio,
	isPerioOpen,
	onLoadDiagnocat,
	diagnocatLoading,
	showWisdomTeeth,
	onToggleWisdomTeeth,
	showPulpAndCanals,
	onTogglePulpAndCanals,
	isFastExtractMode,
	onToggleFastExtract,
	isLiveInvoiceOpen,
	onToggleLiveInvoice,
	isVoiceListening,
	onToggleVoiceDictation,
	onOpenJawModal,
	className = "",
}) => {
	const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);
	const toolsRef = useRef<HTMLDivElement | null>(null);

	// Close menu on click outside or Escape, and reset active stamp tool on Escape (Mandates 8e, 8k)
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (isToolsOpen && toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
				setIsToolsOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (isToolsOpen) {
					setIsToolsOpen(false);
				}
				if (activeStampTool) {
					onStampToolChange(null);
				}
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isToolsOpen, activeStampTool, onStampToolChange]);

	return (
		<div
			className={`odontogram-toolbar flex items-center gap-1.5 py-0.5 min-h-[34px] max-h-[36px] h-[36px] border-b border-[var(--odontogram-border-subtle,#e2e8f0)] w-full overflow-x-auto flex-nowrap scrollbar-none select-none ${className}`.trim()}
			role="toolbar"
			aria-label="Панель инструментов зубной формулы"
			data-testid="odontogram-toolbar"
			style={{ minHeight: "34px", maxHeight: "36px", height: "36px" }}
		>
			{/* 1. View Mode Segmented Controls */}
			<div className="flex items-center gap-1 shrink-0">
				<div
					className="inline-flex items-center p-0.5 rounded-lg bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0"
					role="radiogroup"
					aria-label="Режимы отображения"
				>
					{ODONTOGRAM_VIEW_MODES.map((option) => {
						const isActive = activeMode === option.mode;
						return (
							<button
								key={option.mode}
								type="button"
								role="radio"
								aria-checked={isActive}
								title={option.tooltip}
								data-testid={`odontogram-mode-btn-${option.mode}`}
								onClick={() => onModeChange(option.mode)}
								className={`min-h-[32px] h-[32px] flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer select-none shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
									isActive
										? "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] shadow-xs font-black border border-[var(--odontogram-border,#cbd5e1)]"
										: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-paper,#ffffff)]/60"
								}`}
							>
								{option.icon}
								<span>{option.shortLabel}</span>
								{option.badge && (
									<span
										className={`text-[10px] px-1 py-0.2 rounded font-black tracking-tight ${
											isActive
												? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 font-mono"
												: "bg-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink-muted,#64748b)]"
										}`}
									>
										{option.badge}
									</span>
								)}
							</button>
						);
					})}
				</div>

				{/* Dentition Formula 1-Click Toggle */}
				{onDentitionModeChange && (
					<div
						className="inline-flex items-center p-0.5 rounded-lg bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0"
						role="group"
						aria-label="Тип прикуса"
					>
						<button
							type="button"
							onClick={() => onDentitionModeChange("adult")}
							className={`min-h-[32px] h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
								dentitionMode === "adult"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black shadow-xs"
									: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
							}`}
							title="Постоянный прикус взрослых (11–48, 32 зуба)"
							data-testid="toolbar-dentition-adult"
						>
							11–48
						</button>
						<button
							type="button"
							onClick={() => onDentitionModeChange("pediatric")}
							className={`min-h-[32px] h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
								dentitionMode === "pediatric"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black shadow-xs"
									: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
							}`}
							title="Детский молочный прикус (51–85, 20 зубов)"
							data-testid="toolbar-dentition-pediatric"
						>
							51–85
						</button>
						<button
							type="button"
							onClick={() => onDentitionModeChange("mixed")}
							className={`min-h-[32px] h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
								dentitionMode === "mixed"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black shadow-xs"
									: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
							}`}
							title="Сменный прикус: 20 молочных + 4 первых постоянных моляра (24 зуба)"
							data-testid="toolbar-dentition-mixed"
						>
							Сменный
						</button>
					</div>
				)}

				{/* 3 Jaw / Occlusion 1-Click Buttons (JU, JL, C) */}
				{onOpenJawModal && (
					<div
						className="inline-flex items-center p-0.5 rounded-lg bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0"
						role="group"
						aria-label="Челюсти и прикус"
					>
						<button
							type="button"
							onClick={() => onOpenJawModal("JU")}
							className="min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15"
							title="Верхняя челюсть (JU / Maxilla): адентия, атрофия, синус-лифтинг"
							data-testid="toolbar-jaw-ju-btn"
						>
							В/Ч
						</button>
						<button
							type="button"
							onClick={() => onOpenJawModal("JL")}
							className="min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15"
							title="Нижняя челюсть (JL / Mandibula): адентия, атрофия, экзостозы"
							data-testid="toolbar-jaw-jl-btn"
						>
							Н/Ч
						</button>
						<button
							type="button"
							onClick={() => onOpenJawModal("C")}
							className="min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 text-purple-700 dark:text-purple-300 hover:bg-purple-500/15"
							title="Прикус / Окклюзия (C): ортогнатический, дистальный, мезиальный, глубокий"
							data-testid="toolbar-jaw-c-btn"
						>
							Прикус
						</button>
					</div>
				)}

				{/* Shift Multi-Select Group Checkbox */}
				{onToggleMultiSelect && (
					<label
						className={`flex items-center gap-1 min-h-[32px] h-[32px] text-xs font-bold cursor-pointer select-none px-2 py-1 rounded-lg border transition-colors shrink-0 ${
							isMultiSelectMode
								? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-black"
								: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)]"
						}`}
					>
						<input
							type="checkbox"
							checked={isMultiSelectMode ?? false}
							onChange={(e) => onToggleMultiSelect(e.target.checked)}
							className="accent-indigo-500 rounded cursor-pointer shrink-0"
						/>
						<span className="whitespace-nowrap">Группа</span>
					</label>
				)}

				{/* 1-Click Total Sanitation / Intact Action Trigger (Mandates 8e, 8k) */}
				<button
					type="button"
					onClick={() => {
						if (onMarkIntactDentition) onMarkIntactDentition();
						else if (onTriggerSanitation) onTriggerSanitation();
					}}
					className="min-h-[32px] h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1 active:scale-98"
					title="1-клик Санирован / Интактный зубной ряд: все 32 зуба моментально помечаются здоровыми (медосмотр, бассейн, военкомат)"
					data-testid="mark-intact-dentition-btn"
				>
					<Zap size={13} className="text-emerald-600 dark:text-emerald-400" />
					<span className="whitespace-nowrap">Санирован</span>
				</button>

				{/* 1-Click Wisdom Teeth Missing (Адентия 8-ок: 18, 28, 38, 48) */}
				<button
					type="button"
					onClick={() => onMarkWisdomTeethMissing?.()}
					className="min-h-[32px] h-[32px] px-2.5 py-1 rounded-lg text-xs font-black bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-800 dark:text-zinc-200 border border-zinc-500/30 transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1 active:scale-98"
					title="1-клик Адентия зубов мудрости: зубы 18, 28, 38, 48 моментально помечаются отсутствующими/удаленными"
					data-testid="mark-wisdom-missing-btn"
				>
					<Zap size={13} className="text-zinc-500" />
					<span className="whitespace-nowrap">Без 8-ок</span>
				</button>

				{/* 1-Click Molars Missing (Вторичная адентия первых моляров: 16, 26, 36, 46) */}
				<button
					type="button"
					onClick={() => onMarkMolarsMissing?.()}
					className="min-h-[32px] h-[32px] px-2 py-1 rounded-lg text-xs font-black bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1 active:scale-98"
					title="1-клик Вторичная адентия моляров: зубы 16, 26, 36, 46 моментально помечаются удаленными"
					data-testid="mark-molars-missing-btn"
				>
					<Zap size={13} className="text-amber-600 dark:text-amber-400" />
					<span className="whitespace-nowrap">Без моляров</span>
				</button>

				{/* 1-Click Front Intact (Интактный фронт: 13–23, 33–43) */}
				<button
					type="button"
					onClick={() => onMarkFrontIntact?.()}
					className="min-h-[32px] h-[32px] px-2 py-1 rounded-lg text-xs font-black bg-teal-500/15 hover:bg-teal-500/25 text-teal-800 dark:text-teal-200 border border-teal-500/30 transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1 active:scale-98"
					title="1-клик Интактный фронт: резцы и клыки 13–23, 33–43 моментально помечаются здоровыми"
					data-testid="mark-front-intact-btn"
				>
					<Zap size={13} className="text-teal-600 dark:text-teal-400" />
					<span className="whitespace-nowrap">Интактный фронт</span>
				</button>
			</div>

			<div className="h-5 w-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0 mx-0.5" />

			{/* 2. Rapid Stamp: Quick 1-Click Stamps (Кариес / Пульпит / Периодонтит / Пломба / Коронка / Имплант / Здоров / Удален) */}
			<div
				className="flex items-center gap-1 shrink-0 p-0.5 rounded-lg bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] overflow-x-auto max-w-full"
				role="group"
				aria-label="Режим 1-клик штампа патологий"
			>
				<div className="flex items-center gap-1 px-1.5 text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] shrink-0">
					<Paintbrush size={14} className={activeStampTool ? "text-indigo-600 dark:text-indigo-400 animate-pulse" : ""} />
					<span className="hidden xl:inline font-black">Штамп:</span>
				</div>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Caries" ? null : "Caries")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Caries"
							? "bg-amber-600 text-white font-black shadow-xs ring-2 ring-amber-400"
							: "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 border border-amber-500/20"
					}`}
					title="Штамп 1-клик: Кариес (К)"
					data-testid="stamp-caries-btn"
				>
					Кариес
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Pulpitis" ? null : "Pulpitis")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Pulpitis"
							? "bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-400"
							: "bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border border-rose-500/20"
					}`}
					title="Штамп 1-клик: Пульпит (Ф)"
					data-testid="stamp-pulpitis-btn"
				>
					Пульпит
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Periodontitis" ? null : "Periodontitis")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Periodontitis"
							? "bg-orange-600 text-white font-black shadow-xs ring-2 ring-orange-400"
							: "bg-orange-500/10 text-orange-800 dark:text-orange-200 hover:bg-orange-500/20 border border-orange-500/20"
					}`}
					title="Штамп 1-клик: Периодонтит (Пт)"
					data-testid="stamp-periodontitis-btn"
				>
					Периодонтит
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Filled" ? null : "Filled")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Filled"
							? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black shadow-xs ring-2 ring-[var(--teal)]/60"
							: "bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] hover:opacity-90 border border-[var(--teal,#0d9488)]/30"
					}`}
					title="Штамп 1-клик: Пломба (П)"
					data-testid="stamp-filled-btn"
				>
					Пломба
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Crown" ? null : "Crown")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Crown"
							? "bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-400"
							: "bg-blue-500/10 text-blue-800 dark:text-blue-200 hover:bg-blue-500/20 border border-blue-500/20"
					}`}
					title="Штамп 1-клик: Коронка (Кр)"
					data-testid="stamp-crown-btn"
				>
					Коронка
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Implant" ? null : "Implant")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Implant"
							? "bg-amber-600 text-white font-black shadow-xs ring-2 ring-amber-400"
							: "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 border border-amber-500/20"
					}`}
					title="Штамп 1-клик: Имплантат (И)"
					data-testid="stamp-implant-btn"
				>
					Имплант
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Healthy" ? null : "Healthy")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Healthy"
							? "bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400"
							: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 border border-emerald-500/20"
					}`}
					title="Штамп 1-клик: Здоров (З)"
					data-testid="stamp-healthy-btn"
				>
					Здоров
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Missing" ? null : "Missing")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Missing"
							? "bg-zinc-800 text-white font-black shadow-xs ring-2 ring-zinc-500"
							: "bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-500/20 border border-zinc-500/20"
					}`}
					title="Штамп 1-клик: Отсутствует (X)"
					data-testid="stamp-missing-btn"
				>
					Удален
				</button>
				{activeStampTool && (
					<button
						type="button"
						onClick={() => onStampToolChange(null)}
						className="min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all cursor-pointer shrink-0 border border-[var(--odontogram-border-subtle,#e2e8f0)]"
						title="Сбросить режим штампа (Esc)"
						data-testid="stamp-reset-btn"
					>
						Сброс
					</button>
				)}
			</div>

			<div className="h-5 w-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0 mx-0.5" />

			{/* 3. Compact Dropdown Menu [⋮ Инструменты] (Diagnocat, Восьмерки, Аудиодиктофон, Живой счет) */}
			<div ref={toolsRef} className="relative inline-flex items-center shrink-0">
				<button
					type="button"
					onClick={() => setIsToolsOpen((prev) => !prev)}
					className={`min-h-[32px] h-[32px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
						isToolsOpen || isVoiceListening || isLiveInvoiceOpen || isFastExtractMode || showWisdomTeeth
							? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-400/40 shadow-xs font-black"
							: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:text-[var(--odontogram-ink,#0f172a)]"
					}`}
					title="Дополнительные инструменты и модули зубной формулы"
					aria-expanded={isToolsOpen}
					aria-haspopup="menu"
					data-testid="odontogram-tools-dropdown-btn"
				>
					<MoreVertical size={14} className="shrink-0" />
					<span>Инструменты</span>
					<ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${isToolsOpen ? "rotate-180" : ""}`} />
				</button>

				{isToolsOpen && (
					<div
						className="absolute right-0 top-full mt-1 w-64 p-2 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#cbd5e1)] shadow-xl z-50 flex flex-col gap-1 text-xs text-[var(--ink,#0f172a)] backdrop-blur-md"
						role="menu"
						aria-label="Меню инструментов зубной формулы"
					>
						{/* 1-Click Intact Dentition in Tools */}
						{(onMarkIntactDentition || onTriggerSanitation) && (
							<button
								type="button"
								onClick={() => {
									if (onMarkIntactDentition) onMarkIntactDentition();
									else if (onTriggerSanitation) onTriggerSanitation();
									setIsToolsOpen(false);
								}}
								className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-emerald-700 dark:text-emerald-300 font-bold"
								role="menuitem"
								data-testid="tools-menu-mark-intact-btn"
							>
								<div className="flex items-center gap-2">
									<Zap size={14} className="text-emerald-500" />
									<span>Интактный зубной ряд (32)</span>
								</div>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-mono">
									1 клик
								</span>
							</button>
						)}

						{/* 1-Click Wisdom Teeth Missing in Tools */}
						{onMarkWisdomTeethMissing && (
							<button
								type="button"
								onClick={() => {
									onMarkWisdomTeethMissing();
									setIsToolsOpen(false);
								}}
								className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300 font-bold"
								role="menuitem"
								data-testid="tools-menu-mark-wisdom-missing-btn"
							>
								<div className="flex items-center gap-2">
									<Zap size={14} className="text-zinc-500" />
									<span>Адентия 8-ок (18, 28, 38, 48)</span>
								</div>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/10 border border-zinc-500/20 font-mono">
									1 клик
								</span>
							</button>
						)}

						{/* 1-Click Molars Missing in Tools */}
						{onMarkMolarsMissing && (
							<button
								type="button"
								onClick={() => {
									onMarkMolarsMissing();
									setIsToolsOpen(false);
								}}
								className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-amber-700 dark:text-amber-300 font-bold"
								role="menuitem"
								data-testid="tools-menu-mark-molars-missing-btn"
							>
								<div className="flex items-center gap-2">
									<Zap size={14} className="text-amber-500" />
									<span>Вторичная адентия (16, 26, 36, 46)</span>
								</div>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 font-mono">
									1 клик
								</span>
							</button>
						)}

						{/* 1-Click Front Intact in Tools */}
						{onMarkFrontIntact && (
							<button
								type="button"
								onClick={() => {
									onMarkFrontIntact();
									setIsToolsOpen(false);
								}}
								className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-teal-700 dark:text-teal-300 font-bold"
								role="menuitem"
								data-testid="tools-menu-mark-front-intact-btn"
							>
								<div className="flex items-center gap-2">
									<Zap size={14} className="text-teal-500" />
									<span>Интактный фронт (13–23, 33–43)</span>
								</div>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 font-mono">
									1 клик
								</span>
							</button>
						)}

						{/* 1-Click Pro-Hygiene Express in Tools */}
						{onMarkProHygieneDone && (
							<button
								type="button"
								onClick={() => {
									onMarkProHygieneDone();
									setIsToolsOpen(false);
								}}
								className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-teal-700 dark:text-teal-300 font-bold"
								role="menuitem"
								data-testid="tools-menu-mark-pro-hygiene-btn"
							>
								<div className="flex items-center gap-2">
									<Sparkles size={14} className="text-teal-600 dark:text-teal-400" />
									<span>Профгигиена (A16.07.051)</span>
								</div>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 font-mono">
									1 клик
								</span>
							</button>
						)}

						{/* 1-Click Fast Caries K02.1 in Tools */}
						{onApplyFastCariesK021 && (
							<button
								type="button"
								onClick={() => {
									onApplyFastCariesK021();
									setIsToolsOpen(false);
								}}
								className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-blue-700 dark:text-blue-300 font-bold"
								role="menuitem"
								data-testid="tools-menu-apply-fast-caries-btn"
							>
								<div className="flex items-center gap-2">
									<Zap size={14} className="text-blue-600 dark:text-blue-400" />
									<span>Быстрая пломба K02.1</span>
								</div>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 font-mono">
									1 клик
								</span>
							</button>
						)}

						{/* Diagnocat AI */}
						{onLoadDiagnocat && (
							<button
								type="button"
								onClick={() => {
									onLoadDiagnocat();
									setIsToolsOpen(false);
								}}
								disabled={diagnocatLoading}
								className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold"
								role="menuitem"
							>
								<div className="flex items-center gap-2">
									<Stethoscope size={14} />
									<span>{diagnocatLoading ? "Загрузка ИИ..." : "Diagnocat AI"}</span>
								</div>
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 font-mono">
									КТ / ИИ
								</span>
							</button>
						)}

						{/* Wisdom Teeth (8-ki) */}
						<button
							type="button"
							onClick={() => onToggleWisdomTeeth()}
							className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer ${
								showWisdomTeeth ? "font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/5" : ""
							}`}
							role="menuitem"
						>
							<div className="flex items-center gap-2">
								{showWisdomTeeth ? <Eye size={14} /> : <EyeOff size={14} />}
								<span>Восьмерки (18, 28, 38, 48)</span>
							</div>
							<span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${showWisdomTeeth ? "bg-indigo-500 text-white font-bold" : "bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)]"}`}>
								{showWisdomTeeth ? "ВКЛ" : "ВЫКЛ"}
							</span>
						</button>

						{/* Voice Dictation */}
						<button
							type="button"
							onClick={() => onToggleVoiceDictation()}
							className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer ${
								isVoiceListening ? "font-bold text-rose-600 bg-rose-500/10 animate-pulse" : ""
							}`}
							role="menuitem"
						>
							<div className="flex items-center gap-2">
								{isVoiceListening ? <MicOff size={14} className="text-rose-600" /> : <Mic size={14} />}
								<span>Аудиодиктофон</span>
							</div>
							<span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isVoiceListening ? "bg-rose-600 text-white font-bold" : "bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)]"}`}>
								{isVoiceListening ? "Слушаю..." : "Голос"}
							</span>
						</button>

						{/* Live Invoice */}
						<button
							type="button"
							onClick={() => onToggleLiveInvoice()}
							className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer ${
								isLiveInvoiceOpen ? "font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))]" : ""
							}`}
							role="menuitem"
						>
							<div className="flex items-center gap-2">
								<Coins size={14} className="text-[var(--teal,#0d9488)]" />
								<span>Живой счет / Смета</span>
							</div>
							<span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isLiveInvoiceOpen ? "bg-[var(--teal,#0d9488)] text-white font-bold" : "bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)]"}`}>
								{isLiveInvoiceOpen ? "Открыт" : "Смета"}
							</span>
						</button>

						{/* Fast Extraction Mode Toggle */}
						<button
							type="button"
							onClick={() => onToggleFastExtract()}
							className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer ${
								isFastExtractMode ? "font-bold text-rose-600 bg-rose-500/10" : ""
							}`}
							role="menuitem"
						>
							<div className="flex items-center gap-2">
								<Trash2 size={14} className={isFastExtractMode ? "text-rose-600" : ""} />
								<span>Быстрое удаление зубов</span>
							</div>
							<span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isFastExtractMode ? "bg-rose-600 text-white font-bold" : "bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)]"}`}>
								{isFastExtractMode ? "ВКЛ" : "1-клик"}
							</span>
						</button>

						{/* Periodontal Charting Module */}
						{onTogglePerio && (
							<button
								type="button"
								onClick={() => {
									onTogglePerio();
									setIsToolsOpen(false);
								}}
								className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer ${
									isPerioOpen ? "font-bold text-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))]" : ""
								}`}
								role="menuitem"
							>
								<div className="flex items-center gap-2">
									<Activity size={14} className="text-[var(--teal,#0d9488)]" />
									<span>Пародонтограмма PSR</span>
								</div>
							</button>
						)}

						{/* X-Ray Root Canals and Pulp Toggle */}
						{activeMode === "anatomical_svg" && (
							<button
								type="button"
								onClick={() => onTogglePulpAndCanals()}
								className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer ${
									showPulpAndCanals ? "font-bold text-rose-600 bg-rose-500/10" : ""
								}`}
								role="menuitem"
							>
								<div className="flex items-center gap-2">
									<Activity size={14} />
									<span>Каналы и пульпа</span>
								</div>
								<span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${showPulpAndCanals ? "bg-rose-600 text-white font-bold" : "bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)]"}`}>
									{showPulpAndCanals ? "ВКЛ" : "Скрыты"}
								</span>
							</button>
						)}

						{/* Pediatric Mixed Dentition Modal */}
						{onOpenPediatricModal && (
							<button
								type="button"
								onClick={() => {
									onOpenPediatricModal();
									setIsToolsOpen(false);
								}}
								className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-amber-700 dark:text-amber-300"
								role="menuitem"
							>
								<div className="flex items-center gap-2">
									<Sparkles size={14} className="text-amber-500" />
									<span>Сменный прикус и сроки</span>
								</div>
							</button>
						)}

						{/* 3 Jaw / Occlusion Items in Tools */}
						{onOpenJawModal && (
							<>
								<button
									type="button"
									onClick={() => {
										onOpenJawModal("JU");
										setIsToolsOpen(false);
									}}
									className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-indigo-700 dark:text-indigo-300 font-bold"
									role="menuitem"
									data-testid="tools-menu-jaw-ju-btn"
								>
									<div className="flex items-center gap-2">
										<Zap size={14} className="text-indigo-500" />
										<span>Верхняя челюсть (JU)</span>
									</div>
									<span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 font-mono">
										Maxilla
									</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onOpenJawModal("JL");
										setIsToolsOpen(false);
									}}
									className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-indigo-700 dark:text-indigo-300 font-bold"
									role="menuitem"
									data-testid="tools-menu-jaw-jl-btn"
								>
									<div className="flex items-center gap-2">
										<Zap size={14} className="text-indigo-500" />
										<span>Нижняя челюсть (JL)</span>
									</div>
									<span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 font-mono">
										Mandibula
									</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onOpenJawModal("C");
										setIsToolsOpen(false);
									}}
									className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer text-purple-700 dark:text-purple-300 font-bold"
									role="menuitem"
									data-testid="tools-menu-jaw-c-btn"
								>
									<div className="flex items-center gap-2">
										<Zap size={14} className="text-purple-500" />
										<span>Прикус и окклюзия (C)</span>
									</div>
									<span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 font-mono">
										Энгль
									</span>
								</button>
							</>
						)}

						<div className="h-[1px] bg-[var(--line,#e2e8f0)] my-1" />

						{/* Secondary Stamps Group */}
						<div className="px-2 py-1 text-[10px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
							Дополнительные штампы
						</div>

						<div className="grid grid-cols-3 gap-1 px-1">
							<button
								type="button"
								onClick={() => {
									onStampToolChange(activeStampTool === "Crown" ? null : "Crown");
									setIsToolsOpen(false);
								}}
								className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center ${
									activeStampTool === "Crown"
										? "bg-sky-600 text-white font-black shadow-xs ring-2 ring-sky-400"
										: "bg-sky-500/10 text-sky-800 dark:text-sky-200 hover:bg-sky-500/20 border border-sky-500/20"
								}`}
								data-testid="stamp-crown-btn"
								title="Штамп: Коронка (Ц)"
							>
								Коронка
							</button>
							<button
								type="button"
								onClick={() => {
									onStampToolChange(activeStampTool === "Missing" ? null : "Missing");
									setIsToolsOpen(false);
								}}
								className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center ${
									activeStampTool === "Missing"
										? "bg-slate-700 text-white font-black shadow-xs ring-2 ring-slate-500"
										: "bg-slate-500/10 text-slate-800 dark:text-slate-200 hover:bg-slate-500/20 border border-slate-500/20"
								}`}
								data-testid="stamp-missing-btn"
								title="Штамп: Удален (0)"
							>
								Удален
							</button>
							<button
								type="button"
								onClick={() => {
									onStampToolChange(activeStampTool === "Healthy" ? null : "Healthy");
									setIsToolsOpen(false);
								}}
								className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer text-center ${
									activeStampTool === "Healthy"
										? "bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400"
										: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:opacity-90 border border-emerald-500/20"
								}`}
								data-testid="stamp-healthy-btn"
								title="Штамп: Здоров (З)"
							>
								Здоров
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
