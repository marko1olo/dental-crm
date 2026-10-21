import type React from "react";
import { createPortal } from "react-dom";
import { ShiftBatchPackagesTab } from "./shiftBatchModules/ShiftBatchPackagesTab.js";
import { ShiftBatchProcedureTab } from "./shiftBatchModules/ShiftBatchProcedureTab.js";
import { ShiftBatchShiftTab } from "./shiftBatchModules/ShiftBatchShiftTab.js";
import { ShiftBatchModalHeader } from "./shiftBatchModules/ShiftBatchModalHeader.js";
import { ShiftBatchModalFooter } from "./shiftBatchModules/ShiftBatchModalFooter.js";
import { useShiftBatchLogic } from "./shiftBatchModules/useShiftBatchLogic.js";
import type { ShiftBatchDeductionModalProps } from "./shiftBatchModules/types.js";

export * from "./shiftBatchModules/types.js";

export const ShiftBatchDeductionModal: React.FC<ShiftBatchDeductionModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		procedureTitle,
		serviceCode,
		service804nCode,
		toothNumber,
		doctorName,
		patientName,
		currentStockMap,
	} = props;

	const {
		activeMode,
		setActiveMode,
		isLoading,
		isSubmitting,
		summaryData,
		loadError,
		packageQuantityMultiplier,
		setPackageQuantityMultiplier,
		submittingPackageId,
		lastPackageResult,
		handleExecuteShiftDeduction,
		handlePackageClick,
		handleConfirmProcedureDeduction,
	} = useShiftBatchLogic(props);

	if (!isOpen) return null;

	const isBlocked = isSubmitting || Boolean(submittingPackageId);

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shift-deduction-title"
			data-testid="shift-batch-deduction-modal"
			data-modal-type="shift-batch"
			onClick={(e) => {
				if (e.target === e.currentTarget && !isBlocked) onClose();
			}}
		>
			<div className="relative w-full max-w-4xl lg:max-w-5xl my-auto rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--ink)]">
				<ShiftBatchModalHeader
					activeMode={activeMode}
					setActiveMode={setActiveMode}
					onClose={onClose}
					isBlocked={isBlocked}
				/>

				<div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
					{activeMode === "shift" && (
						<ShiftBatchShiftTab
							isLoading={isLoading}
							loadError={loadError}
							summaryData={summaryData}
						/>
					)}

					{activeMode === "packages" && (
						<ShiftBatchPackagesTab
							packageQuantityMultiplier={packageQuantityMultiplier}
							setPackageQuantityMultiplier={setPackageQuantityMultiplier}
							submittingPackageId={submittingPackageId}
							onPackageClick={handlePackageClick}
							lastPackageResult={lastPackageResult}
						/>
					)}

					{activeMode === "procedure" && (
						<ShiftBatchProcedureTab
							procedureTitle={procedureTitle}
							serviceCode={serviceCode}
							service804nCode={service804nCode}
							toothNumber={toothNumber}
							doctorName={doctorName}
							patientName={patientName}
							currentStockMap={currentStockMap}
						/>
					)}
				</div>

				<ShiftBatchModalFooter
					activeMode={activeMode}
					summaryData={summaryData}
					isSubmitting={isSubmitting}
					isLoading={isLoading}
					isBlocked={isBlocked}
					onClose={onClose}
					onExecuteShiftDeduction={handleExecuteShiftDeduction}
					onConfirmProcedureDeduction={handleConfirmProcedureDeduction}
				/>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};

export default ShiftBatchDeductionModal;
