import { useCallback, useEffect, useState } from "react";
import type {
	HistoricalWarrantyCertificate,
	PatientReclamationResponse,
	WarrantyPassportModalProps,
	WarrantyTab,
} from "./types";
import { useWarrantyItemsSelection } from "./hooks/useWarrantyItemsSelection";
import { useWarrantyRemediationState } from "./hooks/useWarrantyRemediationState";
import { useWarrantyCertificateBuild } from "./hooks/useWarrantyCertificateBuild";
import { useWarrantyExportActions } from "./hooks/useWarrantyExportActions";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import type { WarrantyItem, WarrantyRemediationOrder } from "../warrantyEngine.js";
import type { WarrantyCategory } from "../warrantyPresets.js";

function parseHistoricalCertificateItems(rawItems: unknown): WarrantyItem[] {
	if (!Array.isArray(rawItems)) return [];
	const parsed: WarrantyItem[] = [];
	for (let i = 0; i < rawItems.length; i++) {
		const entry = rawItems[i];
		if (!entry || typeof entry !== "object") continue;
		const rec = entry as Record<string, unknown>;
		const toothNumber =
			typeof rec.toothNumber === "string"
				? rec.toothNumber
				: typeof rec.tooth === "string"
					? rec.tooth
					: typeof rec.tooth === "number"
						? String(rec.tooth)
						: "—";
		const clinicalWorkTitle =
			typeof rec.clinicalWorkTitle === "string"
				? rec.clinicalWorkTitle
				: typeof rec.name === "string"
					? rec.name
					: typeof rec.restorationType === "string"
						? rec.restorationType
						: "Стоматологическая работа";
		const materialName =
			typeof rec.materialName === "string"
				? rec.materialName
				: typeof rec.material === "string"
					? rec.material
					: "Конструкционный материал";
		const manufacturer = typeof rec.manufacturer === "string" ? rec.manufacturer : "Производитель клиники";
		const country = typeof rec.country === "string" ? rec.country : "РФ / Импорт";
		const category = (typeof rec.category === "string" ? rec.category : "orthopedics") as WarrantyCategory;
		const vitaShade =
			typeof rec.vitaShade === "string"
				? rec.vitaShade
				: typeof rec.shade === "string"
					? rec.shade
					: typeof rec.color === "string"
						? rec.color
						: undefined;
		const lotNumber =
			typeof rec.lotNumber === "string"
				? rec.lotNumber
				: typeof rec.lot === "string"
					? rec.lot
					: typeof rec.batchCode === "string"
						? rec.batchCode
						: undefined;
		const labOrderNumber = typeof rec.labOrderNumber === "string" ? rec.labOrderNumber : undefined;
		const serviceCode =
			typeof rec.serviceCode === "string"
				? rec.serviceCode
				: typeof rec.serviceCode804n === "string"
					? rec.serviceCode804n
					: undefined;
		const baseWarrantyMonths = typeof rec.warrantyMonths === "number" ? rec.warrantyMonths : typeof rec.baseWarrantyMonths === "number" ? rec.baseWarrantyMonths : 12;
		const baseServiceLifeMonths = typeof rec.serviceLifeMonths === "number" ? rec.serviceLifeMonths : typeof rec.baseServiceLifeMonths === "number" ? rec.baseServiceLifeMonths : 36;

		parsed.push({
			id: typeof rec.id === "string" ? rec.id : `hist-${i}-${toothNumber}`,
			toothNumber,
			category,
			clinicalWorkTitle,
			materialName,
			manufacturer,
			country,
			...(vitaShade ? { vitaShade } : {}),
			...(lotNumber ? { lotNumber } : {}),
			...(labOrderNumber ? { labOrderNumber } : {}),
			...(serviceCode ? { serviceCode, serviceCode804n: serviceCode } : {}),
			baseWarrantyMonths,
			baseServiceLifeMonths,
		});
	}
	return parsed;
}

export function useWarrantyPassportState(props: WarrantyPassportModalProps) {
	const [activeTab, setActiveTab] = useState<WarrantyTab>("editor");
	const [historicalCertificates, setHistoricalCertificates] = useState<HistoricalWarrantyCertificate[]>([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);
	const [persistedCertificateId, setPersistedCertificateId] = useState<string | null>(null);

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

	const handleCertificatePersisted = useCallback((savedCert: HistoricalWarrantyCertificate) => {
		if (!savedCert?.id) return;
		setPersistedCertificateId(savedCert.id);
		setHistoricalCertificates((prev) => {
			const idx = prev.findIndex((c) => c.id === savedCert.id || c.certificateNumber === savedCert.certificateNumber);
			if (idx >= 0) {
				const next = [...prev];
				next[idx] = savedCert;
				return next;
			}
			return [savedCert, ...prev];
		});
	}, []);

	const remediation = useWarrantyRemediationState({
		certificateId: certBuild.certificateId,
		persistedCertificateId,
		patient: props.patient, doctorId: props.doctorId,
		doctorName: props.doctorName, doctorSpecialty: props.doctorSpecialty, clinicName: props.clinicName,
		items: itemsSelection.items, onRemediationCreated: props.onRemediationCreated,
	});

	const exportActions = useWarrantyExportActions({
		certificateData: certBuild.certificateData, certificateHtml: certBuild.certificateHtml,
		patient: props.patient, visitId: props.visitId, doctorName: props.doctorName,
		onAttachToClinicalNote: props.onAttachToClinicalNote,
		onCertificateIssued: props.onCertificateIssued,
		onCertificatePersisted: handleCertificatePersisted,
	});

	useEffect(() => {
		if (!props.isOpen || !props.patient?.id) return;
		const patientId = props.patient.id;
		if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) return;

		let isMounted = true;
		setIsLoadingHistory(true);

		const fetchHistory = async () => {
			try {
				const headers = denteClinicalReadHeaders();
				// 1. Загрузка существующих сертификатов пациента
				const certsRes = await fetch(`/api/warranty/certificates/${patientId}`, { headers });
				if (certsRes.ok && isMounted) {
					const certsJson = (await certsRes.json().catch(() => null)) as {
						certificates?: HistoricalWarrantyCertificate[];
						data?: { certificates?: HistoricalWarrantyCertificate[] } | HistoricalWarrantyCertificate[];
					} | null;
					const certsPayload = certsJson?.data && !Array.isArray(certsJson.data) ? certsJson.data : certsJson;
					const certList = Array.isArray(certsJson?.data)
						? certsJson.data
						: certsPayload?.certificates ?? certsJson?.certificates;
					if (certList && Array.isArray(certList)) {
						setHistoricalCertificates(certList);
						const matched = certList.find((c) => c.certificateNumber === certBuild.certificateId);
						if (matched?.id) {
							setPersistedCertificateId(matched.id);
						}
					}
				}

				// 2. Загрузка рекламаций и осложнений по пациенту
				const reclRes = await fetch(`/api/patients/${patientId}/reclamations`, { headers });
				if (reclRes.ok && isMounted) {
					const reclRaw = (await reclRes.json().catch(() => null)) as
						| PatientReclamationResponse[]
						| { data?: PatientReclamationResponse[]; reclamations?: PatientReclamationResponse[] }
						| null;
					const reclJson = Array.isArray(reclRaw)
						? reclRaw
						: Array.isArray(reclRaw?.data)
							? reclRaw.data
							: Array.isArray(reclRaw?.reclamations)
								? reclRaw.reclamations
								: null;
					if (Array.isArray(reclJson)) {
						const mappedOrders: WarrantyRemediationOrder[] = reclJson.map((rec) => {
							const formattedTooth = rec.toothNumber !== undefined && rec.toothNumber !== null
								? (typeof rec.toothNumber === "number"
									? (rec.toothNumber >= 11 && rec.toothNumber <= 85
										? `${Math.floor(rec.toothNumber / 10)}.${rec.toothNumber % 10}`
										: String(rec.toothNumber))
									: String(rec.toothNumber).includes(".")
										? String(rec.toothNumber)
										: String(rec.toothNumber).length === 2
											? `${String(rec.toothNumber)[0]}.${String(rec.toothNumber)[1]}`
											: String(rec.toothNumber))
								: "—";

							const defectType = (rec.defectType as WarrantyRemediationOrder["defectType"]) || "custom_defect";

							return {
								id: rec.id,
								orderNumber: `Р-${rec.id.slice(0, 6)}`,
								certificateId: rec.warrantyCertificateId || certBuild.certificateId,
								toothNumber: formattedTooth,
								originalWorkTitle: "Ранее выполненная работа",
								defectType,
								defectTitle: rec.complicationDetails?.split(".")[0] || "Рекламация",
								clinicalFinding: rec.complicationDetails || "Гарантийный случай",
								remediationAction: rec.proposedAction || "Гарантийная переделка (0 ₽)",
								amountKopecks: 0n,
								costToPatientKopecks: 0,
								costToPatientRub: 0,
								discountPercent: 100,
								isFreeWarrantyService: true,
								requiresMasterPassword: false,
								warehouseDeductOnExecution: true,
								materialsDeducted: [],
								doctorName: rec.doctorName || props.doctorName || "Лечащий врач",
								patientFullName: props.patient?.fullName || "Пациент",
								patientCardNumber: props.patient?.cardNumber || "—",
								clinicName: props.clinicName || "Стоматологическая клиника",
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
				clientLogger.error("[useWarrantyPassportState] Не удалось загрузить историю гарантийных паспортов", err, {
					module: "Warranty",
				});
			} finally {
				if (isMounted) setIsLoadingHistory(false);
			}
		};

		void fetchHistory();

		return () => {
			isMounted = false;
		};
	}, [props.isOpen, props.patient?.id, certBuild.certificateId, props.doctorName, props.patient?.fullName, props.patient?.cardNumber, props.clinicName, remediation.setRemediations]);

	const handleSelectHistoricalCertificate = useCallback((cert: HistoricalWarrantyCertificate) => {
		certBuild.setCertificateId(cert.certificateNumber);
		setPersistedCertificateId(cert.id);
		const parsedItems = parseHistoricalCertificateItems(cert.itemsJson);
		if (parsedItems.length > 0) {
			itemsSelection.setItems(parsedItems);
		}
		showToast(`Выбран гарантийный паспорт ${cert.certificateNumber}`, "info", 2500);
	}, [certBuild, itemsSelection]);

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
		historicalCertificates,
		isLoadingHistory,
		activeCertificateId: certBuild.certificateId,
		onSelectHistoricalCertificate: handleSelectHistoricalCertificate,
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
		historicalCertificates, isLoadingHistory, persistedCertificateId, handleSelectHistoricalCertificate,
	};
}
