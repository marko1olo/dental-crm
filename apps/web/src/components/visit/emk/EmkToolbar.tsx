import React from "react";
import {
	Activity,
	AlertTriangle,
	Calendar,
	Check,
	ChevronDown,
	FileText,
	Scissors,
	Sparkles,
	Tag,
} from "lucide-react";
import { CLINICAL_SOAP_PRESETS, type ClinicalSoapPreset } from "../clinicalSoapPresets";

export interface EmkToolbarProps {
	activeEmkTab?: string | undefined;
	setActiveEmkTab?: ((tabId: string) => void) | undefined;
	onApplyPhysiologicalNorm?: (() => void) | undefined;
	onApplyNorm?: (() => void) | undefined;
	onApplySoapPreset?: ((preset: ClinicalSoapPreset) => void) | undefined;
	onToggleStarProtocols?: (() => void) | undefined;
	isStarProtocolsOpen?: boolean | undefined;
	onToggleCopilot?: (() => void) | undefined;
	isCopilotOpen?: boolean | undefined;
	onScheduleNextVisit?: ((days: number) => void) | undefined;
	onScheduleNext?: (() => void) | undefined;
	onPrint043?: (() => void) | undefined;
	hasUnsavedChanges?: boolean | undefined;
	voicePilotNode?: React.ReactNode | undefined;
	noteForm?: Record<string, any> | undefined;
}

export function EmkToolbar({
	activeEmkTab: propActiveEmkTab,
	setActiveEmkTab: propSetActiveEmkTab,
	onApplyPhysiologicalNorm,
	onApplyNorm,
	onApplySoapPreset = () => {},
	onToggleStarProtocols = () => {},
	isStarProtocolsOpen = false,
	onToggleCopilot = () => {},
	isCopilotOpen = false,
	onScheduleNextVisit = () => {},
	onScheduleNext,
	onPrint043,
	hasUnsavedChanges = false,
	voicePilotNode,
	noteForm = {},
}: EmkToolbarProps) {
	const [localActiveTab, setLocalActiveTab] = React.useState<string>("all");
	const activeEmkTab = propActiveEmkTab ?? localActiveTab;
	const setActiveEmkTab = propSetActiveEmkTab ?? setLocalActiveTab;
	const handleSchedule = onScheduleNext || (() => onScheduleNextVisit(5));
	const [isExtraMenuOpen, setIsExtraMenuOpen] = React.useState<boolean>(false);
	const menuRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		if (!isExtraMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsExtraMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isExtraMenuOpen]);

	const tabs = [
		{ id: "all", label: "Все разделы", shortLabel: "Все" },
		{ id: "complaint", label: "Жалобы", shortLabel: "Жалобы" },
		{ id: "anamnesis", label: "Анамнез", shortLabel: "Анамнез" },
		{ id: "objectiveStatus", label: "Статус", shortLabel: "Статус" },
		{ id: "diagnosis", label: "Диагноз", shortLabel: "Диагноз" },
		{ id: "treatmentPlan", label: "Лечение", shortLabel: "Лечение" },
		{ id: "recommendations", label: "Рекомендации", shortLabel: "Советы" },
	];

	const hygienePreset = React.useMemo(() => CLINICAL_SOAP_PRESETS.find((p) => p.id === "hygiene_complex"), []);
	const cariesPreset = React.useMemo(() => CLINICAL_SOAP_PRESETS.find((p) => p.id === "caries_medium"), []);
	const pulpitisPreset = React.useMemo(() => CLINICAL_SOAP_PRESETS.find((p) => p.id === "pulpitis_acute"), []);
	const periodontitisPreset = React.useMemo(() => CLINICAL_SOAP_PRESETS.find((p) => p.id === "periodontitis_chronic"), []);
	const surgeryPreset = React.useMemo(() => CLINICAL_SOAP_PRESETS.find((p) => p.id === "surgery_extraction_simple"), []);

	return (
		<div className="emk-unified-toolbar flex flex-nowrap items-center justify-start sm:justify-between gap-1 sm:gap-1.5 my-0 py-0.5 border-b border-[var(--glass-border)] bg-[var(--paper-strong)] w-full min-w-0 max-w-full overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-[44px] sm:min-h-[32px] px-1 touch-pan-x">
			{voicePilotNode && (
				<>
					{voicePilotNode}
					<div className="w-px h-4 bg-[var(--glass-border)] shrink-0" />
				</>
			)}

			{/* ЛЕВАЯ ЧАСТЬ: Вкладки разделов ЭМК */}
			<div
				className="emk-tabs-container flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-1 px-1 min-w-0 shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x"
				role="tablist"
				aria-label="Вкладки протокола приема"
			>
				{tabs.map((tab) => {
					const isFilled = tab.id !== "all" && String(noteForm[tab.id] ?? "").trim().length > 0;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={activeEmkTab === tab.id}
							className={`emk-tab-button shrink-0 whitespace-nowrap text-xs sm:text-sm min-h-[44px] sm:min-h-[28px] h-11 sm:h-7 px-2.5 sm:px-2.5 py-0 font-bold rounded-lg border transition-all cursor-pointer inline-flex items-center justify-center gap-1 touch-manipulation ${
								activeEmkTab === tab.id
									? "active bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal-fill,var(--teal))] shadow-2xs"
									: "bg-[var(--paper)] border-[var(--glass-border)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal)] hover:border-[var(--teal)] shadow-2xs"
							}`}
							onClick={() => setActiveEmkTab(tab.id)}
						>
							<span className="whitespace-nowrap shrink-0 flex-shrink-0 min-w-max">
								<span className="hidden sm:inline">{tab.label}</span>
								<span className="sm:hidden">{tab.shortLabel || tab.label}</span>
							</span>
							{isFilled && <span className="emk-tab-dot shrink-0" title="Заполнено" />}
						</button>
					);
				})}
			</div>

			<div className="w-px h-4 bg-[var(--glass-border)] shrink-0 hidden sm:block" />

			{/* СРЕДНЯЯ ЧАСТЬ: 1-Клик SOAP пресеты */}
			<div
				className="emk-tier1-quick-soap-bar flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0"
				data-testid="emk-tier1-quick-soap-bar"
			>
				{hygienePreset && (
					<button
						type="button"
						data-testid="btn-quick-soap-hygiene"
						onClick={() => onApplySoapPreset(hygienePreset)}
						className="shrink-0 flex-shrink-0 min-h-[44px] sm:min-h-[28px] h-11 sm:h-7 px-2 py-0 text-xs font-bold rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shadow-2xs min-w-max"
					>
						<Sparkles className="w-3.5 h-3.5 text-teal-500 shrink-0" />
						<span className="whitespace-nowrap shrink-0 min-w-max">Гигиена</span>
					</button>
				)}

				{cariesPreset && (
					<button
						type="button"
						data-testid="btn-quick-soap-caries"
						onClick={() => onApplySoapPreset(cariesPreset)}
						className="shrink-0 flex-shrink-0 min-h-[44px] sm:min-h-[28px] h-11 sm:h-7 px-2 py-0 text-xs font-bold rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shadow-2xs min-w-max"
					>
						<FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
						<span className="whitespace-nowrap shrink-0 min-w-max">Кариес</span>
					</button>
				)}

				<div className="relative inline-flex items-center shrink-0" ref={menuRef}>
					<button
						type="button"
						data-testid="btn-toggle-extra-soap-menu"
						onClick={() => setIsExtraMenuOpen((prev) => !prev)}
						className={`shrink-0 flex-shrink-0 min-h-[44px] sm:min-h-[28px] h-11 sm:h-7 px-2 py-0 text-xs font-bold rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shadow-2xs min-w-max ${
							isExtraMenuOpen || isStarProtocolsOpen
								? "border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal-dark)]"
								: "border-[var(--glass-border)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<Tag className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span className="whitespace-nowrap shrink-0">Протоколы...</span>
						<ChevronDown size={11} className={`shrink-0 transition-transform ${isExtraMenuOpen ? "rotate-180" : ""}`} />
					</button>

					{isExtraMenuOpen && (
						<div
							className="absolute left-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-xl shadow-xl min-w-[210px] animate-in fade-in zoom-in-95 duration-100 text-xs text-[var(--ink)]"
							role="menu"
						>
							{pulpitisPreset && (
								<button
									type="button"
									data-testid="btn-quick-soap-pulpitis"
									onClick={() => {
										onApplySoapPreset(pulpitisPreset);
										setIsExtraMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] flex items-center gap-2 cursor-pointer transition-colors"
								>
									<AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
									<span>Пульпит (K04.0)</span>
								</button>
							)}
							{periodontitisPreset && (
								<button
									type="button"
									data-testid="btn-quick-soap-periodontitis"
									onClick={() => {
										onApplySoapPreset(periodontitisPreset);
										setIsExtraMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] flex items-center gap-2 cursor-pointer transition-colors"
								>
									<Activity className="w-3.5 h-3.5 text-rose-500 shrink-0" />
									<span>Периодонтит (K04.5)</span>
								</button>
							)}
							{surgeryPreset && (
								<button
									type="button"
									data-testid="btn-quick-soap-extraction"
									onClick={() => {
										onApplySoapPreset(surgeryPreset);
										setIsExtraMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] flex items-center gap-2 cursor-pointer transition-colors"
								>
									<Scissors className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
									<span>Удаление (K04.8)</span>
								</button>
							)}
							<div className="h-px bg-[var(--glass-border)] my-1" />
							<button
								type="button"
								data-testid="btn-toggle-star-protocols-toolbar"
								onClick={() => {
									onToggleStarProtocols();
									setIsExtraMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg font-semibold text-[var(--teal)] hover:bg-[var(--teal-soft)] flex items-center gap-2 cursor-pointer transition-colors"
							>
								<Sparkles className="w-3.5 h-3.5 shrink-0" />
								<span>Каталог услуг</span>
							</button>
						</div>
					)}
				</div>

				<button
					type="button"
					data-testid="btn-toggle-chairside-hud"
					onClick={onToggleCopilot}
					className={`shrink-0 flex-shrink-0 min-h-[44px] sm:min-h-[28px] h-11 sm:h-7 px-2 py-0 text-xs font-bold rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shadow-2xs min-w-max ${
						isCopilotOpen
							? "bg-[var(--teal-dark)] text-white border-[var(--teal-dark)]"
							: "border-[var(--teal)]/40 bg-[var(--teal-soft)] text-[var(--teal-dark)] hover:bg-[var(--teal)] hover:text-white"
					}`}
				>
					<Sparkles className="w-3.5 h-3.5 shrink-0" />
					<span className="whitespace-nowrap shrink-0 min-w-max">Копилот</span>
				</button>
			</div>

			{/* ПРАВАЯ ЧАСТЬ: Запись на этап + Статус */}
			<div className="flex items-center gap-1.5 shrink-0 ml-auto pr-1">
				<button
					type="button"
					onClick={() => handleSchedule()}
					className="min-h-[44px] sm:min-h-[28px] h-11 sm:h-7 px-2 py-0 rounded-lg text-[11px] sm:text-xs font-semibold border border-[var(--glass-border)] bg-[var(--paper-strong)] hover:bg-[var(--glass-hover,var(--paper-soft))] text-[var(--ink)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-98 shrink-0 whitespace-nowrap min-w-max"
					data-testid="btn-schedule-next-stage"
					title="Записать пациента на следующий этап через 5 дней"
				>
					<Calendar size={12} className="shrink-0 text-blue-500" />
					<span>+5д</span>
				</button>

				<span
					className={`visit-note-status-badge text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-all shrink-0 flex-shrink-0 whitespace-nowrap min-w-max inline-flex items-center gap-1 ${
						hasUnsavedChanges
							? "ready bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
							: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--glass-border)]"
					}`}
				>
					{hasUnsavedChanges ? (
						<>
							<span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
							<span>есть правки</span>
						</>
					) : (
						<>
							<Check size={11} className="text-emerald-500 shrink-0" />
							<span>сохранено</span>
						</>
					)}
				</span>
			</div>
		</div>
	);
}
