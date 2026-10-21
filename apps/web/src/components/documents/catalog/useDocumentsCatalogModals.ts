import { useState } from "react";
import type { TaxDeductionTab } from "../../finance/taxDeduction/types";
import type { ProfessionalA4DocumentTab } from "../ProfessionalDocumentA4Sheet";

export function useDocumentsCatalogModals() {
	const [isDiplomaModalOpen, setIsDiplomaModalOpen] = useState<boolean>(false);
	const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
	const [isLocalTaxModalOpen, setIsLocalTaxModalOpen] =
		useState<boolean>(false);
	const [taxInitialTab, setTaxInitialTab] = useState<TaxDeductionTab>("form");
	const [isLocalIntakeModalOpen, setIsLocalIntakeModalOpen] =
		useState<boolean>(false);
	const [isOutpatientCardModalOpen, setIsOutpatientCardModalOpen] =
		useState<boolean>(false);
	const [isContractModalOpen, setIsContractModalOpen] =
		useState<boolean>(false);
	const [selectedA4Tab, setSelectedA4Tab] =
		useState<ProfessionalA4DocumentTab | null>(null);

	return {
		isDiplomaModalOpen,
		setIsDiplomaModalOpen,
		isConsentModalOpen,
		setIsConsentModalOpen,
		isLocalTaxModalOpen,
		setIsLocalTaxModalOpen,
		taxInitialTab,
		setTaxInitialTab,
		isLocalIntakeModalOpen,
		setIsLocalIntakeModalOpen,
		isOutpatientCardModalOpen,
		setIsOutpatientCardModalOpen,
		isContractModalOpen,
		setIsContractModalOpen,
		selectedA4Tab,
		setSelectedA4Tab,
	};
}
