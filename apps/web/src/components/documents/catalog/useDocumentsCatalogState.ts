import { useCallback, useMemo, useState } from "react";
import type { DocumentKind } from "@dental/shared";
import { useDocumentStore } from "../../../store/documentStore";
import type { TaxDeductionTab } from "../../finance/taxDeduction/types";
import { showToast } from "../../GlobalToast";
import { getAllCatalogItems } from "./catalogItems";
import { executeFastPrintPrimaryIntake } from "./intakePackagePrintHelper";
import type {
	DocumentCatalogCategory,
	DocumentsCatalogViewProps,
} from "./types";
import { useCatalogFilter } from "./useCatalogFilter";
import { useDocumentsCatalogModals } from "./useDocumentsCatalogModals";
import { useTaxPaymentsMapper } from "./useTaxPaymentsMapper";

export function useDocumentsCatalogState(props: DocumentsCatalogViewProps) {
	const {
		patient,
		doctorName,
		clinicName,
		clinicProfileDraft,
		eligibleTaxPayments,
		onOpenDocument,
		onOpenPrimaryIntakePackage,
		onOpenTaxCertificate,
	} = props;
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activeCategory, setActiveCategory] =
		useState<DocumentCatalogCategory>("all");

	const modals = useDocumentsCatalogModals();
	const { setSelectedDocumentKind } = useDocumentStore();
	const mappedTaxPayments = useTaxPaymentsMapper(eligibleTaxPayments);

	const handleOpenKind = useCallback(
		(kind: DocumentKind, titleRu?: string) => {
			setSelectedDocumentKind(kind);
			onOpenDocument?.(kind);
			if (titleRu) showToast(`Выбран документ: ${titleRu}`, "info", 1500);
		},
		[onOpenDocument, setSelectedDocumentKind],
	);

	const handleFastPrintPrimaryIntake = useCallback(() => {
		executeFastPrintPrimaryIntake({
			patient,
			clinicProfileDraft,
			clinicName,
			doctorName,
		});
	}, [patient, clinicProfileDraft, clinicName, doctorName]);

	const handleOpenIntake = useCallback(() => {
		if (onOpenPrimaryIntakePackage) onOpenPrimaryIntakePackage();
		else modals.setIsLocalIntakeModalOpen(true);
	}, [onOpenPrimaryIntakePackage, modals.setIsLocalIntakeModalOpen]);

	const handleOpenTax = useCallback(
		(tab: TaxDeductionTab = "form") => {
			modals.setTaxInitialTab(tab);
			if (onOpenTaxCertificate) onOpenTaxCertificate();
			else modals.setIsLocalTaxModalOpen(true);
		},
		[
			onOpenTaxCertificate,
			modals.setTaxInitialTab,
			modals.setIsLocalTaxModalOpen,
		],
	);

	const catalogItems = useMemo(
		() =>
			getAllCatalogItems({
				setSelectedA4Tab: modals.setSelectedA4Tab,
				handleOpenKind,
				handleOpenTax,
				setIsDiplomaModalOpen: modals.setIsDiplomaModalOpen,
				setIsConsentModalOpen: modals.setIsConsentModalOpen,
			}),
		[
			handleOpenKind,
			handleOpenTax,
			modals.setSelectedA4Tab,
			modals.setIsDiplomaModalOpen,
			modals.setIsConsentModalOpen,
		],
	);

	const { filteredItems, categoryCounts } = useCatalogFilter(
		catalogItems,
		searchQuery,
		activeCategory,
	);

	return {
		searchQuery,
		setSearchQuery,
		activeCategory,
		setActiveCategory,
		...modals,
		mappedTaxPayments,
		handleOpenKind,
		handleFastPrintPrimaryIntake,
		handleOpenIntake,
		handleOpenTax,
		filteredItems,
		categoryCounts,
	};
}
