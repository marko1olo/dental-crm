/**
 * BATCH WRITEOFF MODAL (SSOT ПАКЕТНОЕ СПИСАНИЕ РАСХОДНИКОВ)
 * Мандаты 8e (Врачебная автономия — кнопки никогда не disabled),
 * 8n (Суверенитет масштаба — мягкий овердрафт Soft Negative Stock),
 * 8x & 8ap (Живой русский клинический язык без номеров законов),
 * 8b (Строго <= 120 строк на модуль).
 */

import React from "react";
import { createPortal } from "react-dom";
import type { BatchWriteoffModalProps } from "./batchWriteoff/batchWriteoffTypes.js";
import { useBatchWriteoffLogic } from "./batchWriteoff/useBatchWriteoffLogic.js";
import { BatchWriteoffHeader } from "./batchWriteoff/BatchWriteoffHeader.js";
import { BatchWriteoffShiftTab } from "./batchWriteoff/BatchWriteoffShiftTab.js";
import { BatchWriteoffPackagesTab } from "./batchWriteoff/BatchWriteoffPackagesTab.js";
import { BatchWriteoffProcedureTab } from "./batchWriteoff/BatchWriteoffProcedureTab.js";
import { BatchWriteoffFooter } from "./batchWriteoff/BatchWriteoffFooter.js";

export * from "./batchWriteoff/batchWriteoffTypes.js";

export const BatchWriteoffModal: React.FC<BatchWriteoffModalProps> = (props) => {
	const { isOpen, onClose, procedureTitle, serviceCode, patientName } = props;
	const {
		activeTab, setActiveTab, selectedShiftBundle, setSelectedShiftBundle, packageMultiplier,
		setPackageMultiplier, submittingPackageId, isSubmitting, summaryData,
		handleExecuteShiftWriteoff, handlePackageClick, handleConfirmProcedureDeduction, handlePrint,
	} = useBatchWriteoffLogic(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			style={{ zIndex: 100000 }}
			className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150 shift-batch-deduction-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="shift-deduction-title"
			data-testid="warehouse-batch-writeoff-modal"
			data-modal-type="shift-batch"
			data-alias="shift-batch-deduction-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget && !isSubmitting && !submittingPackageId) onClose();
			}}
		>
			<div className="relative w-full max-w-4xl lg:max-w-5xl mt-auto sm:my-auto rounded-t-[24px] sm:rounded-2xl rounded-b-none sm:rounded-b-2xl bg-[var(--paper)] border border-[var(--line)] border-b-0 sm:border-b shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--ink)]">
				<BatchWriteoffHeader
					activeTab={activeTab}
					setActiveTab={setActiveTab}
					procedureTitle={procedureTitle}
					onClose={onClose}
					isBusy={isSubmitting || Boolean(submittingPackageId)}
				/>

				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
					{activeTab === "shift" && (
						<BatchWriteoffShiftTab
							selectedShiftBundle={selectedShiftBundle}
							setSelectedShiftBundle={setSelectedShiftBundle}
							summaryData={summaryData}
						/>
					)}

					{activeTab === "packages" && (
						<BatchWriteoffPackagesTab
							packageMultiplier={packageMultiplier}
							setPackageMultiplier={setPackageMultiplier}
							submittingPackageId={submittingPackageId}
							onPackageClick={handlePackageClick}
						/>
					)}

					{activeTab === "procedure" && (
						<BatchWriteoffProcedureTab
							procedureTitle={procedureTitle}
							serviceCode={serviceCode}
							patientName={patientName}
						/>
					)}
				</div>

				<BatchWriteoffFooter
					activeTab={activeTab}
					onPrintAct={handlePrint}
					onClose={onClose}
					isSubmitting={isSubmitting}
					submittingPackageId={submittingPackageId}
					summaryData={summaryData}
					onExecuteShiftWriteoff={handleExecuteShiftWriteoff}
					onConfirmProcedureDeduction={handleConfirmProcedureDeduction}
					onPackageClick={handlePackageClick}
				/>
			</div>
		</div>
	);

	return typeof document === "undefined" ? modalContent : createPortal(modalContent, document.body);
};

export default BatchWriteoffModal;
