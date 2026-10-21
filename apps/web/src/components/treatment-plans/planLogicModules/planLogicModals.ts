import { useState } from "react";
import type { TreatmentPlanStage } from "./types.js";

export function usePlanModals() {
	const [isSignModalOpen, setIsSignModalOpen] = useState(false);
	const [isContractPrintOpen, setIsContractPrintOpen] = useState(false);
	const [isActPrintOpen, setIsActPrintOpen] = useState(false);
	const [isFiscalModalOpen, setIsFiscalModalOpen] = useState(false);
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
	const [isComparatorModalOpen, setIsComparatorModalOpen] = useState(false);
	const [isStagePaymentModalOpen, setIsStagePaymentModalOpen] = useState(false);
	const [isPriceValidatorModalOpen, setIsPriceValidatorModalOpen] = useState(false);
	const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
	const [isPresenterModalOpen, setIsPresenterModalOpen] = useState(false);
	const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
	const [selectedInstallmentStage, setSelectedInstallmentStage] = useState<TreatmentPlanStage | null>(null);
	const [isCuratorModalOpen, setIsCuratorModalOpen] = useState(false);
	const [isChairsideBundlesModalOpen, setIsChairsideBundlesModalOpen] = useState(false);
	const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
	const [targetStageForAdd, setTargetStageForAdd] = useState<TreatmentPlanStage | null>(null);
	const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState(false);

	return {
		isSignModalOpen, setIsSignModalOpen,
		isContractPrintOpen, setIsContractPrintOpen,
		isActPrintOpen, setIsActPrintOpen,
		isFiscalModalOpen, setIsFiscalModalOpen,
		isLabOrderModalOpen, setIsLabOrderModalOpen,
		isComparatorModalOpen, setIsComparatorModalOpen,
		isStagePaymentModalOpen, setIsStagePaymentModalOpen,
		isPriceValidatorModalOpen, setIsPriceValidatorModalOpen,
		isInvoiceModalOpen, setIsInvoiceModalOpen,
		isPresenterModalOpen, setIsPresenterModalOpen,
		isInstallmentModalOpen, setIsInstallmentModalOpen,
		selectedInstallmentStage, setSelectedInstallmentStage,
		isCuratorModalOpen, setIsCuratorModalOpen,
		isChairsideBundlesModalOpen, setIsChairsideBundlesModalOpen,
		isAddServiceModalOpen, setIsAddServiceModalOpen,
		targetStageForAdd, setTargetStageForAdd,
		isCreateStageModalOpen, setIsCreateStageModalOpen,
	};
}
