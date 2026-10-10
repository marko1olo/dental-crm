/**
 * DENTE Dental CRM — Odontogram Unified Clinical Toolbar
 *
 * Professional 1-level console (34-36px height) with 3 functional islands:
 * - Island 1 (Left): View Mode Radios (3D / 2D / ГОСТ) + Dentition Selector (Взрослый / Детский / Сменный)
 * - Island 2 (Center): Hotpath Quick Actions («Санирован» with Lucide ShieldCheck + «В дневник» 043/у)
 * - Island 3 (Right): Allergy Alert, Financial Cash Widget, ZTL Orders, Voice Dictation, and Structured Dropdowns
 */

import React from "react";
import {
	AlertTriangle,
	ShieldCheck,
	Coins,
	FileText,
	FlaskConical,
	Mic,
	MicOff,
} from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import type { ToothState } from "./ToothChart";
import {
	ODONTOGRAM_VIEW_MODES,
	type OdontogramViewOption,
} from "./OdontogramViewTypes";
import { OdontogramToolbarQuickActions } from "./OdontogramToolbarQuickActions";
import { OdontogramToolbarMoreMenu } from "./OdontogramToolbarMoreMenu";
import "./OdontogramToolbar.css";

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
	handleQuickTriggerState: _handleQuickTriggerState,
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
	liveGrossTotalRub: _liveGrossTotalRub,
	onOpenFastCheckout: _onOpenFastCheckout,
	allergyText,
	selectedTeeth,
	onOneClickLabOrder,
	onToggleEstimator: _onToggleEstimator,
	isEstimatorOpen: _isEstimatorOpen,
	isLiveInvoiceOpen: _isLiveInvoiceOpen,
	setIsLiveInvoiceOpen: _setIsLiveInvoiceOpen,
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
	const currentDentition =
		dentitionMode ?? (pediatricMode ? "pediatric" : "adult");

	return (
		<div
			className="odontogram-toolbar select-none"
			role="toolbar"
			aria-label="Панель управления зубной формулой"
		>
			{/* ОСТРОВ 1 (Слева: Режимы схемы + Прикус) */}
			<div className="odontogram-toolbar__island odontogram-toolbar__island--left">
				{/* Режимы схемы: 3D Вид / 2D Грани / ГОСТ */}
				<div
					className="odontogram-toolbar__segmented"
					role="radiogroup"
					aria-label="Режимы схемы зубной формулы"
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
								className={`odontogram-toolbar__segment-btn ${
									isActive ? "odontogram-toolbar__segment-btn--active" : ""
								}`}
							>
								{option.icon}
								<span>
									{option.compactLabel || option.shortLabel}
								</span>
							</button>
						);
					})}
				</div>

				{/* Выбор прикуса: Взрослый (11–48) / Детский (51–85) / Сменный */}
				{onDentitionModeChange && (
					<div
						className="odontogram-toolbar__segmented"
						role="radiogroup"
						aria-label="Тип зубного прикуса"
					>
						<button
							type="button"
							onClick={() => onDentitionModeChange("adult")}
							className={`odontogram-toolbar__segment-btn ${
								currentDentition === "adult"
									? "odontogram-toolbar__segment-btn--teal-active"
									: ""
							}`}
							title="Постоянный прикус взрослых (11–48, 32 зуба)"
							data-testid="toolbar-dentition-adult"
							role="radio"
							aria-checked={currentDentition === "adult"}
						>
							<span>Взрослый</span>
						</button>
						<button
							type="button"
							onClick={() => onDentitionModeChange("pediatric")}
							className={`odontogram-toolbar__segment-btn ${
								currentDentition === "pediatric"
									? "odontogram-toolbar__segment-btn--teal-active"
									: ""
							}`}
							title="Детский молочный прикус (51–85, 20 зубов)"
							data-testid="toolbar-dentition-pediatric"
							role="radio"
							aria-checked={currentDentition === "pediatric"}
						>
							<span>Детский</span>
						</button>
						<button
							type="button"
							onClick={() => onDentitionModeChange("mixed")}
							className={`odontogram-toolbar__segment-btn ${
								currentDentition === "mixed"
									? "odontogram-toolbar__segment-btn--teal-active"
									: ""
							}`}
							title="Сменный прикус"
							data-testid="toolbar-dentition-mixed"
							role="radio"
							aria-checked={currentDentition === "mixed"}
						>
							<span>Сменный</span>
						</button>
					</div>
				)}
			</div>

			{/* ОСТРОВ 2 (Справа: Клинические действия, Безопасность и Инструменты) */}
			<div className="odontogram-toolbar__island odontogram-toolbar__island--right">
				{/* 1-Click Total Sanitation */}
				{onQuickStateChange && (
					<button
						type="button"
						onClick={handleMarkIntactDentition}
						className="odontogram-toolbar__btn odontogram-toolbar__btn--sanitation"
						title="Физиологическая норма (зубные ряды интактны): вся зубная формула отмечается здоровой"
						data-testid="mark-intact-dentition-btn"
					>
						<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Санирован</span>
					</button>
				)}

				{/* Меню 1: Выделение (квадранты, челюсти, инверсия, очистка) */}
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

				{/* Меню 2: Инструменты (ОПТГ AI, Печать А4, Пародонтограмма, Штампы, Настройки) */}
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
					onSyncAllToDiary={onSyncAllToDiary}
					onOneClickLabOrder={onOneClickLabOrder}
				/>
			</div>
		</div>
	);
});
OdontogramToolbar.displayName = "OdontogramToolbar";
