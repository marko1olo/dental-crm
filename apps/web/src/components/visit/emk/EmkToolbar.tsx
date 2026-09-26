import React from "react";
import {
	Activity,
	AlertTriangle,
	Calendar,
	Check,
	ChevronDown,
	FileText,
	Scissors,
	ShieldCheck,
	Sparkles,
	Tag,
} from "lucide-react";
import { CLINICAL_SOAP_PRESETS, type ClinicalSoapPreset } from "../clinicalSoapPresets";

export interface EmkToolbarProps {
	activeEmkTab: string;
	setActiveEmkTab: (tabId: string) => void;
	onApplyPhysiologicalNorm: () => void;
	onApplySoapPreset: (preset: ClinicalSoapPreset) => void;
	onToggleStarProtocols: () => void;
	isStarProtocolsOpen: boolean;
	onToggleCopilot: () => void;
	isCopilotOpen: boolean;
	onScheduleNextVisit: (days: number) => void;
	hasUnsavedChanges: boolean;
	voicePilotNode?: React.ReactNode;
	noteForm: Record<string, any>;
}

export function EmkToolbar({
	activeEmkTab,
	setActiveEmkTab,
	onApplyPhysiologicalNorm,
	onApplySoapPreset,
	onToggleStarProtocols,
	isStarProtocolsOpen,
	onToggleCopilot,
	isCopilotOpen,
	onScheduleNextVisit,
	hasUnsavedChanges,
	voicePilotNode,
	noteForm,
}: EmkToolbarProps) {
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
		<div className="emk-unified-toolbar flex flex-nowrap items-center justify-start sm:justify-between gap-1 sm:gap-1.5 my-0 py-0.5 border-b border-[var(--line)] w-full min-w-0 max-w-full overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-[44px] sm:min-h-[32px] px-1 touch-pan-x">
			{voicePilotNode && (
				<>
					{voicePilotNode}
					<div className="w-px h-4 bg-[var(--line)] shrink-0" />
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
									? "active bg-[var(--teal-fill,var(--teal))] text-white border-[var(--teal-fill,var(--teal))] shadow-2xs"
									: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)]"
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

			<div className="w-px h-4 bg-[var(--line)] shrink-0 hidden sm:block" />

			{/* СРЕДНЯЯ ЧАСТЬ: 1-Клик SOAP пресеты */}
			<div
				className="emk-tier1-quick-soap-bar flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0"
				data-testid="emk-tier1-quick-soap-bar"
			>
				<button
					type="button"
					data-testid="btn-quick-soap-norm"
					onClick={onApplyPhysiologicalNorm}
					className="shrink-0 flex-shrink-0 min-h-[44px] sm:min-h-[28px] h-11 sm:h-7 px-2 py-0 text-xs font-bold rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shadow-2xs min-w-max"
					title="Соматически здоров / норма (1-клик): зафиксировать физиологическую норму по умолчанию в форме 043/у"
				>
					<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
					<span className="whitespace-nowrap shrink-0 min-w-max">
						<span className="hidden md:inline">Норма (1-клик)</span>
						<span className="md:hidden">Норма</span>
					</span>
				</button>

				{hygienePreset && (
					<button
						type="button"
						data-testid="btn-quick-soap-hygiene"
						onClick={() => onApplySoapPreset(hygienePreset)}
						className="shrink-0 flex-shrink-0 min-h-[44px] sm:min-h-[28px] h-11 sm:h-7 px-2 py-0 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shadow-2xs min-w-max"
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
						className="shrink-0 flex-shrink-0 min-h-[44px] sm:min-h-[28px] h-11 sm:h-7 px-2 py-0 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shadow-2xs min-w-max"
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
								: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
						}`}
					>
						<Tag className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span className="whitespace-nowrap shrink-0">Протоколы...</span>
						<ChevronDown size={11} className={`shrink-0 transition-transform ${isExtraMenuOpen ? "rotate-180" : ""}`} />
					</button>

					{isExtraMenuOpen && (
						<div
							className="absolute left-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl min-w-[210px] animate-in fade-in zoom-in-95 duration-100 text-xs"
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
							<div className="h-px bg-[var(--line)] my-1" />
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
								<span>Каталог СтАР / 804н</span>
							</button>
						</div>
					)}
				</div>

				<button
					type="button"
					data-testid="btn-toggle-chairside-hud"
					onClick={onToggleCopilot}
					className={`shrink-0 flex-shrink-0 min-h-[26px] sm:min-h-[28px] h-6.5 sm:h-7 px-2 py-0 text-xs font-bold rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shadow-2xs min-w-max ${
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
					onClick={() => onScheduleNextVisit(5)}
					className="min-h-[26px] sm:min-h-[28px] h-6.5 sm:h-7 px-2 py-0 rounded-lg text-[11px] sm:text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-98 shrink-0 whitespace-nowrap min-w-max"
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
							: "bg-slate-100 dark:bg-slate-800 text-[var(--muted)] border-[var(--line)]"
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
