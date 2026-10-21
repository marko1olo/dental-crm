/**
 * StagePaymentFiscalTab.tsx — Вкладка фискализации 54-ФЗ и кассовых чеков (DENTE CRM).
 */

import React from "react";
import type { MilestoneStage, StageFiscalReceipt54Fz } from "./stagePaymentEngine.js";
import { FiscalReceiptConfigPanel } from "./fiscalTab/FiscalReceiptConfigPanel.js";
import { ThermalReceiptSlipPreview } from "./fiscalTab/ThermalReceiptSlipPreview.js";

export interface StagePaymentFiscalTabProps {
	readonly stages: readonly MilestoneStage[];
	readonly selectedStageForFiscalId: string;
	readonly onSelectStageForFiscal: (stageId: string) => void;
	readonly fiscalPaymentType: "advance" | "completion" | "full";
	readonly onFiscalPaymentTypeChange: (type: "advance" | "completion" | "full") => void;
	readonly fiscalPaymentMethod: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR";
	readonly onFiscalPaymentMethodChange: (method: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR") => void;
	readonly onGenerateFiscalReceipt: () => void;
	readonly activeFiscalReceipt: StageFiscalReceipt54Fz | null;
}

export const StagePaymentFiscalTab: React.FC<StagePaymentFiscalTabProps> = ({
	stages,
	selectedStageForFiscalId,
	onSelectStageForFiscal,
	fiscalPaymentType,
	onFiscalPaymentTypeChange,
	fiscalPaymentMethod,
	onFiscalPaymentMethodChange,
	onGenerateFiscalReceipt,
	activeFiscalReceipt,
}) => {
	return (
		<div className="flex flex-col lg:flex-row gap-6 items-start">
			<FiscalReceiptConfigPanel
				stages={stages}
				selectedStageForFiscalId={selectedStageForFiscalId}
				onSelectStageForFiscal={onSelectStageForFiscal}
				fiscalPaymentType={fiscalPaymentType}
				onFiscalPaymentTypeChange={onFiscalPaymentTypeChange}
				fiscalPaymentMethod={fiscalPaymentMethod}
				onFiscalPaymentMethodChange={onFiscalPaymentMethodChange}
				onGenerateFiscalReceipt={onGenerateFiscalReceipt}
			/>

			<ThermalReceiptSlipPreview activeFiscalReceipt={activeFiscalReceipt} />
		</div>
	);
};

export default StagePaymentFiscalTab;
