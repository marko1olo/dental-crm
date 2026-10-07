import React from "react";
import { createPortal } from "react-dom";
import {
	BookOpen,
	Calendar,
	Check,
	ChevronDown,
	Printer,
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
	onPrint043,
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

	const mobileSteps = [
		{ id: "complaints", label: "1. Жалобы" },
		{ id: "objectiveStatus", label: "2. Осмотр" },
		{ id: "diagnosis", label: "3. Диагноз" },
		{ id: "treatmentPlan", label: "4. Лечение" },
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
		if (tabId === "diary" || tabId === "treatmentPlan") {
			return Boolean(
				String(noteForm.treatmentPlan ?? "").trim() ||
				String(noteForm.treatmentDescription ?? "").trim()
			);
		}
		if (tabId === "diagnosis") {
			return Boolean(
				String(noteForm.diagnosis ?? "").trim() ||
				String(noteForm.icd10 ?? "").trim()
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
		if (tabId === "diagnosis" && (activeEmkTab === "diagnosis" || (activeEmkTab === "diary" && !noteForm.treatmentPlan))) return true;
		if (tabId === "treatmentPlan" && (activeEmkTab === "treatmentPlan" || activeEmkTab === "protocol")) return true;
		return false;
	};

	return (
		<div
			className="emk-unified-toolbar flex flex-col w-full min-w-0 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] shadow-xs mb-2.5 overflow-hidden"
			data-testid="emk-unified-toolbar"
		>
			{/* СТРОКА 1: Клинические инструменты приёма (Action Toolbar) */}
			<div
				className="emk-tier1-quick-soap-bar flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 w-full min-w-0 h-[38px] min-h-[38px] max-h-[38px] box-border"
				data-testid="emk-tier1-quick-soap-bar"
			>
				{/* ЛЕВАЯ ГРУППА: Каталог протоколов 1 142+, Диктовка, AI Ассистент */}
				<div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
					{/* 1-Тап кнопка физиологической нормы у кресла (Мандат 8e) */}
					{Boolean(onApplyNorm || onApplyPhysiologicalNorm) && (
						<button
							type="button"
							data-testid="btn-chairside-physiological-norm"
							onClick={() => {
								if (onApplyNorm) onApplyNorm();
								else if (onApplyPhysiologicalNorm) onApplyPhysiologicalNorm();
							}}
							className="h-8 min-h-[32px] max-h-[32px] px-3 rounded-lg border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 text-[13px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs active:scale-[0.98] shrink-0"
							title="Заполнить физиологическую норму осмотра и анамнеза (Z01.2)"
						>
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span className="hidden sm:inline">✓ Соматически здоров / Норма</span>
							<span className="sm:hidden">✓ Норма</span>
						</button>
					)}

					{/* Кнопка вызова Каталога 1 142 протоколов + меню быстрых норм */}
					{onOpenProtocolsCatalog && (
						<div className="inline-flex items-center rounded-lg border border-[var(--line-subtle)] bg-[var(--paper)] shadow-2xs overflow-hidden shrink-0 hover:border-[var(--teal)] transition-all h-8 min-h-[32px] max-h-[32px]">
							<button
								type="button"
								data-testid="btn-open-protocols-catalog-1142"
								onClick={onOpenProtocolsCatalog}
								className="h-8 min-h-[32px] max-h-[32px] px-3 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap touch-manipulation active:scale-[0.98]"
								title="Открыть полный каталог 1 142 клинических протоколов (СтАР / Минздрав РФ)"
							>
								<BookOpen className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
								<span className="hidden sm:inline">Каталог протоколов</span>
								<span className="sm:hidden">Протоколы</span>
								<span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] font-bold">
									1 142
								</span>
							</button>

							<button
								type="button"
								ref={buttonRef}
								data-testid="btn-toggle-extra-soap-menu"
								onClick={() => setIsExtraMenuOpen((prev) => !prev)}
								className={`h-8 min-h-[32px] max-h-[32px] px-2 border-l border-[var(--line-subtle)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-all cursor-pointer inline-flex items-center justify-center ${
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
								Клинические нормы
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

							{onPrint043 && (
								<button
									type="button"
									data-testid="btn-print-043u-toolbar"
									onClick={() => {
										onPrint043();
										setIsExtraMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
								>
									<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Печать Формы 043/у</span>
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
						className={`h-8 min-h-[32px] max-h-[32px] px-3 rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 text-[13px] font-medium shadow-2xs whitespace-nowrap shrink-0 active:scale-[0.98] ${
							isCopilotOpen
								? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] border-[var(--teal-fill,var(--teal))]"
								: "border-[var(--line-subtle)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] hover:border-[var(--teal)]"
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

					{/* Панель Undo / Redo */}
					<div className="flex items-center gap-1 shrink-0" data-testid="emk-undo-redo-group">
						<button
							type="button"
							data-testid="btn-visit-undo"
							onClick={() => {
								const ok = handleUndo();
								if (ok) showToast("Действие отменено (Undo)", "info", 2000);
							}}
							disabled={!canUndo}
							className={`h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-lg text-[12.5px] font-medium border transition-all inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap touch-manipulation shadow-2xs ${
								canUndo
									? "border-[var(--line-subtle)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] hover:text-[var(--teal-ink,var(--teal))] cursor-pointer active:scale-95"
									: "border border-[var(--line-subtle)]/40 bg-[var(--paper)]/30 text-[var(--muted)]/50 cursor-not-allowed"
							}`}
							title="Отменить последнее действие (Ctrl+Z)"
							aria-label="Отменить последнее действие в приёме"
						>
							<Undo2 size={13} className={`shrink-0 ${canUndo ? "text-amber-600 dark:text-amber-400" : "text-[var(--muted)]/50"}`} />
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
								className="h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-lg text-[12.5px] font-medium border border-[var(--line-subtle)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] hover:text-[var(--teal-ink,var(--teal))] transition-all inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-2xs cursor-pointer active:scale-95 touch-manipulation"
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
						className="h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-lg text-[12.5px] font-medium border border-[var(--line-subtle)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] hover:text-[var(--teal-ink,var(--teal))] text-[var(--ink)] shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-98 shrink-0 whitespace-nowrap"
						data-testid="btn-schedule-next-stage"
						title="Записать пациента на следующий этап через 5 дней"
					>
						<Calendar size={13} className="shrink-0 text-blue-500" />
						<span className="hidden sm:inline">След. визит</span>
						<span className="sm:hidden">+5д</span>
					</button>

					{/* Печать Формы 043/у (Мандат 8e) */}
					{onPrint043 && (
						<button
							type="button"
							onClick={onPrint043}
							className="h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-lg text-[12.5px] font-medium border border-[var(--line-subtle)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] hover:text-[var(--teal-ink,var(--teal))] text-[var(--ink)] shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-98 shrink-0 whitespace-nowrap"
							data-testid="btn-toolbar-print-043u"
							title="Печать медицинской карты Форма 043/у"
							aria-label="Печать медицинской карты Форма 043/у"
						>
							<Printer size={13} className="shrink-0 text-teal-600 dark:text-teal-400" />
							<span className="hidden sm:inline">043/у</span>
						</button>
					)}

					{/* Статус сохранения (Гарантия отсутствия обрезки текста) */}
					<span
						className={`visit-note-status-badge text-[12px] font-medium h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-lg border transition-all shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 shadow-2xs ${
							hasUnsavedChanges
								? "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
								: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line-subtle)]"
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

			{/* СТРОКА 2: Навигационный сегментированный таб-бар Формы 043/у (SOAP Segmented Control) */}
			<div
				className="emk-tabs-container w-full min-w-0 bg-[var(--paper-soft)] border-t border-[var(--line)] box-border"
				role="tablist"
				aria-label="Вкладки разделов приема"
				data-testid="emk-tabs-container"
			>
				{/* Мобильный вариант (Apple HIG Segmented Control, 44px touch targets) */}
				<div className="sm:hidden flex items-center p-1 gap-1 w-full min-w-0">
					{mobileSteps.map((step) => {
						const isFilled = isTabFilled(step.id);
						const isActive = isTabActive(step.id);
						return (
							<button
								key={step.id}
								type="button"
								role="tab"
								aria-selected={isActive}
								className={`mobile-segmented-btn flex-1 min-h-[40px] px-1 text-[12.5px] rounded-lg transition-all cursor-pointer inline-flex items-center justify-center gap-1 touch-manipulation select-none border ${
									isActive
										? "active bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] shadow-xs font-semibold"
										: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] border-transparent font-medium"
								}`}
								onClick={() => setActiveEmkTab(step.id)}
							>
								<span>{step.label}</span>
								{isFilled && (
									<span
										className={`w-1.5 h-1.5 rounded-full shrink-0 ${
											isActive
												? "bg-[var(--teal,#0d9488)] ring-1 ring-[var(--teal)]/40"
												: "bg-emerald-500/80"
										}`}
										title="Раздел заполнен"
									/>
								)}
							</button>
						);
					})}
				</div>

				{/* Десктопный вариант (полный 5-вкладочный бар со всеми разделами в стиле Apple Segmented Control) */}
				<div className="hidden sm:flex items-center gap-1 p-[3px] m-1 rounded-[10px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] min-w-0 h-[34px] overflow-x-auto scrollbar-none shadow-2xs">
					{tabs.map((tab) => {
						const isFilled = isTabFilled(tab.id);
						const isActive = isTabActive(tab.id);
						return (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={isActive}
								className={`emk-tab-button flex-1 min-w-0 whitespace-nowrap text-[12.5px] h-7 px-3 rounded-[7px] transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 touch-manipulation select-none ${
									isActive
										? "active bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)] shadow-xs font-semibold"
										: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 border border-transparent font-medium"
								}`}
								onClick={() => setActiveEmkTab(tab.id)}
							>
								<span>{tab.label}</span>
								{isFilled && (
									<span
										className={`w-1.5 h-1.5 rounded-full shrink-0 ${
											isActive
												? "bg-[var(--teal,#0d9488)] ring-1 ring-[var(--teal)]/40"
												: "bg-emerald-500/80"
										}`}
										title="Раздел заполнен"
									/>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
