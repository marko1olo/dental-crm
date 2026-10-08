/**
 * DENTE Dental CRM — Odontogram Unified Clinical Toolbar
 *
 * 1-Level Compact Console (34px height) hosting View Mode Radios, Quick Status Triggers,
 * Dentition Selectors, Sanitation, Financial/Diary Badges, and Dropdowns.
 */

import React from "react";
import {
	AlertTriangle,
	Coins,
	FileText,
	FlaskConical,
	Mic,
	MicOff,
	Sparkles,
	Zap,
} from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import type { ToothState } from "./ToothChart";
import {
	ODONTOGRAM_VIEW_MODES,
	type OdontogramViewOption,
} from "./OdontogramViewTypes";
import { OdontogramToolbarQuickActions } from "./OdontogramToolbarQuickActions";
import { OdontogramToolbarMoreMenu } from "./OdontogramToolbarMoreMenu";

export interface OdontogramToolbarProps {
	activeMode: OdontogramViewMode;
	handleModeSwitch: (mode: OdontogramViewMode) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	handleQuickTriggerState: (state: ToothState) => void;
	activeStampTool: ToothState | null;
	setActiveStampTool: React.Dispatch<React.SetStateAction<ToothState | null>>;
	onDentitionModeChange?: ((mode: "adult" | "pediatric" | "mixed") => void) | undefined;
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	onInvertSelection?: (() => void) | undefined;
	onClearSelection?: (() => void) | undefined;
	pediatricMode?: boolean | undefined;
	isPediatricEffective: boolean;
	handleMarkIntactDentition: () => void;
	handleMarkWisdomTeethMissing: () => void;
	onSyncAllToDiary?: (() => void) | undefined;
	liveGrossTotalRub?: number | undefined;
	onOpenFastCheckout?: (() => void) | undefined;
	allergyText?: string | undefined;
	selectedTeeth?: number[] | undefined;
	onOneClickLabOrder?: ((teeth: number[]) => void) | undefined;
	onToggleEstimator?: (() => void) | undefined;
	isEstimatorOpen?: boolean | undefined;
	isLiveInvoiceOpen: boolean;
	setIsLiveInvoiceOpen: React.Dispatch<React.SetStateAction<boolean>>;
	setIsPlanWizardOpen: (open: boolean) => void;
	onOpenVoiceDictation?: (() => void) | undefined;
	toggleVoiceEngine: () => void;
	isVoiceListening: boolean;
	handleBatchSelectGroup: (teeth: number[]) => void;
	setActiveJawModalTarget: (target: "JU" | "JL" | "C") => void;
	ADULT_Q1: number[];
	ADULT_Q2: number[];
	ADULT_Q3: number[];
	ADULT_Q4: number[];
	ADULT_FRONT: number[];
	PEDIATRIC_Q5: number[];
	PEDIATRIC_Q6: number[];
	PEDIATRIC_Q7: number[];
	PEDIATRIC_Q8: number[];
	PEDIATRIC_FRONT: number[];
	isMoreMenuOpen: boolean;
	setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isFastExtractMode: boolean;
	setIsFastExtractMode: React.Dispatch<React.SetStateAction<boolean>>;
	isMultiSelectMode?: boolean | undefined;
	onToggleMultiSelect?: ((enabled: boolean) => void) | undefined;
	isPerioOpen?: boolean | undefined;
	onTogglePerio?: (() => void) | undefined;
	isOrthoCephOpen: boolean;
	setIsOrthoCephOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isSmartOpgOpen?: boolean | undefined;
	setIsSmartOpgOpen?: React.Dispatch<React.SetStateAction<boolean>> | undefined;
	setContextDrawerTooth: (tooth: number | null) => void;
	onOpenPediatricModal?: (() => void) | undefined;
	onLoadDiagnocat?: (() => void) | undefined;
	diagnocatLoading?: boolean | undefined;
	showWisdomTeeth: boolean;
	setShowWisdomTeeth: React.Dispatch<React.SetStateAction<boolean>>;
	showPulpAndCanals: boolean;
	setShowPulpAndCanals: React.Dispatch<React.SetStateAction<boolean>>;
}

export const OdontogramToolbar: React.FC<OdontogramToolbarProps> = React.memo(({
	activeMode,
	handleModeSwitch,
	onQuickStateChange,
	handleQuickTriggerState,
	activeStampTool,
	setActiveStampTool,
	onDentitionModeChange,
	dentitionMode,
	onInvertSelection,
	onClearSelection,
	pediatricMode,
	isPediatricEffective,
	handleMarkIntactDentition,
	handleMarkWisdomTeethMissing,
	onSyncAllToDiary,
	liveGrossTotalRub,
	onOpenFastCheckout,
	allergyText,
	selectedTeeth,
	onOneClickLabOrder,
	onToggleEstimator,
	isEstimatorOpen,
	isLiveInvoiceOpen,
	setIsLiveInvoiceOpen,
	setIsPlanWizardOpen,
	onOpenVoiceDictation,
	toggleVoiceEngine,
	isVoiceListening,
	handleBatchSelectGroup,
	setActiveJawModalTarget,
	ADULT_Q1,
	ADULT_Q2,
	ADULT_Q3,
	ADULT_Q4,
	ADULT_FRONT,
	PEDIATRIC_Q5,
	PEDIATRIC_Q6,
	PEDIATRIC_Q7,
	PEDIATRIC_Q8,
	PEDIATRIC_FRONT,
	isMoreMenuOpen,
	setIsMoreMenuOpen,
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
	setContextDrawerTooth,
	onOpenPediatricModal,
	onLoadDiagnocat,
	diagnocatLoading,
	showWisdomTeeth,
	setShowWisdomTeeth,
	showPulpAndCanals,
	setShowPulpAndCanals,
}) => {
	return (
		<div
			className="odontogram-toolbar flex items-center justify-between gap-1.5 px-2.5 py-1 border-b border-[var(--line-strong,var(--odontogram-border,#cbd5e1))] bg-[var(--paper,#ffffff)] w-full select-none flex-nowrap overflow-x-auto no-scrollbar scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x min-h-[40px] h-[40px]"
			role="toolbar"
			aria-label="Панель управления зубной формулой"
		>
			{/* Левая группа: Режимы схемы (3D / 6-гран / ГОСТ) + Прикус + Санирован */}
			<div className="flex items-center gap-1.5 flex-nowrap shrink-0">
				{/* Segmented View Mode Radios: 3D / FDI 6-гр / ГОСТ */}
				<div
					className="inline-flex items-center p-[2px] rounded-[8px] bg-[var(--paper-soft,var(--odontogram-surface,#f8fafc))] border border-[var(--line-strong,var(--odontogram-border,#cbd5e1))] shrink-0 h-8 gap-[2px] shadow-2xs"
					role="radiogroup"
					aria-label="Режимы схемы"
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
								onClick={() => handleModeSwitch(option.mode)}
								className={`h-7 flex items-center gap-1.5 px-2.5 rounded-[6px] text-[12px] whitespace-nowrap transition-all duration-150 cursor-pointer select-none shrink-0 ${
									isActive
										? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs font-bold border border-[var(--line-strong,var(--odontogram-border,#cbd5e1))]"
										: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] font-medium border border-transparent"
								}`}
							>
								{option.icon}
								<span>
									{option.compactLabel || option.mobileLabel || option.shortLabel}
								</span>
							</button>
						);
					})}
				</div>

				<div className="w-px h-5 bg-[var(--line-strong,var(--odontogram-border,#cbd5e1))] shrink-0 mx-0.5" />

				{/* Segmented Dentition Formula 1-Click Toggle: 11-48 / 51-85 / Сменный */}
				{onDentitionModeChange && (
					<div
						className="inline-flex items-center p-[2px] rounded-[8px] bg-[var(--paper-soft,var(--odontogram-surface,#f8fafc))] border border-[var(--line-strong,var(--odontogram-border,#cbd5e1))] shrink-0 h-8 gap-[2px] shadow-2xs"
						role="radiogroup"
						aria-label="Тип прикуса"
					>
						<button
							type="button"
							onClick={() => onDentitionModeChange("adult")}
							className={`h-7 px-2.5 rounded-[6px] text-[12px] transition-all cursor-pointer select-none flex items-center gap-1 shrink-0 ${
								(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) ===
								"adult"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-bold shadow-xs border border-[var(--teal-dark,var(--teal))]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] font-medium border border-transparent"
							}`}
							title="Постоянный прикус взрослых (11–48, 32 зуба)"
							data-testid="toolbar-dentition-adult"
							role="radio"
							aria-checked={
								(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) ===
								"adult"
							}
						>
							<span>11–48</span>
						</button>
						<button
							type="button"
							onClick={() => onDentitionModeChange("pediatric")}
							className={`h-7 px-2.5 rounded-[6px] text-[12px] transition-all cursor-pointer select-none flex items-center gap-1 shrink-0 ${
								(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) ===
								"pediatric"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-bold shadow-xs border border-[var(--teal-dark,var(--teal))]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] font-medium border border-transparent"
							}`}
							title="Детский молочный прикус (51–85, 20 зубов)"
							data-testid="toolbar-dentition-pediatric"
							role="radio"
							aria-checked={
								(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) ===
								"pediatric"
							}
						>
							<span>51–85</span>
						</button>
						<button
							type="button"
							onClick={() => onDentitionModeChange("mixed")}
							className={`h-7 px-2.5 rounded-[6px] text-[12px] transition-all cursor-pointer select-none flex items-center gap-1 shrink-0 ${
								(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) ===
								"mixed"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-bold shadow-xs border border-[var(--teal-dark,var(--teal))]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] font-medium border border-transparent"
							}`}
							title="Сменный прикус: 20 молочных + 4 первых постоянных моляра"
							data-testid="toolbar-dentition-mixed"
							role="radio"
							aria-checked={
								(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) ===
								"mixed"
							}
						>
							<span><span className="hidden md:inline">Сменный</span><span className="md:hidden">Смен.</span></span>
						</button>
					</div>
				)}

				<div className="w-px h-5 bg-[var(--line-strong,var(--odontogram-border,#cbd5e1))] shrink-0 mx-0.5" />

				{/* 1-Click Total Sanitation */}
				{onQuickStateChange && (
					<button
						type="button"
						onClick={handleMarkIntactDentition}
						className="h-8 px-2.5 rounded-[8px] text-[12px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-600/40 dark:border-emerald-500/50 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0 active:scale-98 whitespace-nowrap"
						title="Физиологическая норма (зубные ряды интактны): вся зубная формула отмечается здоровой"
						data-testid="mark-intact-dentition-btn"
					>
						<Zap
							size={13}
							className="text-emerald-600 dark:text-emerald-400 shrink-0"
						/>
						<span className="whitespace-nowrap">Санирован</span>
					</button>
				)}
			</div>

			{/* Правая группа: 043/у + Касса/Смета + Аллергии + ЗТЛ + Смета + План + Пульт + Действия + Ещё */}
			<div className="flex items-center gap-1.5 shrink-0 flex-nowrap min-w-0 ml-auto pr-0.5">
				{/* Перенос клинического статуса зубной формулы в Дневник 043/у */}
				{onSyncAllToDiary && (
					<button
						type="button"
						onClick={onSyncAllToDiary}
						className="h-8 px-2.5 rounded-[8px] text-[12px] font-bold bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] border border-[var(--line-strong,var(--odontogram-border,#cbd5e1))] transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs whitespace-nowrap active:scale-98"
						title="Перенести клинический статус зубной формулы в дневник приёма"
						aria-label="В дневник приёма"
						data-testid="btn-hotpath-sync-all-to-diary"
					>
						<FileText size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
						<span>В дневник</span>
					</button>
				)}

				{/* Компактный финансовый бейдж приема */}
				{liveGrossTotalRub !== undefined && (
					<div
						className="flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] bg-teal-500/10 dark:bg-teal-950/40 border border-teal-600/40 dark:border-teal-500/50 text-teal-900 dark:text-teal-200 text-[12px] font-medium shrink-0 shadow-2xs whitespace-nowrap"
						data-testid="odontogram-compact-bill-badge"
					>
						<Coins className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
						<strong className="font-mono font-bold text-[12.5px] text-teal-800 dark:text-teal-200 shrink-0 whitespace-nowrap">
							{liveGrossTotalRub.toLocaleString("ru-RU", {
								minimumFractionDigits: 0,
							})}{" "}
							₽
						</strong>
						{onOpenFastCheckout && (
							<button
								type="button"
								onClick={onOpenFastCheckout}
								className="ml-1 px-2.5 h-6 rounded-[6px] bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-[11.5px] flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0"
								title="Открыть быструю кассу приема"
								data-testid="btn-open-fast-checkout"
							>
								<span>Оплатить</span>
							</button>
						)}
					</div>
				)}

				{/* Критический аллерго-бейдж безопасности */}
				{allergyText && (
					<span
						className="h-8 px-2.5 rounded-[8px] bg-rose-500/10 border border-rose-600/40 dark:border-rose-500/50 text-rose-700 dark:text-rose-300 font-bold text-[12px] inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-2xs"
						data-testid="badge-critical-allergy-tier1"
						title={`Аллергия в анамнезе: ${allergyText}`}
					>
						<AlertTriangle size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
						<span>Аллергия</span>
					</span>
				)}

				{/* Наряд в ЗТЛ при выделенных зубах */}
				{selectedTeeth && selectedTeeth.length > 0 && onOneClickLabOrder && (
					<button
						type="button"
						onClick={() => onOneClickLabOrder(selectedTeeth)}
						className="h-8 px-2.5 rounded-[8px] text-[12px] font-bold text-amber-900 dark:text-amber-100 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-600/40 dark:border-amber-500/50 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-98 shadow-2xs whitespace-nowrap"
						title="Оформить наряд в зуботехническую лабораторию для выбранных зубов"
						data-testid="selected-teeth-lab-order-btn"
					>
						<FlaskConical
							size={13}
							className="text-amber-600 dark:text-amber-400 shrink-0"
						/>
						<span>ЗТЛ ({selectedTeeth.length})</span>
					</button>
				)}

				<button
					type="button"
					onClick={() => {
						if (onToggleEstimator) {
							onToggleEstimator();
						} else {
							setIsLiveInvoiceOpen((prev) => !prev);
						}
					}}
					className={`h-8 flex items-center gap-1.5 px-2.5 rounded-[8px] text-[12px] font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer shadow-2xs active:scale-98 ${
						(isEstimatorOpen ?? isLiveInvoiceOpen)
							? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] border-[var(--teal-dark,var(--teal))] shadow-xs"
							: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line-strong,var(--odontogram-border,#cbd5e1))] hover:bg-[var(--paper-hover,#f1f5f9)] hover:border-teal-500"
					}`}
					title="Открыть живой калькулятор сметы лечения"
				>
					<Coins size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="hidden sm:inline">Смета</span>
				</button>

				<button
					type="button"
					onClick={() => setIsPlanWizardOpen(true)}
					className="hidden 2xl:flex h-8 items-center gap-1.5 px-2.5 rounded-[8px] text-[12px] font-bold whitespace-nowrap border border-[var(--line-strong,var(--odontogram-border,#cbd5e1))] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] transition-all shrink-0 cursor-pointer shadow-2xs active:scale-98"
					title="Сформировать черновой план лечения из услуг каталога"
					data-testid="create-plan-from-pathologies-btn"
				>
					<FileText
						size={13}
						className="text-indigo-600 dark:text-indigo-400 shrink-0"
					/>
					<span>План</span>
				</button>

				{setIsSmartOpgOpen && (
					<button
						type="button"
						onClick={() => setIsSmartOpgOpen(true)}
						className="hidden xl:flex h-8 items-center gap-1.5 px-2.5 rounded-[8px] text-[12px] font-bold whitespace-nowrap border border-[var(--line-strong,var(--odontogram-border,#cbd5e1))] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] transition-all shrink-0 cursor-pointer shadow-2xs active:scale-98"
						title="Умный анализ панорамного снимка ОПТГ нейросетью"
						data-testid="toolbar-open-smart-opg-btn"
					>
						<Sparkles
							size={13}
							className="text-sky-500 shrink-0"
						/>
						<span>ОПТГ AI</span>
					</button>
				)}

				<button
					type="button"
					onClick={() => {
						if (onOpenVoiceDictation) {
							onOpenVoiceDictation();
						} else {
							toggleVoiceEngine();
						}
					}}
					className={`h-8 flex items-center gap-1.5 px-2.5 rounded-[8px] text-[12px] font-bold whitespace-nowrap shadow-2xs shrink-0 flex-shrink-0 min-w-max cursor-pointer transition-all active:scale-98 border ${
						isVoiceListening
							? "bg-rose-600 hover:bg-rose-500 text-white border-rose-700 animate-pulse ring-2 ring-rose-500/30"
							: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line-strong,var(--odontogram-border,#cbd5e1))] hover:bg-[var(--paper-hover,#f1f5f9)]"
					}`}
					title={
						isVoiceListening
							? "Остановить диктовку"
							: "Пульт голосовой диктовки зубной формулы"
					}
					aria-pressed={isVoiceListening}
					data-testid="odontogram-voice-dictation-btn"
				>
					{isVoiceListening ? (
						<MicOff size={13} className="text-white shrink-0" />
					) : (
						<Mic size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
					)}
					<span className="hidden xl:inline shrink-0">
						{isVoiceListening ? "Слушаю..." : "Пульт"}
					</span>
				</button>

				{/* Quick Actions Dropdown */}
				<OdontogramToolbarQuickActions
					onQuickStateChange={onQuickStateChange}
					handleMarkIntactDentition={handleMarkIntactDentition}
					handleMarkWisdomTeethMissing={handleMarkWisdomTeethMissing}
					handleBatchSelectGroup={handleBatchSelectGroup}
					setActiveJawModalTarget={setActiveJawModalTarget}
					pediatricMode={pediatricMode}
					isPediatricEffective={isPediatricEffective}
					ADULT_Q1={ADULT_Q1}
					ADULT_Q2={ADULT_Q2}
					ADULT_Q3={ADULT_Q3}
					ADULT_Q4={ADULT_Q4}
					ADULT_FRONT={ADULT_FRONT}
					PEDIATRIC_Q5={PEDIATRIC_Q5}
					PEDIATRIC_Q6={PEDIATRIC_Q6}
					PEDIATRIC_Q7={PEDIATRIC_Q7}
					PEDIATRIC_Q8={PEDIATRIC_Q8}
					PEDIATRIC_FRONT={PEDIATRIC_FRONT}
					activeStampTool={activeStampTool}
					selectedTeeth={selectedTeeth}
					onInvertSelection={onInvertSelection}
					onClearSelection={onClearSelection}
				/>

				{/* "Ещё..." Dropdown Menu */}
				<OdontogramToolbarMoreMenu
					isMoreMenuOpen={isMoreMenuOpen}
					setIsMoreMenuOpen={setIsMoreMenuOpen}
					activeStampTool={activeStampTool}
					setActiveStampTool={setActiveStampTool}
					isFastExtractMode={isFastExtractMode}
					setIsFastExtractMode={setIsFastExtractMode}
					isMultiSelectMode={isMultiSelectMode}
					onToggleMultiSelect={onToggleMultiSelect}
					isPerioOpen={isPerioOpen}
					onTogglePerio={onTogglePerio}
					isOrthoCephOpen={isOrthoCephOpen}
					setIsOrthoCephOpen={setIsOrthoCephOpen}
					isSmartOpgOpen={isSmartOpgOpen}
					setIsSmartOpgOpen={setIsSmartOpgOpen}
					handleMarkIntactDentition={handleMarkIntactDentition}
					handleMarkWisdomTeethMissing={handleMarkWisdomTeethMissing}
					setIsPlanWizardOpen={setIsPlanWizardOpen}
					onOpenVoiceDictation={onOpenVoiceDictation}
					toggleVoiceEngine={toggleVoiceEngine}
					isVoiceListening={isVoiceListening}
					selectedTeeth={selectedTeeth}
					isPediatricEffective={isPediatricEffective}
					setContextDrawerTooth={setContextDrawerTooth}
					onOpenPediatricModal={onOpenPediatricModal}
					onLoadDiagnocat={onLoadDiagnocat}
					diagnocatLoading={diagnocatLoading}
					showWisdomTeeth={showWisdomTeeth}
					setShowWisdomTeeth={setShowWisdomTeeth}
					activeMode={activeMode}
					showPulpAndCanals={showPulpAndCanals}
					setShowPulpAndCanals={setShowPulpAndCanals}
				/>
			</div>
		</div>
	);
});
OdontogramToolbar.displayName = "OdontogramToolbar";
