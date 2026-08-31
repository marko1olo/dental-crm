import React from "react";
import {
	Activity,
	Coins,
	Eye,
	EyeOff,
	FileText,
	Mic,
	MicOff,
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
	className = "",
}) => {
	return (
		<div
			className={`odontogram-toolbar flex items-center gap-1.5 py-1 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] w-full overflow-x-auto flex-nowrap scrollbar-none select-none ${className}`.trim()}
			role="toolbar"
			aria-label="Панель инструментов зубной формулы"
			data-testid="odontogram-toolbar"
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

				{/* 1-Click Total Sanitation Trigger */}
				{onTriggerSanitation && (
					<button
						type="button"
						onClick={onTriggerSanitation}
						className="min-h-[32px] h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--ok-bg,rgba(16,185,129,0.15))] text-[var(--ok-fg,#10b981)] hover:opacity-90 border border-[var(--ok-fg,rgba(16,185,129,0.3))] transition-all cursor-pointer shrink-0"
						title="Тотальная санация: пометить все зубы здоровыми в 1 клик"
						data-testid="total-sanitation-btn"
					>
						Санация
					</button>
				)}
			</div>

			<div className="h-5 w-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0 mx-0.5" />

			{/* 2. Rapid Stamp / Pathology Quick Paintbrush Selector */}
			<div
				className="flex items-center gap-1 shrink-0 p-0.5 rounded-lg bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)]"
				role="group"
				aria-label="Режим штампа патологий"
			>
				<div className="flex items-center gap-1 px-1.5 text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] shrink-0">
					<Paintbrush size={14} className={activeStampTool ? "text-indigo-600 dark:text-indigo-400 animate-pulse" : ""} />
					<span className="hidden lg:inline font-black">Штамп:</span>
				</div>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Caries" ? null : "Caries")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Caries"
							? "bg-amber-600 text-white font-black shadow-xs ring-2 ring-amber-400"
							: "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 border border-amber-500/20"
					}`}
					title="Штамп: Кариес (К)"
					data-testid="stamp-caries-btn"
				>
					Кариес
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Filled" ? null : "Filled")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Filled"
							? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black shadow-xs ring-2 ring-[var(--teal)]/60"
							: "bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] hover:opacity-90 border border-[var(--teal,#0d9488)]/30"
					}`}
					title="Штамп: Пломба (П)"
					data-testid="stamp-filled-btn"
				>
					Пломба
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Pulpitis" ? null : "Pulpitis")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Pulpitis"
							? "bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-400"
							: "bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border border-rose-500/20"
					}`}
					title="Штамп: Пульпит (Ф)"
					data-testid="stamp-pulpitis-btn"
				>
					Пульпит
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Crown" ? null : "Crown")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Crown"
							? "bg-sky-600 text-white font-black shadow-xs ring-2 ring-sky-400"
							: "bg-sky-500/10 text-sky-800 dark:text-sky-200 hover:bg-sky-500/20 border border-sky-500/20"
					}`}
					title="Штамп: Коронка (Ц)"
					data-testid="stamp-crown-btn"
				>
					Коронка
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Missing" ? null : "Missing")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Missing"
							? "bg-slate-700 text-white font-black shadow-xs ring-2 ring-slate-500"
							: "bg-slate-500/10 text-slate-800 dark:text-slate-200 hover:bg-slate-500/20 border border-slate-500/20"
					}`}
					title="Штамп: Удален (0)"
					data-testid="stamp-missing-btn"
				>
					Удален
				</button>
				<button
					type="button"
					onClick={() => onStampToolChange(activeStampTool === "Healthy" ? null : "Healthy")}
					className={`min-h-[32px] h-[32px] px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none shrink-0 ${
						activeStampTool === "Healthy"
							? "bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400"
							: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:opacity-90 border border-emerald-500/20"
					}`}
					title="Штамп: Здоров / Интактный (З)"
					data-testid="stamp-healthy-btn"
				>
					Здоров
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

			{/* 3. Clinical Modules & Tool Toggles */}
			<div className="flex items-center gap-1 shrink-0 flex-nowrap">
				{/* Pediatric Mixed Dentition Modal */}
				{onOpenPediatricModal && (
					<button
						type="button"
						onClick={onOpenPediatricModal}
						className="min-h-[32px] h-[32px] flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg transition-colors shrink-0 whitespace-nowrap cursor-pointer select-none"
						title="Сроки прорезывания, стадии резорбции и Кариограмма Браттхолла"
					>
						<Sparkles size={14} className="text-amber-500 shrink-0" />
						<span>Сменный прикус</span>
					</button>
				)}

				{/* Periodontal Charting Module */}
				{onTogglePerio && (
					<button
						type="button"
						onClick={onTogglePerio}
						className={`min-h-[32px] h-[32px] flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all shrink-0 whitespace-nowrap cursor-pointer select-none ${
							isPerioOpen
								? "bg-[var(--teal-soft,rgba(13,148,136,0.2))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/50 shadow-xs font-black"
								: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/30 hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))]"
						}`}
						title="Пародонтологическая карта PSR / 6 точек зондирования"
					>
						<Activity size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span>Пародонтограмма</span>
					</button>
				)}

				{/* Diagnocat AI */}
				{onLoadDiagnocat && (
					<button
						type="button"
						onClick={onLoadDiagnocat}
						disabled={diagnocatLoading}
						className="min-h-[32px] h-[32px] flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-[var(--brand-500,#3b82f6)]/10 text-[var(--brand-500,#3b82f6)] border border-[var(--brand-500,#3b82f6)]/30 hover:bg-[var(--brand-500,#3b82f6)]/20 rounded-lg transition-colors shrink-0 whitespace-nowrap cursor-pointer select-none"
						title="Загрузить диагностический отчет Diagnocat AI"
					>
						<Stethoscope size={14} className="text-[var(--brand-500,#3b82f6)] shrink-0" />
						<span>{diagnocatLoading ? "Загрузка..." : "Diagnocat"}</span>
					</button>
				)}

				{/* Wisdom Teeth 8-ki Toggle */}
				<button
					type="button"
					onClick={onToggleWisdomTeeth}
					className={`min-h-[32px] h-[32px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
						showWisdomTeeth
							? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-400/40 shadow-xs font-black"
							: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] opacity-80"
					}`}
					title="Показать или скрыть третьи моляры (18, 28, 38, 48)"
				>
					{showWisdomTeeth ? <Eye size={14} /> : <EyeOff size={14} />}
					<span>8-ки</span>
				</button>

				{/* X-Ray Root Canals and Pulp Toggle */}
				{activeMode === "anatomical_svg" && (
					<button
						type="button"
						onClick={onTogglePulpAndCanals}
						className={`min-h-[32px] h-[32px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
							showPulpAndCanals
								? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40 shadow-xs font-black"
								: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] opacity-80"
						}`}
						title="Рентген-прозрачность эмали для корневых каналов и пульпы"
					>
						<Activity size={14} />
						<span>Каналы</span>
					</button>
				)}

				{/* Fast Extraction Mode Toggle */}
				<button
					type="button"
					onClick={onToggleFastExtract}
					className={`min-h-[32px] h-[32px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
						isFastExtractMode
							? "bg-rose-600 text-white border-rose-700 shadow-md animate-pulse font-black"
							: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:text-rose-600 dark:hover:text-rose-400"
					}`}
					title="Режим быстрого удаления зубов в 1 клик"
				>
					<Trash2 size={14} />
					<span>{isFastExtractMode ? "Удаление ВКЛ" : "Удаление"}</span>
				</button>

				{/* Live Invoice Toggle */}
				<button
					type="button"
					onClick={onToggleLiveInvoice}
					className={`min-h-[32px] h-[32px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
						isLiveInvoiceOpen
							? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal-dark,var(--teal))] shadow-sm font-black"
							: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/30 hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))]"
					}`}
					title="Калькулятор сметы лечения"
				>
					<Coins size={14} />
					<span>Смета</span>
				</button>

				{/* Voice Dictation Trigger */}
				<button
					type="button"
					onClick={onToggleVoiceDictation}
					className={`min-h-[32px] h-[32px] flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black whitespace-nowrap shadow-xs shrink-0 cursor-pointer transition-all active:scale-95 ${
						isVoiceListening
							? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/30"
							: "bg-indigo-600 hover:bg-indigo-500 text-white"
					}`}
					title={isVoiceListening ? "Остановить голосовую диктовку" : "Голосовая диктовка зубной формулы"}
					aria-pressed={isVoiceListening}
				>
					{isVoiceListening ? <MicOff size={14} /> : <Mic size={14} />}
					<span>{isVoiceListening ? "Слушаю..." : "Голос"}</span>
				</button>
			</div>
		</div>
	);
};
