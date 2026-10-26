import { useState } from "react";
import type { WarrantyPassportModalProps, WarrantyTab } from "./types";
import { useWarrantyItemsSelection } from "./hooks/useWarrantyItemsSelection";
import { useWarrantyRemediationState } from "./hooks/useWarrantyRemediationState";
import { useWarrantyCertificateBuild } from "./hooks/useWarrantyCertificateBuild";
import { useWarrantyExportActions } from "./hooks/useWarrantyExportActions";

export function useWarrantyPassportState(props: WarrantyPassportModalProps) {
	const [activeTab, setActiveTab] = useState<WarrantyTab>("editor");

	const itemsSelection = useWarrantyItemsSelection({
		isOpen: props.isOpen,
		initialCategory: props.initialCategory ?? "composite_restoration",
		initialTeeth: props.initialTeeth,
		completedStages: props.completedStages,
	});

	const certBuild = useWarrantyCertificateBuild({
		patient: props.patient, doctorName: props.doctorName, doctorSpecialty: props.doctorSpecialty,
		clinicName: props.clinicName, clinicLegalName: props.clinicLegalName,
		clinicLicenseNumber: props.clinicLicenseNumber, clinicAddress: props.clinicAddress,
		clinicPhone: props.clinicPhone, clinicWebsite: props.clinicWebsite,
		items: itemsSelection.items, attachedStatus: false, remediations: [],
	});

	const remediation = useWarrantyRemediationState({
		certificateId: certBuild.certificateId, patient: props.patient, doctorId: props.doctorId,
		doctorName: props.doctorName, doctorSpecialty: props.doctorSpecialty, clinicName: props.clinicName,
		items: itemsSelection.items, onRemediationCreated: props.onRemediationCreated,
	});

	const exportActions = useWarrantyExportActions({
		certificateData: certBuild.certificateData, certificateHtml: certBuild.certificateHtml,
		patient: props.patient, doctorName: props.doctorName,
		onAttachToForm043u: props.onAttachToForm043u, onCertificateIssued: props.onCertificateIssued,
	});

	const handleOpenRemediation = () => {
		remediation.handleOpenRemediation();
		setActiveTab("remediation");
	};

	const itemsStepProps = {
		onOpenRemediation: handleOpenRemediation,
		onImportCompletedStages: itemsSelection.handleImportCompletedStages,
		selectedTeeth: itemsSelection.selectedTeeth,
		onToggleTooth: itemsSelection.toggleTooth,
		items: itemsSelection.items,
		activeCategory: itemsSelection.activeCategory,
		currentWorkTitle: itemsSelection.currentWorkTitle,
		onWorkTitleChange: itemsSelection.setCurrentWorkTitle,
		currentMaterial: itemsSelection.currentMaterial,
		onMaterialChange: itemsSelection.setCurrentMaterial,
		currentManufacturer: itemsSelection.currentManufacturer,
		onManufacturerChange: itemsSelection.setCurrentManufacturer,
		currentShade: itemsSelection.currentShade,
		onShadeChange: itemsSelection.setCurrentShade,
		currentLot: itemsSelection.currentLot,
		onLotChange: itemsSelection.setCurrentLot,
		currentServiceCode804n: itemsSelection.currentServiceCode804n,
		onServiceCode804nChange: itemsSelection.setCurrentServiceCode804n,
		currentLabOrderNumber: itemsSelection.currentLabOrderNumber,
		onLabOrderNumberChange: itemsSelection.setCurrentLabOrderNumber,
		onApplyStarQuickPreset: itemsSelection.handleApplyStarQuickPreset,
		onSelectCategory: itemsSelection.handleSelectCategory,
		onAddItem: itemsSelection.handleAddItem,
		onRemoveItem: itemsSelection.handleRemoveItem,
		riskFactors: certBuild.riskFactors,
		onRiskFactorsChange: certBuild.setRiskFactors,
		calculation: certBuild.calculation,
	};

	const signatureStepProps = {
		certificateId: certBuild.certificateId,
		integrityHash: certBuild.certificateData.integrityHash,
		items: itemsSelection.items,
		remediations: remediation.remediations,
		selectedRemediationTooth: remediation.selectedRemediationTooth,
		onSelectRemediationTooth: remediation.setSelectedRemediationTooth,
		selectedDefectType: remediation.selectedDefectType,
		onSelectDefectType: remediation.handleSelectDefectType,
		customRemediationFinding: remediation.customRemediationFinding,
		onFindingChange: remediation.setCustomRemediationFinding,
		customRemediationAction: remediation.customRemediationAction,
		onActionChange: remediation.setCustomRemediationAction,
		remediationMaterials: remediation.remediationMaterials,
		remediationNotes: remediation.remediationNotes,
		onNotesChange: remediation.setRemediationNotes,
		remediationSuccessNotice: remediation.remediationSuccessNotice,
		onCreateRemediation: remediation.handleCreateRemediation,
		onPrintRemediationAct: exportActions.handlePrintRemediationAct,
	};

	const shareMenuProps = {
		isOpen: exportActions.isShareMenuOpen,
		copiedMemo: exportActions.copiedMemo,
		copiedLink: exportActions.copiedLink,
		onToggle: () => exportActions.setIsShareMenuOpen(!exportActions.isShareMenuOpen),
		onShareWhatsApp: exportActions.handleShareWhatsApp,
		onShareTelegram: exportActions.handleShareTelegram,
		onCopyMemo: exportActions.handleCopyMemo,
		onCopyLink: exportActions.handleCopyLink,
	};

	return {
		activeTab, setActiveTab, ...remediation, ...itemsSelection, ...certBuild, ...exportActions,
		handleOpenRemediation, itemsStepProps, signatureStepProps, shareMenuProps,
	};
}
