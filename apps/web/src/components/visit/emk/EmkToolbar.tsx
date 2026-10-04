import React from "react";
import { createPortal } from "react-dom";
import {
	BookOpen,
	Calendar,
	Check,
	ChevronDown,
	Redo2,
	ShieldCheck,
	Sparkles,
	Undo2,
} from "lucide-react";
import type { ClinicalSoapPreset } from "../clinicalSoapPresets";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";

export interface EmkToolbarProps {
	activeEmkTab?: string | undefined;
	setActiveEmkTab?: ((tabId: string) => void) | undefined;
	onApplyPhysiologicalNorm?: (() => void) | undefined;
	onApplyNorm?: (() => void) | undefined;
	onApplyOrthoNorm?: (() => void) | undefined;
	onApplySurgeryNorm?: (() => void) | undefined;
	onApplySoapPreset?: ((preset: ClinicalSoapPreset) => void) | undefined;
	onToggleStarProtocols?: (() => void) | undefined;
	isStarProtocolsOpen?: boolean | undefined;
	onOpenProtocolsCatalog?: (() => void) | undefined;
	onToggleCopilot?: (() => void) | undefined;
	isCopilotOpen?: boolean | undefined;
	onScheduleNextVisit?: ((days: number) => void) | undefined;
	onScheduleNext?: (() => void) | undefined;
	onOpenConsent?: (() => void) | undefined;
	onPrint043?: (() => void) | undefined;
	hasUnsavedChanges?: boolean | undefined;
	voicePilotNode?: React.ReactNode | undefined;
	specialtyFocusNode?: React.ReactNode | undefined;
	noteForm?: Record<string, any> | undefined;
	onUndo?: (() => boolean) | undefined;
	onRedo?: (() => boolean) | undefined;
}

export function EmkToolbar({
	activeEmkTab: propActiveEmkTab,
	setActiveEmkTab: propSetActiveEmkTab,
	onApplyPhysiologicalNorm,
	onApplyNorm,
	onApplyOrthoNorm,
	onApplySurgeryNorm,
	onToggleStarProtocols = () => {},
	onOpenProtocolsCatalog,
	onToggleCopilot = () => {},
	isCopilotOpen = false,
	onScheduleNextVisit = () => {},
	onScheduleNext,
	onOpenConsent,
	hasUnsavedChanges = false,
	voicePilotNode,
	specialtyFocusNode,
	noteForm = {},
	onUndo,
	onRedo,
}: EmkToolbarProps) {
	const storeUndoVisit = useVisitStore((s) => s.undoVisit);
	const storeRedoVisit = useVisitStore((s) => s.redoVisit);
	const storeCanUndo = useVisitStore((s) => s.canUndo);
	const storeCanRedo = useVisitStore((s) => s.canRedo);

	const handleUndo = onUndo ?? storeUndoVisit;
	const handleRedo = onRedo ?? storeRedoVisit;
	const canUndo = storeCanUndo;
	const canRedo = storeCanRedo;

	const [localActiveTab, setLocalActiveTab] = React.useState<string>("all");
	const activeEmkTab = propActiveEmkTab ?? localActiveTab;
	const setActiveEmkTab = propSetActiveEmkTab ?? setLocalActiveTab;
	const handleSchedule = onScheduleNext || (() => onScheduleNextVisit(5));
	const [isExtraMenuOpen, setIsExtraMenuOpen] = React.useState<boolean>(false);
	const [dropdownPos, setDropdownPos] = React.useState<{ top: number; left: number } | null>(null);
	const buttonRef = React.useRef<HTMLButtonElement | null>(null);
	const menuRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		if (isExtraMenuOpen && buttonRef.current) {
			const rect = buttonRef.current.getBoundingClientRect();
			setDropdownPos({
				top: rect.bottom + 6,
				left: Math.max(8, Math.min(rect.left, window.innerWidth - 290)),
			});
		}
	}, [isExtraMenuOpen]);

	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			const isTextInput =
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable);

			if (
				(e.ctrlKey || e.metaKey) &&
				(e.key === "z" || e.key === "Z" || e.key === "я" || e.key === "Я")
			) {
				if (e.shiftKey) {
					if (!isTextInput && canRedo) {
						e.preventDefault();
						const ok = handleRedo();
						if (ok) showToast("Действие возвращено (Redo)", "info", 2000);
					}
				} else {
					if (!isTextInput && canUndo) {
						e.preventDefault();
						const ok = handleUndo();
						if (ok) showToast("Действие отменено (Undo)", "info", 2000);
					}
				}
			} else if (
				(e.ctrlKey || e.metaKey) &&
				(e.key === "y" || e.key === "Y" || e.key === "н" || e.key === "Н")
			) {
				if (!isTextInput && canRedo) {
					e.preventDefault();
					const ok = handleRedo();
					if (ok) showToast("Действие возвращено (Redo)", "info", 2000);
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [canUndo, canRedo, handleUndo, handleRedo]);

	React.useEffect(() => {
		if (!isExtraMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (
				buttonRef.current && !buttonRef.current.contains(target) &&
				menuRef.current && !menuRef.current.contains(target)
			) {
				setIsExtraMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isExtraMenuOpen]);

	const tabs = [
		{ id: "all", label: "Все разделы", shortLabel: "Все" },
		{ id: "complaints", label: "Жалобы & Анамнез", shortLabel: "Жалобы" },
		{ id: "objectiveStatus", label: "Осмотр & Формула", shortLabel: "Осмотр" },
		{ id: "diary", label: "Диагноз & Лечение", shortLabel: "Лечение" },
		{ id: "recommendations", label: "Рекомендации", shortLabel: "Советы" },
	];

	const isTabFilled = (tabId: string) => {
		if (tabId === "all") return false;
		if (tabId === "complaints") {
			return Boolean(
				String(noteForm.complaint ?? "").trim() ||
				String(noteForm.anamnesis ?? "").trim() ||
				String(noteForm.complaints ?? "").trim()
			);
		}
		if (tabId === "objectiveStatus") {
			return Boolean(
				String(noteForm.objectiveStatus ?? "").trim() ||
				String(noteForm.examination ?? "").trim() ||
				String(noteForm.statusLocalis ?? "").trim()
			);
		}
		if (tabId === "diary") {
			return Boolean(
				String(noteForm.diagnosis ?? "").trim() ||
				String(noteForm.treatmentPlan ?? "").trim() ||
				String(noteForm.treatmentDescription ?? "").trim()
			);
		}
		if (tabId === "recommendations") {
			return Boolean(String(noteForm.recommendations ?? "").trim());
		}
		return Boolean(String(noteForm[tabId] ?? "").trim().length > 0);
	};

	const isTabActive = (tabId: string) => {
		if (activeEmkTab === tabId) return true;
		if (tabId === "complaints" && (activeEmkTab === "complaint" || activeEmkTab === "anamnesis")) return true;
		if (tabId === "objectiveStatus" && (activeEmkTab === "status" || activeEmkTab === "objective")) return true;
		if (tabId === "diary" && (activeEmkTab === "diagnosis" || activeEmkTab === "treatmentPlan" || activeEmkTab === "protocol")) return true;
		return false;
	};

	return (
		<div
			className="emk-unified-toolbar flex flex-col w-full min-w-0 rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] shadow-2xs mb-2.5 overflow-hidden"
			data-testid="emk-unified-toolbar"
		>
			{/* СТРОКА 1: Клинические инструменты приёма (Action Toolbar) */}
			<div
				className="emk-tier1-quick-soap-bar flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 w-full min-w-0 h-[36px] min-h-[36px] max-h-[36px] box-border"
				data-testid="emk-tier1-quick-soap-bar"
			>
				{/* ЛЕВАЯ ГРУППА: Каталог протоколов 1 142+, Диктовка, AI Ассистент */}
				<div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
					{/* Кнопка вызова Каталога 1 142 протоколов + меню быстрых норм */}
					{onOpenProtocolsCatalog && (
						<div className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper)] shadow-2xs overflow-hidden shrink-0 hover:border-[var(--teal)] transition-all">
							<button
								type="button"
								data-testid="btn-open-protocols-catalog-1142"
								onClick={onOpenProtocolsCatalog}
								className="h-7 px-2.5 text-xs font-bold text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap touch-manipulation active:scale-[0.98]"
								title="Открыть полный каталог 1 142 клинических протоколов (СтАР / Минздрав РФ)"
							>
								<BookOpen className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
								<span className="hidden sm:inline">Каталог протоколов</span>
								<span className="sm:hidden">Протоколы</span>
								<span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] font-extrabold">
									1 142
								</span>
							</button>

							<button
								type="button"
								ref={buttonRef}
								data-testid="btn-toggle-extra-soap-menu"
								onClick={() => setIsExtraMenuOpen((prev) => !prev)}
								className={`h-7 px-1.5 border-l border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer inline-flex items-center justify-center ${
									isExtraMenuOpen ? "bg-[var(--paper-soft)] text-[var(--ink)]" : ""
								}`}
								title="Быстрые клинические нормы и бланки"
								aria-haspopup="menu"
								aria-expanded={isExtraMenuOpen}
								aria-label="Быстрые нормы и согласие"
							>
								<ChevronDown size={12} className={`transition-transform duration-150 ${isExtraMenuOpen ? "rotate-180" : ""}`} />
							</button>
						</div>
					)}

					{/* Выпадающее меню быстрых норм и бланков */}
					{isExtraMenuOpen && dropdownPos && typeof document !== "undefined" && createPortal(
						<div
							ref={menuRef}
							className="fixed z-[9999] flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-xl shadow-2xl min-w-[260px] text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
							style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
							role="menu"
							aria-hidden={!isExtraMenuOpen}
						>
							<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
								Клинические нормы в 1 клик
							</div>

							{Boolean(onApplyNorm || onApplyPhysiologicalNorm) && (
								<button
									type="button"
									data-testid="btn-quick-soap-norm"
									onClick={() => {
										if (onApplyNorm) onApplyNorm();
										else if (onApplyPhysiologicalNorm) onApplyPhysiologicalNorm();
										setIsExtraMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
									title="Первичный или профилактический осмотр, норма (Z01.2)"
								>
									<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
									<span>Терапевтический осмотр (Норма)</span>
								</button>
							)}

							{Boolean(onApplyOrthoNorm) && (
								<button
									type="button"
									data-testid="btn-quick-soap-ortho-norm"
									onClick={() => {
										if (onApplyOrthoNorm) onApplyOrthoNorm();
										setIsExtraMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
									title="Контрольный осмотр ортопеда (окклюзия стабильна)"
								>
									<ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
									<span>Контроль ортопеда</span>
								</button>
							)}

							{Boolean(onApplySurgeryNorm) && (
								<button
									type="button"
									data-testid="btn-quick-soap-surgery-norm"
									onClick={() => {
										if (onApplySurgeryNorm) onApplySurgeryNorm();
										setIsExtraMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
									title="Послеоперационный контрольный осмотр хирурга"
								>
									<ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
									<span>Контроль хирурга</span>
								</button>
							)}

							<div className="h-px bg-[var(--line)] my-1" />

							<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
								Справочники и согласие
							</div>

							<button
								type="button"
								data-testid="btn-toggle-star-protocols-toolbar"
								onClick={() => {
									onToggleStarProtocols();
									setIsExtraMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg font-semibold text-[var(--teal-ink,var(--teal))] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
							>
								<Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
								<span>Клинические протоколы (СтАР)</span>
							</button>

							{onOpenConsent && (
								<button
									type="button"
									data-testid="btn-open-consent-toolbar"
									onClick={() => {
										onOpenConsent();
										setIsExtraMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
								>
									<ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
									<span>Согласие пациента (ИДС)</span>
								</button>
							)}
						</div>,
						document.body
					)}

					{/* Голосовой пилот / Диктовка */}
					{voicePilotNode && (
						<div className="flex items-center shrink-0">
							{voicePilotNode}
						</div>
					)}

					{/* Интеллектуальный ассистент приема (DENTA Copilot) */}
					<button
						type="button"
						data-testid="btn-toggle-chairside-hud"
						onClick={onToggleCopilot}
						className={`h-7 px-2.5 rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold shadow-2xs whitespace-nowrap shrink-0 ${
							isCopilotOpen
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal-fill,var(--teal))]"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] hover:border-[var(--teal)]"
						}`}
						title="Интеллектуальный клинический ассистент приёма DENTA Copilot"
					>
						<Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
						<span className="hidden sm:inline">Ассистент</span>
					</button>
				</div>

				{/* ПРАВАЯ ГРУППА: Специализированный бланк, Отмена/Повтор, След. визит, Статус автосохранения */}
				<div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
					{/* Интегрированный чип Фокуса специальности / Бланка */}
					{specialtyFocusNode && (
						<div className="flex items-center shrink-0" data-testid="emk-specialty-focus-chip">
							{specialtyFocusNode}
						</div>
					)}

					{/* 1-Клик Undo / Redo */}
					<div className="flex items-center gap-0.5 shrink-0" data-testid="emk-undo-redo-group">
						<button
							type="button"
							data-testid="btn-visit-undo"
							onClick={() => {
								const ok = handleUndo();
								if (ok) showToast("Действие отменено (Undo)", "info", 2000);
							}}
							disabled={!canUndo}
							className={`h-7 px-2 rounded-lg text-xs font-semibold border transition-all inline-flex items-center gap-1 shrink-0 whitespace-nowrap touch-manipulation ${
								canUndo
									? "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] cursor-pointer shadow-2xs active:scale-95"
									: "border-transparent bg-transparent text-[var(--muted)] opacity-30 cursor-not-allowed"
							}`}
							title="Отменить последнее действие (Ctrl+Z)"
							aria-label="Отменить последнее действие в приёме"
						>
							<Undo2 size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
							<span className="hidden xl:inline">Отменить</span>
						</button>

						{canRedo && (
							<button
								type="button"
								data-testid="btn-visit-redo"
								onClick={() => {
									const ok = handleRedo();
									if (ok) showToast("Действие возвращено (Redo)", "info", 2000);
								}}
								className="h-7 px-1.5 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-all inline-flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs cursor-pointer active:scale-95 touch-manipulation"
								title="Повторить отмененное действие (Ctrl+Y)"
								aria-label="Повторить отмененное действие"
							>
								<Redo2 size={13} className="shrink-0 text-blue-500" />
								<span className="hidden xl:inline">Вернуть</span>
							</button>
						)}
					</div>

					{/* Запись на следующий этап */}
					<button
						type="button"
						onClick={() => handleSchedule()}
						className="h-7 px-2 sm:px-2.5 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] text-[var(--ink)] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-98 shrink-0 whitespace-nowrap"
						data-testid="btn-schedule-next-stage"
						title="Записать пациента на следующий этап через 5 дней"
					>
						<Calendar size={13} className="shrink-0 text-blue-500" />
						<span className="hidden sm:inline">След. визит</span>
						<span className="sm:hidden">+5д</span>
					</button>

					{/* Статус сохранения (Гарантия отсутствия обрезки текста) */}
					<span
						className={`visit-note-status-badge text-[11px] font-semibold h-7 px-2.5 rounded-lg border transition-all shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 ${
							hasUnsavedChanges
								? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
								: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]"
						}`}
					>
						{hasUnsavedChanges ? (
							<>
								<span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
								<span>Есть правки</span>
							</>
						) : (
							<>
								<Check size={13} className="text-emerald-500 shrink-0" />
								<span>Сохранено</span>
							</>
						)}
					</span>
				</div>
			</div>

			{/* СТРОКА 2: Навигационный сегментированный таб-бар Формы 043/у (SOAP Section Tabs) */}
			<div
				className="emk-tabs-container flex items-center gap-1 p-1 w-full min-w-0 h-[36px] min-h-[36px] max-h-[36px] bg-[var(--paper-soft)]/70 border-t border-[var(--line)] overflow-x-auto scrollbar-none box-border"
				role="tablist"
				aria-label="Вкладки разделов приема"
				data-testid="emk-tabs-container"
			>
				{tabs.map((tab) => {
					const isFilled = isTabFilled(tab.id);
					const isActive = isTabActive(tab.id);
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={isActive}
							className={`emk-tab-button flex-1 min-w-[70px] sm:min-w-0 whitespace-nowrap text-xs h-7 px-2 sm:px-3 font-bold rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 touch-manipulation select-none border ${
								isActive
									? "active bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal)]/40 shadow-xs font-black"
									: "bg-[var(--paper)]/80 text-[var(--ink)] hover:bg-[var(--paper)] hover:text-[var(--teal-ink,var(--teal))] border-[var(--line)]/60 font-semibold"
							}`}
							onClick={() => setActiveEmkTab(tab.id)}
						>
							<span className="hidden sm:inline">{tab.label}</span>
							<span className="sm:hidden">{tab.shortLabel}</span>
							{isFilled && (
								<span
									className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-white shadow-2xs" : "bg-emerald-500 ring-1 ring-emerald-600/30"}`}
									title="Раздел заполнен"
								/>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
