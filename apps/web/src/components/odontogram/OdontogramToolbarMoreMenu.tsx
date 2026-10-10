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
	FlaskConical,
	Mic,
	MoreHorizontal,
	Printer,
	SlidersHorizontal,
	Sparkles,
	Stethoscope,
	Trash2,
} from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import type { ToothState } from "./ToothChart";

import type { OdontogramToolbarMoreMenuProps } from "./OdontogramToolbarMoreMenuTypes.js";
export type { OdontogramToolbarMoreMenuProps };

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
	isSmartOpgOpen,
	setIsSmartOpgOpen,
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
	onSyncAllToDiary,
	onOneClickLabOrder,
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
				className={`odontogram-tools-trigger-btn ${
					isMoreMenuOpen ||
					isFastExtractMode ||
					isMultiSelectMode ||
					isPerioOpen ||
					isOrthoCephOpen
						? "odontogram-tools-trigger-btn--active"
						: ""
				}`}
				title="Дополнительные инструменты, модули анализа и настройки"
				data-testid="btn-odontogram-more-menu"
				aria-expanded={isMoreMenuOpen}
				aria-haspopup="true"
			>
				<SlidersHorizontal
					size={14}
					className={`shrink-0 ${
						isMoreMenuOpen ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"
					}`}
				/>
				<span className="font-bold">Инструменты</span>
				<ChevronDown
					size={13}
					className={`shrink-0 transition-transform duration-200 ${
						isMoreMenuOpen ? "rotate-180 text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"
					}`}
				/>
				{(isFastExtractMode || isMultiSelectMode || isPerioOpen || isOrthoCephOpen) && (
					<span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0 ml-0.5" />
				)}
			</button>

			{isMoreMenuOpen && (
				<div
					className="absolute right-0 top-full mt-1.5 z-50 w-80 sm:w-84 p-2 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-col gap-2 max-h-[82vh] overflow-y-auto"
					role="menu"
					aria-label="Дополнительные инструменты"
				>
					{/* Subgroup 1: Clinical Modules */}
					<div>
						<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
							Клинические модули
						</div>
						<div className="flex flex-col gap-1">
							{/* Hotpath 043/u: Sync with visit diary */}
							{onSyncAllToDiary && (
								<button
									type="button"
									onClick={() => { onSyncAllToDiary(); setIsMoreMenuOpen(false); }}
									className="min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
									title="Перенести клинический статус зубной формулы в дневник приёма (Форма 043/у)"
									aria-label="В дневник приёма"
									data-testid="btn-hotpath-sync-all-to-diary"
								>
									<FileText size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									<div className="flex flex-col min-w-0">
										<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">В дневник приёма (043/у)</span>
										<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Синхронизация формулы с дневником</span>
									</div>
								</button>
							)}

							{/* Voice Dictation */}
							<button
								type="button"
								onClick={() => {
									if (onOpenVoiceDictation) { onOpenVoiceDictation(); } else { toggleVoiceEngine(); }
									setIsMoreMenuOpen(false);
								}}
								className={`min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left ${
									isVoiceListening ? "bg-rose-500/20 border-rose-500/50" : "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
								}`}
								title={isVoiceListening ? "Остановить голосовую диктовку" : "Голосовая диктовка зубной формулы"}
								aria-pressed={isVoiceListening}
								data-testid="odontogram-voice-dictation-btn"
							>
								<Mic size={16} className={isVoiceListening ? "text-rose-600 dark:text-rose-400" : "text-purple-600 dark:text-purple-400"} />
								<div className="flex flex-col min-w-0">
									<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
										{isVoiceListening ? "Остановить диктовку" : "Голосовая диктовка"}
									</span>
									<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Ввод патологий голосом (speech-to-text)</span>
								</div>
							</button>

							{/* Lab Order ZTL */}
							{onOneClickLabOrder && (
								<button
									type="button"
									onClick={() => {
										onOneClickLabOrder(selectedTeeth && selectedTeeth.length > 0 ? selectedTeeth : []);
										setIsMoreMenuOpen(false);
									}}
									className="min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
									title="Оформить наряд в зуботехническую лабораторию"
									data-testid="selected-teeth-lab-order-btn"
								>
									<FlaskConical size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
									<div className="flex flex-col min-w-0">
										<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
											Наряд в ЗТЛ {selectedTeeth && selectedTeeth.length > 0 ? `(${selectedTeeth.length})` : ""}
										</span>
										<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Ордер для зуботехнической лаборатории</span>
									</div>
								</button>
							)}

							{/* Smart OPG Panoramic AI Module */}
							{setIsSmartOpgOpen && (
								<button
									type="button"
									onClick={() => { setIsSmartOpgOpen(true); setIsMoreMenuOpen(false); }}
									className={`min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left ${
										isSmartOpgOpen ? "bg-sky-500/20 border-sky-500/50 shadow-xs" : "bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20"
									}`}
									title="Умный анализ ОПТГ: топологическая разметка всех 32 зубов, детекция ретенции, очагов периодонтита и автозаполнение Формы 043/у"
									data-testid="btn-open-smart-opg"
								>
									<Sparkles size={16} className="text-sky-600 dark:text-sky-400 shrink-0" />
									<div className="flex flex-col min-w-0">
										<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">Панорама ОПТГ AI</span>
										<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">ИИ-разметка 32 зубов, детекция патологий</span>
									</div>
								</button>
							)}

							{/* Print Odontogram A4 */}
							<button
								type="button"
								onClick={() => { setIsMoreMenuOpen(false); window.print(); }}
								className="min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 bg-zinc-500/10 border border-zinc-500/20 hover:bg-zinc-500/20 rounded-lg transition-colors shrink-0 cursor-pointer select-none text-left"
								title="Распечатать графическую одонтограмму со всеми патологиями на лист A4 для вклейки в амбулаторную карту"
								data-testid="print-odontogram-a4-btn"
							>
								<Printer size={16} className="text-zinc-600 dark:text-zinc-400 shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">Печать зубной формулы (А4)</span>
									<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Схема для амбулаторной карты</span>
								</div>
							</button>

							{/* Plan Wizard from Pathologies */}
							<button
								type="button"
								onClick={() => { setIsPlanWizardOpen(true); setIsMoreMenuOpen(false); }}
								className="min-h-[44px] sm:min-h-[38px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer select-none text-left flex items-center gap-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30"
								title="Сформировать черновой план лечения по МКБ-10 и каталогу услуг на основе всех патологий"
								aria-label="План лечения из патологий"
								data-testid="more-menu-plan-from-pathologies"
							>
								<FileText size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">План лечения из патологий</span>
									<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Автогенерация сметы по МКБ-10</span>
								</div>
							</button>

							{/* Periodontal Charting Module */}
							<button
								type="button"
								onClick={() => { if (onTogglePerio) onTogglePerio(); setIsMoreMenuOpen(false); }}
								className={`min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left ${
									isPerioOpen
										? "bg-[var(--teal-soft,rgba(13,148,136,0.2))] border-[var(--teal,#0d9488)]/50 shadow-xs"
										: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)]/30 hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))]"
								}`}
								title="Пародонтологическая карта: 6 точек зондирования, индексы OHI-S / PLI / SBI, скрининг CPITN"
								data-testid="btn-open-perio-chart"
							>
								<Activity size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">Пародонтограмма</span>
									<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">6 точек зондирования, OHI-S и CPITN</span>
								</div>
							</button>

							{/* Orthodontic Cephalometry TRG Module */}
							<button
								type="button"
								onClick={() => { setIsOrthoCephOpen((prev) => !prev); setIsMoreMenuOpen(false); }}
								className={`min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left ${
									isOrthoCephOpen ? "bg-purple-500/20 border-purple-500/50 shadow-xs" : "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
								}`}
								title="Цефалометрия ТРГ: анализ Штайнера, Твида, Wits-число и углы SNA/SNB/ANB"
								data-testid="btn-open-ortho-ceph"
							>
								<Sparkles size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">Цефалометрия ТРГ</span>
									<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Углы SNA/SNB/ANB, Wits, Штайнер и Твид</span>
								</div>
							</button>

							{/* Detailed Tooth Card */}
							<button
								type="button"
								onClick={() => {
									const targetTooth = selectedTeeth && selectedTeeth.length > 0 ? selectedTeeth[0]! : isPediatricEffective ? 55 : 16;
									setContextDrawerTooth(targetTooth);
									setIsMoreMenuOpen(false);
								}}
								className="min-h-[44px] sm:min-h-[38px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer select-none text-left flex items-center gap-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30"
								title="Открыть подробную карточку зуба с поверхностями и протоколами"
								data-testid="more-menu-tooth-card"
							>
								<Stethoscope size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
								<div className="flex flex-col min-w-0">
									<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">Детальная карточка зуба</span>
									<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Поверхности (MODVL), каналы и протокол</span>
								</div>
							</button>

							{/* Pediatric Mixed Dentition Modal */}
							{onOpenPediatricModal && (
								<button
									type="button"
									onClick={() => { onOpenPediatricModal(); setIsMoreMenuOpen(false); }}
									className="min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg transition-colors shrink-0 cursor-pointer select-none text-left"
									title="Сменный прикус: сроки прорезывания, стадии резорбции корней и Кариограмма Браттхолла"
									data-testid="btn-more-menu-pediatric"
								>
									<Sparkles size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
									<div className="flex flex-col min-w-0">
										<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">Сменный прикус</span>
										<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Сроки прорезывания и резорбция корней</span>
									</div>
								</button>
							)}

							{/* Diagnocat AI Report */}
							{onLoadDiagnocat && (
								<button
									type="button"
									onClick={() => { onLoadDiagnocat(); setIsMoreMenuOpen(false); }}
									disabled={diagnocatLoading}
									className="min-h-[44px] sm:min-h-[38px] flex items-center gap-2.5 px-2.5 py-1.5 bg-[var(--brand-500,#3b82f6)]/10 border border-[var(--brand-500,#3b82f6)]/30 hover:bg-[var(--brand-500,#3b82f6)]/20 rounded-lg transition-colors shrink-0 cursor-pointer select-none text-left"
									title="Загрузить отчёт Diagnocat AI"
									data-testid="btn-more-menu-diagnocat"
								>
									<Stethoscope size={16} className="text-[var(--brand-500,#3b82f6)] shrink-0" />
									<div className="flex flex-col min-w-0">
										<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
											{diagnocatLoading ? "Загрузка отчёта..." : "Diagnocat AI"}
										</span>
										<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Радиологический ИИ-отчёт КЛКТ</span>
									</div>
								</button>
							)}
						</div>
					</div>

					<div className="h-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] dark:bg-zinc-800" />

					{/* Subgroup 2: Display & Modes */}
					<div>
						<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
							Анатомия и отображение
						</div>
						<div className="flex flex-col gap-1">
							{/* Wisdom Teeth Toggle */}
							<button
								type="button"
								onClick={() => setShowWisdomTeeth((prev) => !prev)}
								className={`min-h-[44px] sm:min-h-[38px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
									showWisdomTeeth ? "bg-indigo-500/10 border-indigo-400/40 shadow-xs" : "bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20"
								}`}
								title="Показать или скрыть зубы мудрости (18, 28, 38, 48)"
								data-testid="btn-odontogram-wisdom-missing"
							>
								<span className="flex items-center gap-2.5 min-w-0">
									{showWisdomTeeth ? (
										<Eye size={16} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
									) : (
										<EyeOff size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
									)}
									<div className="flex flex-col text-left min-w-0">
										<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">Зубы мудрости (8-ки)</span>
										<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Третьи моляры (18, 28, 38, 48)</span>
									</div>
								</span>
								<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 shrink-0 ml-2">
									{showWisdomTeeth ? "ВКЛ" : "ВЫКЛ"}
								</span>
							</button>

							{/* Pulp & Root Canals X-Ray Toggle */}
							{activeMode === "anatomical_svg" && (
								<button
									type="button"
									onClick={() => setShowPulpAndCanals((prev) => !prev)}
									className={`min-h-[44px] sm:min-h-[38px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
										showPulpAndCanals ? "bg-rose-500/15 border-rose-400/40 shadow-xs" : "bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20"
									}`}
									title="Рентген-прозрачность эмали для просмотра корневых каналов и пульпы"
									data-testid="btn-odontogram-pulp-canals"
								>
									<span className="flex items-center gap-2.5 min-w-0">
										<Activity
											size={16}
											className={`shrink-0 ${showPulpAndCanals ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}
										/>
										<div className="flex flex-col text-left min-w-0">
											<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">Каналы и пульпа</span>
											<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Рентген-прозрачность эмали для эндодонтии</span>
										</div>
									</span>
									<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 shrink-0 ml-2">
										{showPulpAndCanals ? "ВКЛ" : "ВЫКЛ"}
									</span>
								</button>
							)}

							{/* Fast Extraction Mode */}
							<button
								type="button"
								onClick={() => setIsFastExtractMode((prev) => !prev)}
								className={`min-h-[44px] sm:min-h-[38px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
									isFastExtractMode ? "bg-rose-600 border-rose-700 shadow-md animate-pulse" : "bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20"
								}`}
								title="Режим быстрого удаления зубов (экспресс-экстракция)"
								data-testid="btn-odontogram-fast-extract"
							>
								<span className="flex items-center gap-2.5 min-w-0">
									<Trash2 size={16} className={`shrink-0 ${isFastExtractMode ? "text-white" : "text-amber-600 dark:text-amber-400"}`} />
									<div className="flex flex-col text-left min-w-0">
										<span className={`font-bold text-[12px] leading-tight ${isFastExtractMode ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>
											Быстрое удаление зубов
										</span>
										<span className={`text-[10px] font-normal truncate ${isFastExtractMode ? "text-rose-100" : "text-slate-700 dark:text-slate-300"}`}>
											Экспресс-экстракция кликом по зубу
										</span>
									</div>
								</span>
								<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 shrink-0 ml-2">
									{isFastExtractMode ? "ВКЛ" : "ВЫКЛ"}
								</span>
							</button>

							{/* Shift Multi-Select Checkbox */}
							{onToggleMultiSelect && (
								<label
									className={`flex items-center justify-between min-h-[44px] sm:min-h-[38px] cursor-pointer select-none px-2.5 py-1.5 rounded-lg border transition-colors ${
										isMultiSelectMode ? "bg-indigo-500/15 border-indigo-500/30" : "bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20"
									}`}
									data-testid="label-odontogram-multiselect"
								>
									<span className="flex items-center gap-2.5 min-w-0">
										<SlidersHorizontal size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
										<div className="flex flex-col text-left min-w-0">
											<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">Групповое выделение (Shift)</span>
											<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">Выбор нескольких зубов кликом</span>
										</div>
									</span>
									<input
										type="checkbox"
										checked={isMultiSelectMode ?? false}
										onChange={(e) => onToggleMultiSelect(e.target.checked)}
										className="accent-indigo-500 rounded cursor-pointer shrink-0 ml-2 w-4 h-4"
										data-testid="checkbox-odontogram-multiselect"
									/>
								</label>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
});
OdontogramToolbarMoreMenu.displayName = "OdontogramToolbarMoreMenu";

