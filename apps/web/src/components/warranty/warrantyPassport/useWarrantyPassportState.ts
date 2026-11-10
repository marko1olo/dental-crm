import { useEffect, useState } from "react";
import type { WarrantyPassportModalProps, WarrantyTab } from "./types";
import { useWarrantyItemsSelection } from "./hooks/useWarrantyItemsSelection";
import { useWarrantyRemediationState } from "./hooks/useWarrantyRemediationState";
import { useWarrantyCertificateBuild } from "./hooks/useWarrantyCertificateBuild";
import { useWarrantyExportActions } from "./hooks/useWarrantyExportActions";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { WarrantyRemediationOrder } from "../../warrantyEngine.js";

export function useWarrantyPassportState(props: WarrantyPassportModalProps) {
	const [activeTab, setActiveTab] = useState<WarrantyTab>("editor");
	const [historicalCertificates, setHistoricalCertificates] = useState<any[]>([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

	useEffect(() => {
		if (!props.isOpen || !props.patient?.id) return;
		const patientId = props.patient.id;
		if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) return;

		let isMounted = true;
		setIsLoadingHistory(true);

		const fetchHistory = async () => {
			try {
				const headers = denteAdminSecretRequestHeaders();
				// 1. Загрузка существующих сертификатов пациента
				const certsRes = await fetch(`/api/warranty/certificates/${patientId}`, { headers });
				if (certsRes.ok && isMounted) {
					const certsJson = await certsRes.json().catch(() => null);
					if (certsJson?.certificates && Array.isArray(certsJson.certificates)) {
						setHistoricalCertificates(certsJson.certificates);
					}
				}

				// 2. Загрузка рекламаций и осложнений по пациенту
				const reclRes = await fetch(`/api/patients/${patientId}/reclamations`, { headers });
				if (reclRes.ok && isMounted) {
					const reclJson = await reclRes.json().catch(() => null);
					if (Array.isArray(reclJson)) {
						const mappedOrders: WarrantyRemediationOrder[] = reclJson.map((rec: any) => {
							const toothMatch = rec.complicationDetails?.match(/зуб\s*([1-4][1-8])/i);
							const tooth = toothMatch ? toothMatch[1] : "—";
							return {
								id: rec.id,
								orderNumber: `Р-${rec.id.slice(0, 6)}`,
								certificateId: certBuild.certificateId,
								toothNumber: tooth,
								originalWorkTitle: "Ранее выполненная работа",
								defectType: "filling_loss" as any,
								defectTitle: rec.complicationDetails?.split(".")[0] || "Рекламация",
								clinicalFinding: rec.complicationDetails || "Гарантийный случай",
								remediationAction: rec.proposedAction || "Гарантийная переделка (0 ₽)",
								costToPatientRub: 0,
								discountPercent: 100,
								isFreeWarrantyService: true,
								requiresMasterPassword: false,
								warehouseDeductOnExecution: true,
								materialsDeducted: [],
								doctorName: rec.doctorName || props.doctorName || "Лечащий врач",
								patientFullName: props.patient?.fullName || "Пациент",
								patientCardNumber: props.patient?.cardNumber || "—",
								clinicName: props.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
								performedAtIso: rec.createdAt || new Date().toISOString(),
								status: rec.status === "resolved" ? "completed" : "in_progress",
								doctorNotes: rec.resolutionNotes || undefined,
							};
						});
						remediation.setRemediations((prev) => {
							const existingIds = new Set(prev.map((o) => o.id));
							const fresh = mappedOrders.filter((o) => !existingIds.has(o.id));
							return [...fresh, ...prev];
						});
					}
				}
			} catch (err) {
				console.error("Non-blocking: Failed to hydrate warranty history:", err);
			} finally {
				if (isMounted) setIsLoadingHistory(false);
			}
		};

		void fetchHistory();

		return () => {
			isMounted = false;
		};
	}, [props.isOpen, props.patient?.id, certBuild.certificateId, props.doctorName, props.patient?.fullName, props.patient?.cardNumber, props.clinicName, remediation.setRemediations]);

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
		historicalCertificates, isLoadingHistory,
	};
}
