import React from "react";
import { createPortal } from "react-dom";
import {
	Check,
	Clipboard,
	Copy,
	MoreHorizontal,
	Printer,
	RotateCcw,
	X,
} from "lucide-react";
import { EndoFileCanal } from "../icons/DentalIcons";
import type { EndoCanalData, EndoToothClinicalData } from "@dental/shared";
import type { EndoStageStamp } from "./endoCanalConstants";
import { EndoQuickToolbar } from "./EndoQuickToolbar";
import { EndoCanalTable } from "./EndoCanalTable";
import { EndoClinicalParams } from "./EndoClinicalParams";
import { useEndoCanalLogic } from "./useEndoCanalLogic";

// Transparent re-exports for complete backward compatibility across existing views & tests
export * from "./endoCanalConstants";
export { useEndoCanalLogic } from "./useEndoCanalLogic";
export { EndoQuickToolbar } from "./EndoQuickToolbar";
export { EndoCanalTable } from "./EndoCanalTable";
export { EndoClinicalParams } from "./EndoClinicalParams";

export interface EndoCanalLogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly initialCanals?: readonly EndoCanalData[] | undefined;
	readonly initialIrrigation?: string | undefined;
	readonly initialRotarySystem?: string | undefined;
	readonly initialRadiologyControl?: string | undefined;
	readonly onInsertToProtocol?: (
		protocolText: string,
		canals: EndoCanalData[],
	) => void;
	readonly onSaveCanals?: (
		canals: EndoCanalData[],
		clinicalData: EndoToothClinicalData,
	) => Promise<void> | void;
	readonly onSave?: (savedCanals: EndoCanalData[], noteText?: string) => void;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
}

export function EndoCanalLogModal({
	isOpen,
	onClose,
	toothNumber,
	toothState,
	patientId,
	initialCanals,
	initialIrrigation,
	initialRotarySystem,
	initialRadiologyControl,
	onInsertToProtocol,
	onSaveCanals,
	onSave,
	clinicName = "Стоматологическая клиника DENTE",
	clinicPhone = "",
	doctorName = "Врач-стоматолог-терапевт (эндодонтист)",
	patientName = "Пациент",
}: EndoCanalLogModalProps) {
	const {
		activeTooth,
		toothAnatomicalName,
		canals,
		irrigation,
		setIrrigation,
		rotarySystem,
		setRotarySystem,
		radiologyControl,
		setRadiologyControl,
		copied,
		isSaving,
		isLoadingFromDb,
		stageStamp,
		setStageStamp,
		isPresetsMenuOpen,
		setIsPresetsMenuOpen,
		isFooterMenuOpen,
		setIsFooterMenuOpen,
		suggestedCanalNames,
		generatedProtocolText,
		handleSwitchTooth,
		handleCanalChange,
		handleCanalLengthInputChange,
		handleAdjustCanalLength,
		handleSetCanalLength,
		handleAddCanal,
		handleRemoveCanal,
		handleResetToDefaults,
		handleApplyExpressApicalPreset,
		handleApplyCaOh2Protocol,
		handleApplyPulpitisPreset,
		handleApplyPrimaryEndoPreset,
		handleApplyRetreatmentPreset,
		handleApplyObturationPreset,
		handleApplyPulpitisObturationPreset,
		handleApplyPeriodontitisDestructivePreset,
		handleApplyStandardProtocol,
		handleApplyAnatomicalLengths,
		handleSaveCanalsOnly,
		handleInsertToProtocol,
		handleCopyText,
		handleCopyPatientMemo,
		handlePrintWorksheet,
		renderIsoColorBadge,
	} = useEndoCanalLogic({
		isOpen,
		onClose,
		toothNumber,
		patientId,
		initialCanals,
		initialIrrigation,
		initialRotarySystem,
		initialRadiologyControl,
		onInsertToProtocol,
		onSaveCanals,
		onSave,
		clinicName,
		clinicPhone,
		doctorName,
		patientName,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-x-clip"
			role="dialog"
			aria-modal="true"
			aria-label={`Эндодонтический журнал каналов зуба ${activeTooth}`}
			data-testid="endo-canal-log-modal"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-t sm:border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-t-[24px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-w-full">
				{/* Apple HIG Drag Handle for Mobile */}
				<div className="sm:hidden w-full pt-2.5 pb-1 flex justify-center shrink-0">
					<div className="w-9 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
				</div>

				{/* Top Header */}
				<header className="flex items-center justify-between gap-3 p-3.5 sm:p-6 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90 shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
							<EndoFileCanal size={24} />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-1.5 flex-wrap">
								<span className="text-[10px] sm:text-xs uppercase font-black tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-500/30">
									{isLoadingFromDb ? "Загрузка каналов..." : "Эндодонтический журнал каналов"}
								</span>
								{toothState && (
									<span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-500/30">
										{toothState}
									</span>
								)}
							</div>
							<h2 className="text-base sm:text-xl font-black text-[var(--ink,#0f172a)] dark:text-white m-0 mt-0.5 truncate">
								{toothAnatomicalName}
							</h2>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						data-testid="endo-modal-close-btn"
						className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:text-slate-400 dark:hover:text-white hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
						aria-label="Закрыть модальное окно"
					>
						<X size={22} />
					</button>
				</header>

				{/* Scrollable Content Body */}
				<div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
					{/* Клинические протоколы эндодонтии и панель действий */}
					<EndoQuickToolbar
						activeTooth={activeTooth}
						handleSwitchTooth={handleSwitchTooth}
						handleApplyExpressApicalPreset={handleApplyExpressApicalPreset}
						handleApplyCaOh2Protocol={handleApplyCaOh2Protocol}
						handleApplyPulpitisPreset={handleApplyPulpitisPreset}
						isPresetsMenuOpen={isPresetsMenuOpen}
						setIsPresetsMenuOpen={setIsPresetsMenuOpen}
						handleApplyPrimaryEndoPreset={handleApplyPrimaryEndoPreset}
						handleApplyRetreatmentPreset={handleApplyRetreatmentPreset}
						handleApplyObturationPreset={handleApplyObturationPreset}
						handleApplyPulpitisObturationPreset={handleApplyPulpitisObturationPreset}
						handleApplyPeriodontitisDestructivePreset={handleApplyPeriodontitisDestructivePreset}
						handleApplyStandardProtocol={handleApplyStandardProtocol}
						handleResetToDefaults={handleResetToDefaults}
						handleApplyAnatomicalLengths={handleApplyAnatomicalLengths}
						handleAddCanal={handleAddCanal}
					/>

					{/* Multi-canal Table / Matrix */}
					<EndoCanalTable
						canals={canals}
						suggestedCanalNames={suggestedCanalNames}
						stageStamp={stageStamp}
						handleCanalChange={handleCanalChange}
						handleAdjustCanalLength={handleAdjustCanalLength}
						handleCanalLengthInputChange={handleCanalLengthInputChange}
						handleSetCanalLength={handleSetCanalLength}
						handleRemoveCanal={handleRemoveCanal}
						renderIsoColorBadge={renderIsoColorBadge}
					/>

					{/* Additional Clinical Details: Rotary, Irrigation & X-Ray */}
					<EndoClinicalParams
						rotarySystem={rotarySystem}
						setRotarySystem={setRotarySystem}
						irrigation={irrigation}
						setIrrigation={setIrrigation}
						radiologyControl={radiologyControl}
						setRadiologyControl={setRadiologyControl}
						generatedProtocolText={generatedProtocolText}
						copied={copied}
						handleCopyText={handleCopyText}
					/>
				</div>

				{/* Bottom Action Footer (Floating Bottom Bar with Safe Area) */}
				<footer className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90 shrink-0">
					{/* Left Group: Print A4 + Secondary actions menu '...' + Clinical Stage Stamp */}
					<div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
						<button
							type="button"
							onClick={handlePrintWorksheet}
							data-testid="endo-print-worksheet-btn"
							className="min-h-[44px] sm:min-h-[50px] px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer"
							title="Распечатать эндодонтическую карту (А4) для истории болезни"
						>
							<Printer
								size={16}
								className="text-rose-600 dark:text-rose-400 shrink-0"
							/>
							<span>
								<span className="hidden sm:inline">Печать эндо-карты (А4)</span>
								<span className="sm:hidden">Печать А4</span>
							</span>
						</button>

						{/* Menu '...' for secondary actions (Draft save, Copy 043, Reset) */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setIsFooterMenuOpen((v) => !v)}
								className="min-h-[44px] px-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer"
								title="Дополнительные действия (сохранение черновика, сброс параметров)"
								aria-label="Дополнительные действия"
							>
								<MoreHorizontal size={18} />
								<span className="hidden sm:inline">Действия</span>
							</button>

							{isFooterMenuOpen && (
								<div
									className="absolute left-0 bottom-full mb-1.5 z-50 w-64 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-xl shadow-xl p-1.5 space-y-1 text-xs"
									role="menu"
								>
									<button
										type="button"
										data-testid="save-endo-canals-btn"
										onClick={() => {
											handleSaveCanalsOnly();
											setIsFooterMenuOpen(false);
										}}
										className="w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[44px]"
										title="Сохранить параметры каналов в БД без вставки в дневник визита"
									>
										<Check
											size={15}
											className="text-emerald-600 dark:text-emerald-400 shrink-0"
										/>
										<span>Сохранить только каналы</span>
									</button>

									<button
										type="button"
										onClick={() => {
											handleCopyText();
											setIsFooterMenuOpen(false);
										}}
										className="w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[44px]"
									>
										<Clipboard size={15} className="text-slate-500 shrink-0" />
										<span>Копировать текст протокола</span>
									</button>

									<div className="border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 my-1" />

									<button
										type="button"
										onClick={() => {
											handleResetToDefaults();
											setIsFooterMenuOpen(false);
										}}
										className="w-full text-left px-2.5 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 transition-colors cursor-pointer min-h-[44px]"
									>
										<RotateCcw size={15} className="shrink-0" />
										<span>Сбросить к стандарту FDI</span>
									</button>
								</div>
							)}
						</div>

						{/* Clinical Stage Stamp Selector */}
						<div className="flex items-center gap-1.5">
							<span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
								Штамп:
							</span>
							<select
								value={stageStamp}
								onChange={(e) =>
									setStageStamp(e.target.value as EndoStageStamp)
								}
								aria-label="Клинический штамп этапа лечения"
								className="h-10 sm:h-9 px-2 rounded-xl text-xs font-bold bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#cbd5e1)] dark:border-slate-700 outline-none cursor-pointer"
							>
								<option value="COMPLETED">ОБТУРИРОВАНО</option>
								<option value="TEMP_CAOH2">ВРЕМЕННАЯ ОБТУРАЦИЯ</option>
								<option value="DRAFT">ЧЕРНОВИК</option>
							</select>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="h-10 sm:h-9 px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
						>
							Отмена
						</button>
					</div>

					{/* Right Group in Thumb Zone */}
					<div className="flex items-center gap-2 sm:gap-2.5">
						{/* Primary Action 1: Памятка пациенту */}
						<button
							type="button"
							onClick={handleCopyPatientMemo}
							data-testid="endo-copy-patient-memo-btn"
							className="flex-1 sm:flex-initial min-h-[48px] sm:min-h-[50px] px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-98"
							title="Скопировать памятку по уходу после лечения каналов для отправки пациенту в WhatsApp/Telegram"
						>
							<Copy
								size={16}
								className="text-rose-600 dark:text-rose-400 shrink-0"
							/>
							<span>
								<span className="hidden sm:inline">Скопировать для пациента</span>
								<span className="sm:hidden">Памятка</span>
							</span>
						</button>

						{/* Primary Action 2: Сохранить в медкарту */}
						<button
							type="button"
							data-testid="insert-endo-protocol-btn"
							onClick={handleInsertToProtocol}
							className="flex-1 sm:flex-initial min-h-[48px] sm:min-h-[50px] px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-500 active:scale-98 text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
							title="Сохранить параметры каналов и вставить протокол в медкарту"
						>
							<Check size={18} />
							<span>
								{isSaving ? "Сохранение..." : "Сохранить в медкарту"}
							</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
