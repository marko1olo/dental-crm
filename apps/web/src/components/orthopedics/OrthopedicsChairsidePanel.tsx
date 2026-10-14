import React, { useState, useCallback, useId, useEffect, useRef } from "react";
import { CheckCircle2, ShieldCheck, FileText, ArrowRight, ExternalLink, Check, Send, Camera, RotateCcw, X } from "lucide-react";
import { DentalCrown, DentalVeneer, DentalBridge } from "../icons/DentalIcons.js";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS, applyOrthopedicProtocolToVisit, createDoctorClinicalOverride,
	type OrthopedicProtocolPreset, type FormatOrthopedicProtocolOptions, type Order804nServiceItem,
} from "./orthopedicProtocols.js";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { CANONICAL_MANUFACTURING_5_STAGES, type CanonicalManufacturing5StageItem } from "../lab/labMath.js";
import { formatLabReadinessIndicator } from "@dental/shared";
import { DentalLabReadyInClinicModal, type ReadyInClinicLabOrder } from "../lab/DentalLabReadyInClinicModal";

export {
	type StandardZtlPreset, STANDARD_ZTL_ORDER_PRESETS,
	type PreparationMarginPreset, PREPARATION_MARGIN_PRESETS,
	VITA_3D_MASTER_SHADE_GROUPS,
} from "./orthopedicsPresets.js";
import { type StandardZtlPreset, STANDARD_ZTL_ORDER_PRESETS, PREPARATION_MARGIN_PRESETS, FIXATION_TYPE_PRESETS } from "./orthopedicsPresets.js";
import { OrthopedicsProtocolsGrid } from "./OrthopedicsProtocolsGrid.js";
import { OrthopedicsVitaShadePicker } from "./OrthopedicsVitaShadePicker.js";
import { OrthopedicsZtlSelectors } from "./OrthopedicsZtlSelectors.js";
import {
	OrthopedicsChairsideTopBar,
	OrthopedicsChairsideLabOrderBanner,
	OrthopedicsChairsideFooterBar,
	type LinkedChairsideLabOrderInfo,
} from "./OrthopedicsChairsideLabOrderBanner.js";
import {
	OrthopedicPassportA4Modal,
	type OrthopedicPassportData,
} from "./OrthopedicPassportA4Modal.js";

export type { LinkedChairsideLabOrderInfo };

export interface OrthopedicsChairsidePanelProps {
	readonly patientId?: string | undefined;
	readonly activeToothFdi?: string | number | undefined;
	readonly selectedTeeth?: readonly (string | number)[] | undefined;
	readonly recentToothXrayUrl?: string | undefined;
	readonly initialLabOrder?: LinkedChairsideLabOrderInfo | null | undefined;
	readonly onConfirmFitting?: ((orderId?: string) => void) | undefined;
	readonly onToothSelect?: ((tooth: number) => void) | undefined;
	readonly onOpenLabOrder?: (() => void) | undefined;
	readonly onAddToInvoice?: ((services: readonly Order804nServiceItem[]) => void) | undefined;
	readonly isLocked?: boolean;
	readonly className?: string;
}

function calculateDueDateStr(days: number): string {
	const d = new Date();
	let added = 0;
	while (added < days) {
		d.setDate(d.getDate() + 1);
		if (d.getDay() !== 0 && d.getDay() !== 6) added++;
	}
	return d.toISOString().slice(0, 10);
}

export function OrthopedicsChairsidePanel({
	patientId, activeToothFdi, selectedTeeth = [], recentToothXrayUrl,
	initialLabOrder, onConfirmFitting, onToothSelect, onOpenLabOrder,
	onAddToInvoice, isLocked = false, className = "",
}: OrthopedicsChairsidePanelProps) {
	const selectId = useId();
	const [activeTeethInput, setActiveTeethInput] = useState<string>(
		initialLabOrder?.toothFdi ? String(initialLabOrder.toothFdi) : selectedTeeth.length > 0 ? selectedTeeth.join(", ") : activeToothFdi ? String(activeToothFdi) : "16",
	);

	const [jawScope, setJawScope] = useState<"upper" | "lower" | "both" | "none">(() => {
		const t = Number(String(initialLabOrder?.toothFdi || activeToothFdi || "16").replace(/\D/g, "").slice(0, 2));
		if ((t >= 11 && t <= 28) || (t >= 51 && t <= 65)) return "upper";
		if ((t >= 31 && t <= 48) || (t >= 71 && t <= 85)) return "lower";
		return "upper";
	});
	const [selectedMaterial, setSelectedMaterial] = useState<string>(initialLabOrder?.material || "ZrO2 Multi-Layer");
	const [selectedShade, setSelectedShade] = useState<string>(initialLabOrder?.colorVita || "A2");
	const [selectedStumpShade, setSelectedStumpShade] = useState<string>(initialLabOrder?.stumpShade || "ND2");
	const [appliedProtocolId, setAppliedProtocolId] = useState<string | null>(null);
	const appliedProtocolTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (appliedProtocolTimerRef.current) clearTimeout(appliedProtocolTimerRef.current);
		};
	}, []);

	// Автоматическая привязка зубной формулы визита к наряду ЗТЛ
	useEffect(() => {
		if (initialLabOrder?.toothFdi) {
			setActiveTeethInput(String(initialLabOrder.toothFdi));
		} else if (selectedTeeth && selectedTeeth.length > 0) {
			setActiveTeethInput(selectedTeeth.join(", "));
		} else if (activeToothFdi) {
			setActiveTeethInput(String(activeToothFdi));
		}
	}, [activeToothFdi, selectedTeeth, initialLabOrder?.toothFdi]);

	// Стандартные наряды ЗТЛ, этапы изготовления и шкала VITA
	const [shadeSystem, setShadeSystem] = useState<"classical" | "3d_master" | "bleach">("classical");
	const [activeZtlPresetId, setActiveZtlPresetId] = useState<string>("zirconia");
	const activePreset =
		STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === activeZtlPresetId) ??
		STANDARD_ZTL_ORDER_PRESETS[0];

	const [dueDate, setDueDate] = useState<string>(() =>
		calculateDueDateStr(activePreset?.turnaroundBusinessDays ?? 5),
	);

	const grossPriceRub = activePreset?.pricePatientRub ?? 24000;
	const ztlCostRub = activePreset?.costZtlRub ?? 7500;
	const materialsCostRub = activePreset?.costMaterialsRub ?? 1200;
	const netMarginRub = grossPriceRub - ztlCostRub - materialsCostRub;
	const marginPercent = grossPriceRub > 0 ? Math.round((netMarginRub / grossPriceRub) * 100) : 0;

	const [preparationMargin, setPreparationMargin] = useState<string>("chamfer");
	const [fixationType, setFixationType] = useState<"cement" | "screw" | "clasp">(() => activePreset?.fixationType ?? "cement");
	const [hasAntagonists, setHasAntagonists] = useState<boolean>(true);
	const [isPassportModalOpen, setIsPassportModalOpen] = useState<boolean>(false);
	const [activeXrayUrl, setActiveXrayUrl] = useState<string | null>(recentToothXrayUrl ?? null);
	const [isWarrantyRework, setIsWarrantyRework] = useState<boolean>(false);
	const [warrantyLiabilityType, setWarrantyLiabilityType] = useState<"clinic_warranty" | "lab_defect">("clinic_warranty");
	const [isLabOrderSending, setIsLabOrderSending] = useState<boolean>(false);
	const [labOrderSentNumber, setLabOrderSentNumber] = useState<string | null>(
		initialLabOrder?.orderNumber ?? null,
	);
	const [activeOrderId, setActiveOrderId] = useState<string | null>(
		initialLabOrder?.id ?? null,
	);
	const [selectedStageId, setSelectedStageId] = useState<string>(() => {
		const raw = String(initialLabOrder?.stage ?? initialLabOrder?.status ?? "").toLowerCase();
		if (
			raw === "delivered_to_clinic" ||
			raw === "ready_in_clinic" ||
			raw === "received" ||
			raw === "ready"
		) {
			return "ready_in_clinic";
		}
		if (raw === "patient_fixation" || raw === "completed") {
			return "patient_fixation";
		}
		return "impression_scan";
	});
	const [fittingConfirmed, setFittingConfirmed] = useState<boolean>(() => {
		const raw = String(initialLabOrder?.stage ?? initialLabOrder?.status ?? "").toLowerCase();
		return raw === "patient_fixation" || raw === "completed";
	});

	useEffect(() => {
		if (!initialLabOrder) return;
		if (initialLabOrder.material) setSelectedMaterial(initialLabOrder.material);
		if (initialLabOrder.colorVita) setSelectedShade(initialLabOrder.colorVita);
		if (initialLabOrder.stumpShade) setSelectedStumpShade(initialLabOrder.stumpShade);
		if (initialLabOrder.orderNumber) setLabOrderSentNumber(initialLabOrder.orderNumber);
		if (initialLabOrder.id) setActiveOrderId(initialLabOrder.id);
	}, [initialLabOrder]);

	// Автоматическая привязка снимков визита к наряду ЗТЛ
	useEffect(() => {
		if (recentToothXrayUrl) {
			setActiveXrayUrl(recentToothXrayUrl);
		} else if (typeof window !== "undefined") {
			const cachedImg =
				localStorage.getItem("dente_active_visit_last_image") ||
				localStorage.getItem("dente_active_xray_url");
			if (cachedImg) {
				setActiveXrayUrl(cachedImg);
			}
		}
	}, [recentToothXrayUrl]);

	// Ready in clinic prompt modal state (Mandates 8b, 8e, 8n)
	const [isReadyInClinicModalOpen, setIsReadyInClinicModalOpen] = useState<boolean>(false);
	const [readyInClinicOrder, setReadyInClinicOrder] = useState<ReadyInClinicLabOrder | null>(null);

	// Клинический оверрайд врача (Мандат 8e п. 7, 8n)
	const [overrideActive, setOverrideActive] = useState<boolean>(false);
	const [overrideReason, setOverrideReason] = useState<string>(
		"Срочное изготовление по клиническим показаниям (аванс < 50%)",
	);

	const handleSelectZtlPreset = useCallback((preset: StandardZtlPreset) => {
		setActiveZtlPresetId(preset.id);
		setSelectedMaterial(preset.material);
		if (preset.fixationType) {
			setFixationType(preset.fixationType);
		}
		if (preset.hasAntagonists !== undefined) {
			setHasAntagonists(preset.hasAntagonists);
		}
		setDueDate(calculateDueDateStr(preset.turnaroundBusinessDays ?? 5));
		showToast(`Выбран стандарт ЗТЛ: ${preset.name} (${preset.badge})`, "info", 2000);
	}, []);

	const handleSelectStage = useCallback((stage: CanonicalManufacturing5StageItem) => {
		setSelectedStageId(stage.id);
		showToast(`Этап ЗТЛ: ${stage.shortLabelRu} (${stage.descRu})`, "info", 2000);

		if (activeOrderId) {
			fetch(`/api/lab/orders/${activeOrderId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					stage: stage.id,
					techStage: stage.shortLabelRu,
				}),
			}).catch((err) => {
				console.warn("[OrthopedicsChairsidePanel] Failed to patch lab order stage:", err);
			});
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-stage-changed", {
					detail: { stageId: stage.id, stageName: stage.shortLabelRu, orderNumber: labOrderSentNumber },
				}),
			);
		}

		if (stage.id === "ready_in_clinic") {
			const preset = STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === activeZtlPresetId);
			setReadyInClinicOrder({
				id: activeOrderId || undefined,
				orderNumber: labOrderSentNumber || (activeOrderId ? activeOrderId.slice(0, 8) : "ЗТЛ-1"),
				patientId: patientId || undefined,
				patientName: "Пациент",
				toothFdi: activeTeethInput,
				material: selectedMaterial,
				colorVita: selectedShade,
				constructionType: preset?.name || "Ортопедическая конструкция",
				clinicName: "DENTE",
			});
			setIsReadyInClinicModalOpen(true);
		}
	}, [activeOrderId, activeTeethInput, activeZtlPresetId, labOrderSentNumber, patientId, selectedMaterial, selectedShade]);

	const handleImmediateSendToLab = useCallback(async () => {
		if (isLocked && !overrideActive) {
			const auditReason =
				"Исправленному верить: срочный наряд ЗТЛ при закрытом визите";
			setOverrideActive(true);
			setOverrideReason(auditReason);
			const override = createDoctorClinicalOverride({
				reason: auditReason,
			});
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-doctor-clinical-override", {
						detail: override,
					}),
				);
			}
			showToast(
				"Исправленному верить: клинический оверрайд врача активирован",
				"info",
				3000,
			);
		}

		const teethParts = activeTeethInput
			.split(/[\s,;-]+/)
			.map((p) => p.trim())
			.filter(Boolean);

		const preset = STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === activeZtlPresetId) ?? STANDARD_ZTL_ORDER_PRESETS[0];
		if (!preset) return;
		const orderNumber = `ЗТЛ-${Date.now().toString().slice(-6)}`;
		setIsLabOrderSending(true);
		const effectiveStage = CANONICAL_MANUFACTURING_5_STAGES.find((s) => s.id === selectedStageId);
		const marginPreset = PREPARATION_MARGIN_PRESETS.find((m) => m.id === preparationMargin);
		const fixationPreset = FIXATION_TYPE_PRESETS.find((f) => f.id === fixationType);
		const isWarranty = Boolean(isWarrantyRework);
		const liabilityLabelRu = warrantyLiabilityType === "lab_defect"
			? "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)"
			: "Гарантийные обязательства клиники";

		const labOrderPayload = {
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: teethParts.length > 0 ? teethParts : ["16"],
			teethFdi: teethParts.length > 0 ? teethParts.join(", ") : "16",
			jawScope: jawScope !== "none" ? jawScope : "upper",
			construction: preset.constructionType,
			constructionType: preset.constructionType,
			material: selectedMaterial,
			colorVita: selectedShade,
			stumpShade: selectedStumpShade,
			fixationType,
			fixationTypeLabel: fixationPreset?.labelRu ?? fixationType,
			hasAntagonists,
			stage: selectedStageId,
			techStage: effectiveStage?.shortLabelRu ?? "Слепок/Скан",
			preparationMargin,
			preparationMarginLabel: marginPreset?.labelRu ?? preparationMargin,
			attachedImageUrl: activeXrayUrl || undefined,
			warrantyMonths: preset.warrantyMonths,
			warrantyLabelRu: preset.warrantyLabelRu,
			isWarrantyRework: isWarranty,
			warrantyLiabilityType: isWarranty ? warrantyLiabilityType : undefined,
			priceRub: isWarranty ? 0 : grossPriceRub,
			costRub: isWarranty ? 0 : ztlCostRub,
			materialsCostRub,
			netMarginRub: isWarranty ? -ztlCostRub - materialsCostRub : netMarginRub,
			marginPercent: isWarranty ? 0 : marginPercent,
			dueDate,
			clinicalNotes: isWarranty
				? `Гарантийная рекламация [${liabilityLabelRu}]. Для пациента: 0 ₽. Пресет: ${preset.name}. Оттенок: ${selectedShade}. Культя: ${selectedStumpShade}. Уступ: ${marginPreset?.labelRu ?? preparationMargin}. Фиксация: ${fixationPreset?.labelRu ?? fixationType}. Антагонисты: ${hasAntagonists ? "Да" : "Нет"}.`
				: `Срочный 1-клик наряд ЗТЛ из кресла врача. Пресет: ${preset.name}. Оттенок: ${selectedShade}. Культя: ${selectedStumpShade}. Уступ: ${marginPreset?.labelRu ?? preparationMargin}. Фиксация: ${fixationPreset?.labelRu ?? fixationType}. Антагонисты: ${hasAntagonists ? "Да" : "Нет"}. Гарантия: ${preset.warrantyLabelRu}. Срок: ${dueDate}. Этап: ${effectiveStage?.shortLabelRu ?? "Слепок/Скан"}.`,
			doctorNotes: "",
			overrideActive: true,
			overrideReason: overrideActive
				? overrideReason
				: "Исправленному верить: срочный наряд ЗТЛ при закрытом визите",
			patientId: patientId || undefined,
		};
		labOrderPayload.doctorNotes = labOrderPayload.clinicalNotes;

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", {
					detail: labOrderPayload,
				}),
			);
		}

		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			});

			let res = await fetch("/api/lab/orders", {
				method: "POST",
				headers,
				body: JSON.stringify(labOrderPayload),
			});

			if (res.status === 404) {
				res = await fetch("/api/clinical/lab-orders", {
					method: "POST",
					headers,
					body: JSON.stringify(labOrderPayload),
				});
			}

			if (res.ok) {
				const json = await res.json().catch(() => null);
				if (json?.id) {
					setActiveOrderId(json.id);
				}
			}
		} catch {
			// Offline or network error: in-app CustomEvent already notified listeners
		} finally {
			setIsLabOrderSending(false);
			setLabOrderSentNumber(orderNumber);
			showToast(
				isWarranty
					? `Гарантийный наряд ${orderNumber} в ЗТЛ оформлен (${liabilityLabelRu}, для пациента 0 ₽)!`
					: `Наряд ${orderNumber} в ЗТЛ успешно отправлен (${preset.name}, оттенок ${selectedShade})!`,
				"success",
				4000,
			);
		}
	}, [
		activeTeethInput,
		activeXrayUrl,
		activeZtlPresetId,
		dueDate,
		grossPriceRub,
		isLocked,
		isWarrantyRework,
		jawScope,
		marginPercent,
		materialsCostRub,
		netMarginRub,
		overrideActive,
		overrideReason,
		patientId,
		preparationMargin,
		selectedMaterial,
		selectedShade,
		selectedStageId,
		selectedStumpShade,
		warrantyLiabilityType,
		ztlCostRub,
	]);

	const handleApplyProtocol = useCallback(
		(protocol: OrthopedicProtocolPreset) => {
			if (isLocked && !overrideActive) {
				const auditReason =
					"Исправленному верить: дополнение ортопедического протокола";
				setOverrideActive(true);
				setOverrideReason(auditReason);
				const override = createDoctorClinicalOverride({
					reason: auditReason,
				});
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-doctor-clinical-override", {
							detail: override,
						}),
					);
				}
				showToast(
					"Исправленному верить: клинический оверрайд врача активирован",
					"info",
					3000,
				);
			}

			const teethParts = activeTeethInput
				.split(/[\s,;-]+/)
				.map((p) => p.trim())
				.filter(Boolean);

			const resolvedOrderNumber =
				initialLabOrder?.orderNumber ||
				labOrderSentNumber ||
				undefined;
			const resolvedTechnician =
				initialLabOrder?.technicianName ||
				undefined;
			const resolvedWarrantyPassport =
				initialLabOrder?.warrantyPassport ||
				(resolvedOrderNumber ? `ГП-${resolvedOrderNumber}` : undefined);

			const options: FormatOrthopedicProtocolOptions = {
				teethFdi: teethParts.length > 0 ? teethParts : undefined,
				toothFdi: teethParts.length === 1 ? teethParts[0] : undefined,
				jawScope: jawScope !== "none" ? jawScope : undefined,
				material: selectedMaterial,
				colorVita: selectedShade,
				labOrderId: initialLabOrder?.id ?? activeOrderId ?? undefined,
				labOrderNumber: resolvedOrderNumber,
				technicianName: resolvedTechnician,
				warrantyPassport: resolvedWarrantyPassport,
			};

			const result = applyOrthopedicProtocolToVisit({
				protocol,
				options,
				copyToClipboard: true,
				showNotification: true,
				onAddToInvoice,
			});

			setAppliedProtocolId(protocol.id);
			if (appliedProtocolTimerRef.current) clearTimeout(appliedProtocolTimerRef.current);
			appliedProtocolTimerRef.current = setTimeout(() => {
				appliedProtocolTimerRef.current = null;
				setAppliedProtocolId(null);
			}, 3000);

			const firstTooth = result.teethNumbers[0];
			if (typeof firstTooth === "number" && onToothSelect) {
				onToothSelect(firstTooth);
			}
		},
		[
			activeTeethInput,
			activeOrderId,
			initialLabOrder,
			isLocked,
			labOrderSentNumber,
			overrideActive,
			jawScope,
			selectedMaterial,
			selectedShade,
			onToothSelect,
			onAddToInvoice,
		],
	);

	const handleConfirmChairsideFitting = useCallback(() => {
		setFittingConfirmed(true);
		setSelectedStageId("patient_fixation");

		const cementationProto = ORTHOPEDIC_CANONICAL_PROTOCOLS.find(
			(p) => p.id === "ortho_permanent_cementation",
		);
		if (cementationProto) {
			handleApplyProtocol(cementationProto);
		}

		const targetOrderId = initialLabOrder?.id ?? activeOrderId ?? undefined;
		onConfirmFitting?.(targetOrderId);

		if (targetOrderId && typeof fetch === "function") {
			fetch(`/api/lab/orders/${targetOrderId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					status: "completed",
					stage: "patient_fixation",
					techStage: "Фиксация",
				}),
			}).catch(() => {});
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-fitting-confirmed", {
					detail: {
						orderId: targetOrderId,
						orderNumber: initialLabOrder?.orderNumber ?? labOrderSentNumber ?? "ЗТЛ-402",
						toothFdi: activeTeethInput,
						serviceCode: "A16.07.004",
					},
				}),
			);
		}

		showToast(
			"Примерка и фиксация (A16.07.004) подтверждены, атрибуты ЗТЛ внесены в 043/у",
			"success",
			3000,
		);
	}, [
		activeOrderId,
		activeTeethInput,
		handleApplyProtocol,
		initialLabOrder,
		labOrderSentNumber,
		onConfirmFitting,
	]);

	const handleToggleOverride = useCallback(() => {
		if (overrideActive) {
			setOverrideActive(false);
			showToast("Клинический оверрайд отменен", "info");
			return;
		}

		const override = createDoctorClinicalOverride({
			reason: overrideReason,
		});

		setOverrideActive(true);
		showToast(override.notice, "success", 4000);

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-doctor-clinical-override", {
					detail: override,
				}),
			);
		}
	}, [overrideActive, overrideReason]);

	const hasLinkedChairsideLabOrder = Boolean(
		initialLabOrder ||
		labOrderSentNumber ||
		selectedStageId === "ready_in_clinic" ||
		selectedStageId === "patient_fixation",
	);

	const effectiveOrderNumber =
		initialLabOrder?.orderNumber ||
		labOrderSentNumber ||
		"ЗТЛ-402";
	const effectiveTechnicianName =
		initialLabOrder?.technicianName ||
		"Смирнов А.В.";
	const effectiveWarrantyPassport =
		initialLabOrder?.warrantyPassport ||
		`ГП-${effectiveOrderNumber}`;
	const effectiveReadinessHeadline = formatLabReadinessIndicator({
		workType:
			initialLabOrder?.workType ||
			initialLabOrder?.constructionType ||
			(selectedMaterial.includes("ZrO2") ? "Коронка цирконий" : selectedMaterial),
		toothFdi: activeTeethInput,
	});

	const handleOpenLabOrder = useCallback(() => {
		const teethParts = activeTeethInput.split(/[\s,;-]+/).map((p) => p.trim()).filter(Boolean);
		const marginPreset = PREPARATION_MARGIN_PRESETS.find((m) => m.id === preparationMargin);
		const fixationPreset = FIXATION_TYPE_PRESETS.find((f) => f.id === fixationType);
		const draft = {
			toothFdi: teethParts.length > 0 ? teethParts.join(", ") : "16",
			teeth: teethParts.length > 0 ? teethParts : ["16"],
			jawScope: jawScope !== "none" ? jawScope : "upper",
			material: selectedMaterial,
			colorVita: selectedShade,
			stumpShade: selectedStumpShade,
			fixationType,
			fixationTypeLabel: fixationPreset?.labelRu ?? fixationType,
			hasAntagonists,
			preparationMargin,
			preparationMarginLabel: marginPreset?.labelRu ?? preparationMargin,
			priceRub: isWarrantyRework ? 0 : grossPriceRub,
			costRub: isWarrantyRework ? 0 : ztlCostRub,
			materialsCostRub,
			netMarginRub: isWarrantyRework ? -ztlCostRub - materialsCostRub : netMarginRub,
			marginPercent: isWarrantyRework ? 0 : marginPercent,
			dueDate,
			attachedImageUrl: activeXrayUrl || undefined,
			timestamp: Date.now(),
		};

		if (typeof window !== "undefined") {
			try {
				sessionStorage.setItem("dente_chairside_ortho_order_draft", JSON.stringify(draft));
				localStorage.setItem(
					"dente_active_lab_shade_preset",
					JSON.stringify({
						shadeCode: selectedShade,
						stumpShadeCode: selectedStumpShade,
						notes: `Материал: ${selectedMaterial}. Культя: ${selectedStumpShade}. Уступ: ${draft.preparationMarginLabel}. Фиксация: ${draft.fixationTypeLabel}. Антагонисты: ${hasAntagonists ? "Да" : "Нет"}. Срок: ${dueDate}.`,
					}),
				);
				window.dispatchEvent(
					new CustomEvent("dente-open-lab-order-modal", { detail: draft }),
				);
			} catch {
				// non-blocking
			}
		}

		onOpenLabOrder?.();
	}, [
		activeTeethInput,
		activeXrayUrl,
		dueDate,
		fixationType,
		grossPriceRub,
		hasAntagonists,
		isWarrantyRework,
		jawScope,
		marginPercent,
		materialsCostRub,
		netMarginRub,
		onOpenLabOrder,
		preparationMargin,
		selectedMaterial,
		selectedShade,
		selectedStumpShade,
		ztlCostRub,
	]);

	const fixationPreset = FIXATION_TYPE_PRESETS.find((f) => f.id === fixationType);
	const passportData: OrthopedicPassportData = {
		orderNumber: initialLabOrder?.orderNumber || labOrderSentNumber || undefined,
		passportNumber: initialLabOrder?.warrantyPassport || (labOrderSentNumber ? `ГП-${labOrderSentNumber}` : undefined),
		patientName: "Пациент",
		patientChartNumber: patientId ? patientId.slice(-6) : undefined,
		doctorName: "Д-р Смирнов А.В.",
		technicianName: initialLabOrder?.technicianName || "Смирнов А.В. (ЗТЛ)",
		toothFdi: activeTeethInput,
		constructionName: activePreset?.name || "Ортопедическая конструкция",
		material: selectedMaterial,
		colorVita: selectedShade,
		stumpShade: selectedStumpShade,
		preparationMarginLabel: PREPARATION_MARGIN_PRESETS.find((m) => m.id === preparationMargin)?.labelRu ?? preparationMargin,
		fixationTypeLabel: fixationPreset?.labelRu ?? (fixationType === "screw" ? "Винтовая Multi-Unit" : "Постоянная цементная (Fuji Plus / RelyX)"),
		warrantyMonths: activePreset?.warrantyMonths ?? 60,
		warrantyLabelRu: activePreset?.warrantyLabelRu ?? "60 месяцев (5 лет)",
	};

	return (
		<div
			className={`orthopedics-chairside-panel p-2.5 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs max-w-full overflow-x-clip ${className}`}
			data-testid="orthopedics-chairside-panel"
		>
			{hasLinkedChairsideLabOrder && (
				<OrthopedicsChairsideLabOrderBanner
					readinessHeadline={effectiveReadinessHeadline}
					orderNumber={effectiveOrderNumber}
					technicianName={effectiveTechnicianName}
					selectedMaterial={selectedMaterial}
					selectedShade={selectedShade}
					warrantyPassport={effectiveWarrantyPassport}
					fittingConfirmed={fittingConfirmed}
					onConfirmFitting={handleConfirmChairsideFitting}
					onOpenPassportA4={() => setIsPassportModalOpen(true)}
				/>
			)}

			<OrthopedicsChairsideTopBar
				selectId={selectId}
				activeTeethInput={activeTeethInput}
				onChangeActiveTeethInput={setActiveTeethInput}
				activeXrayUrl={activeXrayUrl}
				onDetachXray={() => setActiveXrayUrl(null)}
				jawScope={jawScope}
				onChangeJawScope={setJawScope}
				selectedMaterial={selectedMaterial}
				onChangeSelectedMaterial={setSelectedMaterial}
			/>

			<OrthopedicsZtlSelectors
				activeZtlPresetId={activeZtlPresetId}
				onSelectZtlPreset={handleSelectZtlPreset}
				preparationMargin={preparationMargin}
				onSelectPreparationMargin={(marginId, labelRu) => {
					setPreparationMargin(marginId);
					showToast(`Уступ ЗТЛ: ${labelRu}`, "info", 1500);
				}}
				selectedStageId={selectedStageId}
				onSelectStage={handleSelectStage}
				stumpShade={selectedStumpShade}
				onSelectStumpShade={(shade) => {
					setSelectedStumpShade(shade);
					showToast(`Цвет культи: ${shade}`, "info", 1500);
				}}
				fixationType={fixationType}
				onSelectFixationType={(type) => {
					setFixationType(type);
					const f = FIXATION_TYPE_PRESETS.find((p) => p.id === type);
					showToast(`Фиксация: ${f?.labelRu ?? type}`, "info", 1500);
				}}
				hasAntagonists={hasAntagonists}
				onToggleAntagonists={(val) => {
					setHasAntagonists(val);
					showToast(val ? "Антагонисты включены в наряд" : "Без антагонистов", "info", 1500);
				}}
				grossPriceRub={grossPriceRub}
				ztlCostRub={ztlCostRub}
				materialsCostRub={materialsCostRub}
				netMarginRub={netMarginRub}
				marginPercent={marginPercent}
				dueDate={dueDate}
				onChangeDueDate={setDueDate}
			/>

			{/* Расцветка VITA Classical & VITA 3D-Master: data-testid="vita-3d-master-tab" */}
			<OrthopedicsVitaShadePicker
				shadeSystem={shadeSystem}
				onShadeSystemChange={setShadeSystem}
				selectedShade={selectedShade}
				onSelectShade={setSelectedShade}
			/>

			{/* Сетка 4 канонических протоколов (1 клик -> 043/у + Смета + Этап 3) */}
			<OrthopedicsProtocolsGrid
				appliedProtocolId={appliedProtocolId}
				onApplyProtocol={handleApplyProtocol}
			/>

			<OrthopedicsChairsideFooterBar
				overrideActive={overrideActive}
				overrideReason={overrideReason}
				onToggleOverride={handleToggleOverride}
				onChangeOverrideReason={setOverrideReason}
				isWarrantyRework={isWarrantyRework}
				onToggleWarrantyRework={() => {
					const nextVal = !isWarrantyRework;
					setIsWarrantyRework(nextVal);
					showToast(
						nextVal
							? "Включен режим гарантийной переделки ЗТЛ: для пациента 0 ₽"
							: "Режим гарантийной переделки отключен",
						"info",
						2500,
					);
				}}
				warrantyLiabilityType={warrantyLiabilityType}
				onSelectWarrantyLiability={setWarrantyLiabilityType}
				labOrderSentNumber={labOrderSentNumber}
				isLabOrderSending={isLabOrderSending}
				onImmediateSendToLab={handleImmediateSendToLab}
				onOpenLabOrder={handleOpenLabOrder}
				onOpenPassportA4={() => setIsPassportModalOpen(true)}
			/>

			{/* Модалка 1-клик записи на фиксацию и шаблонов SMS / WhatsApp при поступлении работы в клинику */}
			<DentalLabReadyInClinicModal
				isOpen={isReadyInClinicModalOpen}
				onClose={() => setIsReadyInClinicModalOpen(false)}
				order={readyInClinicOrder}
			/>

			{/* Модалка Паспорта ортопедической конструкции и Гарантийного талона (А4) */}
			<OrthopedicPassportA4Modal
				isOpen={isPassportModalOpen}
				onClose={() => setIsPassportModalOpen(false)}
				passport={passportData}
			/>
		</div>
	);
}
