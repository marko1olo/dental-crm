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
			className="odontogram-toolbar flex items-center justify-between gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] w-full select-none flex-nowrap overflow-x-auto no-scrollbar scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x min-h-[38px] h-[38px]"
			role="toolbar"
			aria-label="Панель управления зубной формулой"
		>
			{/* Левая группа: Режимы схемы (3D / 6-гран / ГОСТ) + Палитра статусов + Прикус + Санирован */}
			<div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
				{/* Segmented View Mode Radios: 3D / FDI 6-гр / ГОСТ */}
				<div
					className="inline-flex items-center p-[2px] rounded-[9px] bg-[var(--paper-soft,var(--odontogram-surface,#f8fafc))] border border-[var(--line-subtle,var(--odontogram-border,#e2e8f0))] shrink-0 h-7.5 gap-[2px] shadow-2xs"
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
								className={`h-6.5 flex items-center gap-1 px-2.5 rounded-[7px] text-[12.5px] whitespace-nowrap transition-all duration-150 cursor-pointer select-none shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
									isActive
										? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs font-semibold border border-[var(--line-subtle,var(--odontogram-border,#cbd5e1))]"
										: "text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] font-medium"
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

				<div className="w-px h-4.5 bg-[var(--odontogram-border)] dark:bg-zinc-700 shrink-0 mx-0.5" />

				{/* Segmented Dentition Formula 1-Click Toggle: 11-48 / 51-85 / Сменный */}
				{onDentitionModeChange && (
					<div
						className="inline-flex items-center p-[2px] rounded-[9px] bg-[var(--paper-soft,var(--odontogram-surface,#f8fafc))] border border-[var(--line-subtle,var(--odontogram-border-subtle,#e2e8f0))] shrink-0 h-7.5 gap-[2px] shadow-2xs"
						role="radiogroup"
						aria-label="Тип прикуса"
					>
						<button
							type="button"
							onClick={() => onDentitionModeChange("adult")}
							className={`h-6.5 px-2 rounded-[7px] text-[12.5px] transition-all cursor-pointer select-none flex items-center gap-1 shrink-0 ${
								(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) ===
								"adult"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-semibold shadow-xs"
									: "text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] font-medium"
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
							className={`h-6.5 px-2 rounded-[7px] text-[12.5px] transition-all cursor-pointer select-none flex items-center gap-1 shrink-0 ${
								(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) ===
								"pediatric"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-semibold shadow-xs"
									: "text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] font-medium"
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
							className={`h-6.5 px-2 rounded-[7px] text-[12.5px] transition-all cursor-pointer select-none flex items-center gap-1 shrink-0 ${
								(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) ===
								"mixed"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-semibold shadow-xs"
									: "text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-hover,#f1f5f9)] font-medium"
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

				<div className="w-px h-4.5 bg-[var(--odontogram-border)] dark:bg-zinc-700 shrink-0 mx-0.5" />

				{/* 1-Click Total Sanitation */}
				{onQuickStateChange && (
					<button
						type="button"
						onClick={handleMarkIntactDentition}
						className="h-7.5 px-2.5 rounded-[8px] text-[12.5px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shadow-xs flex items-center gap-1 shrink-0 active:scale-98 whitespace-nowrap"
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
			<div className="flex items-center gap-1.5 shrink-0 flex-nowrap min-w-0 ml-auto pr-1">
				{/* Перенос клинического статуса зубной формулы в Дневник 043/у */}
				{onSyncAllToDiary && (
					<button
						type="button"
						onClick={onSyncAllToDiary}
						className="h-7.5 px-2.5 rounded-[8px] text-[12.5px] font-semibold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-xs whitespace-nowrap"
						title="Перенести клинический статус зубной формулы в дневник приёма"
						aria-label="В дневник приёма"
						data-testid="btn-hotpath-sync-all-to-diary"
					>
						<FileText size={13} className="shrink-0" />
						<span>В дневник</span>
					</button>
				)}

				{/* Компактный финансовый бейдж приема */}
				{liveGrossTotalRub !== undefined && (
					<div
						className="flex items-center gap-1.5 px-2 h-7.5 rounded-[8px] bg-teal-500/10 dark:bg-teal-950/40 border border-teal-500/30 text-teal-900 dark:text-teal-200 text-[12.5px] font-medium shrink-0 shadow-2xs whitespace-nowrap"
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
								className="ml-1 px-2.5 h-6 rounded-[6px] bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold text-[12px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
								title="Открыть быструю кассу приема"
								data-testid="btn-open-fast-checkout"
							>
								<span>Оплатить</span>
							</button>
						)}
					</div>
				)}

				{/* Критический аллерго-бейдж безопасности (аккуратный, без обрезки текста) */}
				{allergyText && (
					<span
						className="h-7.5 px-2.5 rounded-[8px] bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 font-semibold text-[12px] inline-flex items-center gap-1 shrink-0 whitespace-nowrap shadow-2xs"
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
						className="h-7.5 px-2.5 rounded-[8px] text-[12.5px] font-semibold text-amber-900 dark:text-amber-100 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 flex items-center gap-1 cursor-pointer shrink-0 transition-all active:scale-95 shadow-2xs whitespace-nowrap"
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
					className={`h-7.5 flex items-center gap-1 px-2.5 rounded-[8px] text-[12.5px] font-semibold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
						(isEstimatorOpen ?? isLiveInvoiceOpen)
							? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] border-[var(--teal-dark,var(--teal))] shadow-sm"
							: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal)] border-[var(--teal)]/30 hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))]"
					}`}
					title="Открыть живой калькулятор сметы лечения"
				>
					<Coins size={13} />
					<span className="hidden sm:inline">Смета</span>
				</button>

				<button
					type="button"
					onClick={() => setIsPlanWizardOpen(true)}
					className="hidden 2xl:flex h-7.5 items-center gap-1 px-2.5 rounded-[8px] text-[12.5px] font-semibold whitespace-nowrap border border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
					title="Сформировать черновой план лечения из услуг каталога"
					data-testid="create-plan-from-pathologies-btn"
				>
					<FileText
						size={13}
						className="text-indigo-600 dark:text-indigo-400"
					/>
					<span>План</span>
				</button>

				<button
					type="button"
					onClick={() => {
						if (onOpenVoiceDictation) {
							onOpenVoiceDictation();
						} else {
							toggleVoiceEngine();
						}
					}}
					className={`h-7.5 flex items-center gap-1 px-2.5 rounded-[8px] text-[12.5px] font-semibold whitespace-nowrap shadow-xs shrink-0 flex-shrink-0 min-w-max cursor-pointer transition-all active:scale-95 ${
						isVoiceListening
							? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-500/30"
							: "bg-indigo-600 hover:bg-indigo-500 text-white"
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
						<MicOff size={12} className="shrink-0" />
					) : (
						<Mic size={12} className="shrink-0" />
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
