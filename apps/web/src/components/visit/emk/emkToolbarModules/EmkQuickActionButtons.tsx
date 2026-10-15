import React from "react";
import { createPortal } from "react-dom";
import {
	BookOpen,
	Calendar,
	Check,
	ChevronDown,
	Clock,
	Printer,
	Redo2,
	ShieldCheck,
	Sparkles,
	Undo2,
} from "lucide-react";

export interface EmkQuickActionButtonsProps {
	onApplyPhysiologicalNorm?: (() => void) | undefined;
	onApplyNorm?: (() => void) | undefined;
	onApplyOrthoNorm?: (() => void) | undefined;
	onApplySurgeryNorm?: (() => void) | undefined;
	onOpenProtocolsCatalog?: (() => void) | undefined;
	onToggleStarProtocols?: (() => void) | undefined;
	onOpenConsent?: (() => void) | undefined;
	onPrint043?: (() => void) | undefined;
	onToggleCopilot?: (() => void) | undefined;
	isCopilotOpen?: boolean | undefined;
	handleSchedule: () => void;
	hasUnsavedChanges?: boolean | undefined;
	voicePilotNode?: React.ReactNode | undefined;
	specialtyFocusNode?: React.ReactNode | undefined;
	canUndo: boolean;
	canRedo: boolean;
	handleUndo: () => void;
	handleRedo: () => void;
}

export function EmkQuickActionButtons({
	onApplyPhysiologicalNorm,
	onApplyNorm,
	onApplyOrthoNorm,
	onApplySurgeryNorm,
	onOpenProtocolsCatalog,
	onToggleStarProtocols,
	onOpenConsent,
	onPrint043,
	onToggleCopilot,
	isCopilotOpen = false,
	handleSchedule,
	hasUnsavedChanges = false,
	voicePilotNode,
	specialtyFocusNode,
	canUndo,
	canRedo,
	handleUndo,
	handleRedo,
}: EmkQuickActionButtonsProps) {
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

	return (
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
						className="emk-norm-button shrink-0"
						title="Заполнить физиологическую норму осмотра и анамнеза"
					>
						<ShieldCheck size={14} className="shrink-0" />
						<span className="hidden sm:inline">✓ Соматически здоров / Норма</span>
						<span className="sm:hidden">✓ Норма</span>
					</button>
				)}

				{/* Кнопка вызова Каталога 1 142 протоколов + меню быстрых норм */}
				{onOpenProtocolsCatalog && (
					<div className="emk-toolbar-split-group">
						<button
							type="button"
							data-testid="btn-open-protocols-catalog-1142"
							onClick={onOpenProtocolsCatalog}
							className="emk-split-main"
							title="Открыть полный каталог клинических протоколов"
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
							className={`emk-split-arrow ${
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
								title="Первичный или профилактический осмотр, норма"
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

						{onToggleStarProtocols && (
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
						)}

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
								<span>Печать медицинской карты</span>
							</button>
						)}

						<div className="h-px bg-[var(--line)] my-1" />

						<button
							type="button"
							onClick={() => {
								handleUndo();
								setIsExtraMenuOpen(false);
							}}
							disabled={!canUndo}
							className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center justify-between cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						>
							<span className="flex items-center gap-2">
								<Undo2 size={13} className="shrink-0" />
								<span>Отменить ввод</span>
							</span>
							<kbd className="text-[10px] font-mono text-[var(--muted)]">Ctrl+Z</kbd>
						</button>

						<button
							type="button"
							onClick={() => {
								handleRedo();
								setIsExtraMenuOpen(false);
							}}
							disabled={!canRedo}
							className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center justify-between cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						>
							<span className="flex items-center gap-2">
								<Redo2 size={13} className="shrink-0" />
								<span>Вернуть ввод</span>
							</span>
							<kbd className="text-[10px] font-mono text-[var(--muted)]">Ctrl+Y</kbd>
						</button>
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
				{onToggleCopilot && (
					<button
						type="button"
						data-testid="btn-toggle-chairside-hud"
						onClick={onToggleCopilot}
						className={`emk-toolbar-btn ${isCopilotOpen ? "active" : ""}`}
						title="Интеллектуальный клинический ассистент приёма DENTA Copilot"
						aria-expanded={isCopilotOpen}
					>
						<Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
						<span className="hidden sm:inline">Ассистент</span>
					</button>
				)}
			</div>

			{/* ПРАВАЯ ГРУППА: Специализированный бланк, След. визит, Статус автосохранения (<= 7 элементов в ряду) */}
			<div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
				{/* Интегрированный чип Фокуса специальности / Бланка */}
				{specialtyFocusNode && (
					<div className="flex items-center shrink-0" data-testid="emk-specialty-focus-chip">
						{specialtyFocusNode}
					</div>
				)}

				{/* Запись на следующий этап */}
				<button
					type="button"
					onClick={handleSchedule}
					className="emk-toolbar-btn"
					data-testid="btn-schedule-next-stage"
					title="Записать пациента на следующий этап через 5 дней"
				>
					<Calendar size={13} className="shrink-0 text-blue-500" />
					<span className="hidden sm:inline">След. визит</span>
					<span className="sm:hidden">+5д</span>
				</button>

				{/* Статус сохранения (Тихая телеметрия без цветных прыщей) */}
				<span
					data-testid="emk-autosave-status-badge"
					className="emk-autosave-clean-badge"
					title={hasUnsavedChanges ? "В черновике есть изменения (автосохранение активно)" : "Все изменения сохранены"}
				>
					{hasUnsavedChanges ? (
						<>
							<Clock size={12} className="text-[var(--muted)] shrink-0 opacity-70" />
							<span>Автосохранение</span>
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
	);
}
