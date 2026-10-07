/**
 * DENTE Dental CRM — Odontogram Toolbar "More..." (Ещё) Dropdown Menu
 *
 * Secondary actions: batch sanitation, 8-ok absence, plan wizard, voice dictation,
 * tooth inspection sheet, clinical module triggers (Perio, Ceph TRG, Diagnocat, A4 Print),
 * and display preferences (multi-select, wisdom teeth, pulp X-ray, fast extraction).
 */

import React, { useRef, useEffect } from "react";
import {
	Activity,
	Check,
	ChevronDown,
	Eye,
	EyeOff,
	FileText,
	Mic,
	MoreHorizontal,
	Printer,
	Sparkles,
	Stethoscope,
	Trash2,
} from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import type { ToothState } from "./ToothChart";

export interface OdontogramToolbarMoreMenuProps {
	isMoreMenuOpen: boolean;
	setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	activeStampTool: ToothState | null;
	setActiveStampTool: React.Dispatch<React.SetStateAction<ToothState | null>>;
	isFastExtractMode: boolean;
	setIsFastExtractMode: React.Dispatch<React.SetStateAction<boolean>>;
	isMultiSelectMode?: boolean | undefined;
	onToggleMultiSelect?: ((enabled: boolean) => void) | undefined;
	isPerioOpen?: boolean | undefined;
	onTogglePerio?: (() => void) | undefined;
	isOrthoCephOpen: boolean;
	setIsOrthoCephOpen: React.Dispatch<React.SetStateAction<boolean>>;
	handleMarkIntactDentition: () => void;
	handleMarkWisdomTeethMissing: () => void;
	setIsPlanWizardOpen: (open: boolean) => void;
	onOpenVoiceDictation?: (() => void) | undefined;
	toggleVoiceEngine: () => void;
	isVoiceListening: boolean;
	selectedTeeth?: number[] | undefined;
	isPediatricEffective: boolean;
	setContextDrawerTooth: (tooth: number | null) => void;
	onOpenPediatricModal?: (() => void) | undefined;
	onLoadDiagnocat?: (() => void) | undefined;
	diagnocatLoading?: boolean | undefined;
	showWisdomTeeth: boolean;
	setShowWisdomTeeth: React.Dispatch<React.SetStateAction<boolean>>;
	activeMode: OdontogramViewMode;
	showPulpAndCanals: boolean;
	setShowPulpAndCanals: React.Dispatch<React.SetStateAction<boolean>>;
}

export const OdontogramToolbarMoreMenu: React.FC<OdontogramToolbarMoreMenuProps> = React.memo(({
	isMoreMenuOpen,
	setIsMoreMenuOpen,
	activeStampTool,
	setActiveStampTool,
	isFastExtractMode,
	setIsFastExtractMode,
	isMultiSelectMode,
	onToggleMultiSelect,
	isPerioOpen,
	onTogglePerio,
	isOrthoCephOpen,
	setIsOrthoCephOpen,
	handleMarkIntactDentition,
	handleMarkWisdomTeethMissing,
	setIsPlanWizardOpen,
	onOpenVoiceDictation,
	toggleVoiceEngine,
	isVoiceListening,
	selectedTeeth,
	isPediatricEffective,
	setContextDrawerTooth,
	onOpenPediatricModal,
	onLoadDiagnocat,
	diagnocatLoading,
	showWisdomTeeth,
	setShowWisdomTeeth,
	activeMode,
	showPulpAndCanals,
	setShowPulpAndCanals,
}) => {
	const moreMenuRef = useRef<HTMLDivElement>(null);

	// Click outside to close More dropdown
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
				setIsMoreMenuOpen(false);
			}
		};
		if (isMoreMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMoreMenuOpen, setIsMoreMenuOpen]);

	return (
		<div className="relative shrink-0" ref={moreMenuRef}>
			<button
				type="button"
				onClick={() => setIsMoreMenuOpen((prev) => !prev)}
				className={`h-7.5 flex items-center gap-1.5 px-2.5 rounded-[8px] text-[12.5px] font-medium whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
					isMoreMenuOpen ||
					activeStampTool === "Crown" ||
					activeStampTool === "Missing" ||
					isFastExtractMode ||
					isMultiSelectMode ||
					isPerioOpen ||
					isOrthoCephOpen
						? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-400/40 shadow-xs font-semibold"
						: "bg-[var(--paper-soft,var(--odontogram-surface-hover,#f1f5f9))] text-[var(--ink-muted,#64748b)] border-[var(--line-subtle,var(--odontogram-border-subtle,#e2e8f0))] hover:text-indigo-600 dark:hover:text-indigo-400"
				}`}
				title="Дополнительные инструменты, штампы и модули анализа"
				data-testid="btn-odontogram-more-menu"
				aria-expanded={isMoreMenuOpen}
				aria-haspopup="true"
			>
				<MoreHorizontal size={13} className="shrink-0" />
				<span>Ещё</span>
				<ChevronDown
					size={12}
					className={`shrink-0 transition-transform ${
						isMoreMenuOpen ? "rotate-180" : ""
					}`}
				/>
				{(activeStampTool === "Crown" ||
					activeStampTool === "Missing" ||
					isFastExtractMode ||
					isMultiSelectMode) && (
					<span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
				)}
			</button>

			{isMoreMenuOpen && (
				<div
					className="absolute right-0 top-full mt-1.5 z-50 w-72 p-2 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-col gap-2 max-h-[80vh] overflow-y-auto"
					role="menu"
					aria-label="Дополнительные инструменты"
				>
					{/* Subgroup: Batch Presets */}
					<div>
						<div className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
							Пакетные операции
						</div>
						<div className="flex flex-col gap-1">
							<button
								type="button"
								onClick={() => {
									handleMarkIntactDentition();
									setIsMoreMenuOpen(false);
								}}
								className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center gap-2 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 border border-emerald-500/30"
								title="Физиологическая норма (зубные ряды интактны): отметить всю зубную формулу здоровой"
								data-testid="btn-odontogram-all-healthy"
							>
								<Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span>Физиологическая норма (интактный ряд)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									handleMarkWisdomTeethMissing();
									setIsMoreMenuOpen(false);
								}}
								className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center gap-2 bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border border-rose-500/30"
								title="Адентия 8-ок: отметить зубы 18, 28, 38, 48 отсутствующими"
								data-testid="btn-odontogram-wisdom-missing"
							>
								<Trash2 size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
								<span>Адентия 8-ок (18, 28, 38, 48)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsPlanWizardOpen(true);
									setIsMoreMenuOpen(false);
								}}
								className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center gap-2 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/20 border border-indigo-500/30"
								title="Сформировать черновой план лечения по МКБ-10 и каталогу услуг на основе всех патологий"
								aria-label="План лечения из патологий"
								data-testid="more-menu-plan-from-pathologies"
							>
								<FileText size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
								<span>План лечения из патологий</span>
							</button>

							<button
								type="button"
								onClick={() => {
									if (onOpenVoiceDictation) {
										onOpenVoiceDictation();
									} else {
										toggleVoiceEngine();
									}
									setIsMoreMenuOpen(false);
								}}
								className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center gap-2 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/20 border border-indigo-500/30"
								title="Голосовая диктовка зубной формулы"
								data-testid="more-menu-voice-dictation"
							>
								<Mic size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
								<span>
									{isVoiceListening
										? "Остановить диктовку"
										: "Голосовой пульт (диктовка)"}
								</span>
							</button>

							<button
								type="button"
								onClick={() => {
									const targetTooth =
										selectedTeeth && selectedTeeth.length > 0
											? selectedTeeth[0]!
											: isPediatricEffective
												? 55
												: 16;
									setContextDrawerTooth(targetTooth);
									setIsMoreMenuOpen(false);
								}}
								className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center gap-2 bg-blue-500/10 text-blue-800 dark:text-blue-200 hover:bg-blue-500/20 border border-blue-500/30"
								title="Открыть подробную карточку зуба с поверхностями и протоколами"
								data-testid="more-menu-tooth-card"
							>
								<Stethoscope size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
								<span>Детальная карточка зуба</span>
							</button>
						</div>
					</div>

					<div className="h-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] dark:bg-zinc-800" />

					{/* Subgroup: Additional Stamps */}
					<div>
						<div className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
							Дополнительные штампы
						</div>
						<div className="grid grid-cols-2 gap-1">
							<button
								type="button"
								onClick={() => {
									setActiveStampTool((prev) => (prev === "Crown" ? null : "Crown"));
									setIsMoreMenuOpen(false);
								}}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center justify-between ${
									activeStampTool === "Crown"
										? "bg-[var(--brand-500,#3b82f6)] text-white font-black shadow-xs ring-2 ring-[var(--brand-500,#3b82f6)]/60"
										: "bg-[var(--brand-500,#3b82f6)]/10 text-[var(--brand-500,#3b82f6)] hover:bg-[var(--brand-500,#3b82f6)]/20 border border-[var(--brand-500,#3b82f6)]/30"
								}`}
								title="Штамп: Коронка (Клик по зубу без меню)"
								data-testid="stamp-crown-btn"
							>
								<span>Коронка (Ц)</span>
								{activeStampTool === "Crown" && <Check size={12} className="shrink-0" />}
							</button>
							<button
								type="button"
								onClick={() => {
									setActiveStampTool((prev) => (prev === "Missing" ? null : "Missing"));
									setIsMoreMenuOpen(false);
								}}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center justify-between ${
									activeStampTool === "Missing"
										? "bg-rose-700 text-white font-black shadow-xs ring-2 ring-rose-500"
										: "bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border border-rose-500/20"
								}`}
								title="Штамп: Удален (Клик по зубу без меню)"
								data-testid="stamp-missing-btn"
							>
								<span>Удален (0)</span>
								{activeStampTool === "Missing" && <Check size={12} className="shrink-0" />}
							</button>
						</div>
					</div>

					<div className="h-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] dark:bg-zinc-800" />

					{/* Subgroup: Clinical Modules */}
					<div>
						<div className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
							Клинические модули
						</div>
						<div className="flex flex-col gap-1">
							{/* Pediatric Mixed Dentition Modal */}
							{onOpenPediatricModal && (
								<button
									type="button"
									onClick={() => {
										onOpenPediatricModal();
										setIsMoreMenuOpen(false);
									}}
									className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center gap-2 px-2.5 py-1 text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg transition-colors shrink-0 cursor-pointer select-none text-left"
									title="Сменный прикус: сроки прорезывания, стадии резорбции корней и Кариограмма Браттхолла"
								>
									<Sparkles size={14} className="text-amber-500 shrink-0" />
									<span>Сменный прикус</span>
								</button>
							)}

							{/* Periodontal Charting Module */}
							<button
								type="button"
								onClick={() => {
									if (onTogglePerio) onTogglePerio();
									setIsMoreMenuOpen(false);
								}}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center gap-2 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left ${
									isPerioOpen
										? "bg-[var(--teal-soft,rgba(13,148,136,0.2))] text-[var(--teal)] border-[var(--teal)]/50 shadow-xs font-black"
										: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal)] border-[var(--teal)]/30 hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))]"
								}`}
								title="Пародонтологическая карта: 6 точек зондирования, индексы OHI-S / PLI / SBI, скрининг CPITN"
								data-testid="btn-open-perio-chart"
							>
								<Activity size={14} className="text-[var(--teal)] shrink-0" />
								<span>Пародонтограмма</span>
							</button>

							{/* Orthodontic Cephalometry TRG Module */}
							<button
								type="button"
								onClick={() => {
									setIsOrthoCephOpen((prev) => !prev);
									setIsMoreMenuOpen(false);
								}}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center gap-2 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left ${
									isOrthoCephOpen
										? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50 shadow-xs font-black"
										: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/20"
								}`}
								title="Цефалометрия ТРГ: анализ Штайнера, Твида, Wits-число и углы SNA/SNB/ANB"
								data-testid="btn-open-ortho-ceph"
							>
								<Sparkles size={14} className="text-purple-500 shrink-0" />
								<span>Цефалометрия ТРГ</span>
							</button>

							{/* Diagnocat AI Report */}
							{onLoadDiagnocat && (
								<button
									type="button"
									onClick={() => {
										onLoadDiagnocat();
										setIsMoreMenuOpen(false);
									}}
									disabled={diagnocatLoading}
									className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center gap-2 px-2.5 py-1 text-xs font-bold bg-[var(--brand-500,#3b82f6)]/10 text-[var(--brand-500,#3b82f6)] border border-[var(--brand-500,#3b82f6)]/30 hover:bg-[var(--brand-500,#3b82f6)]/20 rounded-lg transition-colors shrink-0 cursor-pointer select-none text-left"
									title="Загрузить отчёт Diagnocat AI"
								>
									<Stethoscope size={14} className="text-[var(--brand-500,#3b82f6)] shrink-0" />
									<span>{diagnocatLoading ? "Загрузка..." : "Diagnocat AI"}</span>
								</button>
							)}

							{/* Print Odontogram A4 */}
							<button
								type="button"
								onClick={() => {
									setIsMoreMenuOpen(false);
									window.print();
								}}
								className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center gap-2 px-2.5 py-1 text-xs font-bold bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20 hover:bg-zinc-500/20 rounded-lg transition-colors shrink-0 cursor-pointer select-none text-left"
								title="Распечатать графическую одонтограмму со всеми патологиями на лист A4 для вклейки в амбулаторную карту"
								data-testid="print-odontogram-a4-btn"
							>
								<Printer size={14} className="text-zinc-500 shrink-0" />
								<span>Печать зубной формулы (А4)</span>
							</button>
						</div>
					</div>

					<div className="h-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] dark:bg-zinc-800" />

					{/* Subgroup: Display & Modes */}
					<div>
						<div className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
							Отображение и режимы
						</div>
						<div className="flex flex-col gap-1">
							{/* Shift Multi-Select Checkbox */}
							{onToggleMultiSelect && (
								<label
									className={`flex items-center justify-between min-h-[44px] sm:min-h-[32px] sm:h-[32px] text-xs font-bold cursor-pointer select-none px-2.5 py-1 rounded-lg border transition-colors ${
										isMultiSelectMode
											? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-black"
											: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)]"
									}`}
								>
									<span>Групповое выделение (Shift)</span>
									<input
										type="checkbox"
										checked={isMultiSelectMode ?? false}
										onChange={(e) => onToggleMultiSelect(e.target.checked)}
										className="accent-indigo-500 rounded cursor-pointer shrink-0 ml-2"
									/>
								</label>
							)}

							{/* Wisdom Teeth Toggle */}
							<button
								type="button"
								onClick={() => setShowWisdomTeeth((prev) => !prev)}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
									showWisdomTeeth
										? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-400/40 shadow-xs font-black"
										: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] opacity-80"
								}`}
								title="Показать или скрыть зубы мудрости (18, 28, 38, 48)"
							>
								<span className="flex items-center gap-2">
									{showWisdomTeeth ? <Eye size={14} /> : <EyeOff size={14} />}
									<span>Зубы мудрости (8-ки)</span>
								</span>
								<span className="text-xs font-mono opacity-60">
									{showWisdomTeeth ? "ВКЛ" : "ВЫКЛ"}
								</span>
							</button>

							{/* Pulp & Root Canals X-Ray Toggle */}
							{activeMode === "anatomical_svg" && (
								<button
									type="button"
									onClick={() => setShowPulpAndCanals((prev) => !prev)}
									className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
										showPulpAndCanals
											? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40 shadow-xs font-black"
											: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] opacity-80"
									}`}
									title="Рентген-прозрачность эмали для просмотра корневых каналов и пульпы"
								>
									<span className="flex items-center gap-2">
										<Activity size={14} />
										<span>Каналы и пульпа</span>
									</span>
									<span className="text-xs font-mono opacity-60">
										{showPulpAndCanals ? "ВКЛ" : "ВЫКЛ"}
									</span>
								</button>
							)}

							{/* Fast Extraction Mode */}
							<button
								type="button"
								onClick={() => setIsFastExtractMode((prev) => !prev)}
								className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
									isFastExtractMode
										? "bg-rose-600 text-white border-rose-700 shadow-md animate-pulse font-black"
										: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:text-rose-600 dark:hover:text-rose-400"
								}`}
								title="Режим быстрого удаления зубов (экспресс-экстракция)"
							>
								<span className="flex items-center gap-2">
									<Trash2 size={14} />
									<span>Быстрое удаление зубов</span>
								</span>
								<span className="text-xs font-mono opacity-60">
									{isFastExtractMode ? "ВКЛ" : "ВЫКЛ"}
								</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});
OdontogramToolbarMoreMenu.displayName = "OdontogramToolbarMoreMenu";
