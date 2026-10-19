/**
 * dentalLabOrderSaveHelper.ts — Компактный фасад сохранения и экспорта наряд-заказов ЗТЛ.
 *
 * Архитектура декомпозиции (Mandate 8b <= 250 строк):
 * - orderSaveModules/labOrderValidator.ts
 * - orderSaveModules/labOrderPayloadBuilder.ts
 * - orderSaveModules/labOrderProtocolExporter.ts
 */

import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import {
	type DentalLabOrderData,
	type JawScope,
	type LabOrderStageKey,
	addWorkingDays,
} from "./labMath";
import { validateLabOrderInput } from "./orderSaveModules/labOrderValidator";
import {
	mapConstructionTypeToRestorationType,
	mapMaterialToRestorationMaterial,
	buildLabOrderApiPayload,
	buildFittingAppointmentDraft,
} from "./orderSaveModules/labOrderPayloadBuilder";
import {
	formatDisplayDate,
	copyLabOrderZtl1Protocol,
	copyLabOrderMessengerSummary,
} from "./orderSaveModules/labOrderProtocolExporter";

export {
	mapConstructionTypeToRestorationType,
	mapMaterialToRestorationMaterial,
	formatDisplayDate,
	copyLabOrderZtl1Protocol,
	copyLabOrderMessengerSummary,
};

export interface SaveLabOrderParams {
	initialOrder?: DentalLabOrderData | null | undefined;
	effectivePatientId: string;
	formPatientName: string;
	formDoctorId: string;
	formDoctorName: string;
	patientChartNumber?: string | undefined;
	selectedTeeth: number[];
	jawScope: JawScope | null;
	constructionType: string;
	material: string;
	impressionType: string;
	finalShade: string;
	shadeSystem: "classical" | "3d_master" | "bleach";
	shadeCervical: string;
	shadeBody: string;
	shadeIncisal: string;
	shadeStump: string;
	translucency: string;
	mamelons: boolean;
	calcifications: boolean;
	opalescence: boolean;
	occlusalScheme: string;
	contactTightness: string;
	surfaceTexture: string;
	cementGapMicrons: number;
	currentStage: LabOrderStageKey;
	dueDate: string;
	scheduledVisitDate: string;
	frameworkTrialDate: string;
	ceramicTrialDate: string;
	clinicalNotes: string;
	effectiveOverride: { authorized: boolean; doctorName: string; timestampIso: string; reason: string } | null;
	totalLabPriceRub: number;
	attachedImageUrl: string | null;
	treatmentPlanId: string | null;
	stageId: string | null;
	stageNumber: number | null;
	stageTitle: string | null;
	includeImpressionBilling: boolean;
	clinicSharePct: number;
	doctorSharePct: number;
	doctorAmountRub: number;
	fittingCollision: { hasCollision: boolean; warningRu?: string | null | undefined };
	gostOrderNumber: string;
	onOrderSaved?: ((order: DentalLabOrderData) => void) | undefined;
	onSaveOrder?: ((order: DentalLabOrderData) => void) | undefined;
	onClose: () => void;
}

export async function executeSaveLabOrder(params: SaveLabOrderParams): Promise<void> {
	const validation = validateLabOrderInput({
		patientId: params.effectivePatientId,
		patientName: params.formPatientName,
		doctorId: params.formDoctorId,
		doctorName: params.formDoctorName,
		selectedTeeth: params.selectedTeeth,
		jawScope: params.jawScope,
		constructionType: params.constructionType,
		material: params.material,
		shadeFinal: params.finalShade,
		dueDate: params.dueDate,
		scheduledVisitDate: params.scheduledVisitDate,
		frameworkTrialDate: params.frameworkTrialDate,
		ceramicTrialDate: params.ceramicTrialDate,
		totalLabPriceRub: params.totalLabPriceRub,
	});

	if (!validation.isValid) {
		const errMsg = validation.errors.join("; ");
		showToast(`Ошибка наряда: ${errMsg}`, "error");
		throw new Error(errMsg);
	}

	for (const warning of validation.warnings) {
		showToast(warning, "warning");
	}

	const payload = buildLabOrderApiPayload(params);

	const isExistingOrder = Boolean(
		params.initialOrder?.id &&
		!params.initialOrder.id.startsWith("LAB-") &&
		!params.initialOrder.id.startsWith("TEMP-") &&
		!params.initialOrder.id.startsWith("live-ztl-") &&
		/^[0-9a-fA-F-]{36}$/.test(params.initialOrder.id)
	);

	const url = isExistingOrder
		? `/api/clinical/lab-orders/${params.initialOrder!.id}`
		: "/api/clinical/lab-orders";
	const method = isExistingOrder ? "PUT" : "POST";

	const res = await fetch(url, {
		method,
		headers: {
			"Content-Type": "application/json",
			"Idempotency-Key": `lab-order-${Date.now()}-${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Date.now().toString(36)}`,
			...denteAdminSecretRequestHeaders(),
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const errData = await res.json().catch(() => ({}));
		const errMsg = errData.message || "Не удалось сохранить заказ ЗТЛ";
		showToast(errMsg, "error");
		throw new Error(errMsg);
	}

	const savedOrder = await res.json();

	if (method === "POST" && savedOrder?.id && params.selectedTeeth.length > 0) {
		for (const tooth of params.selectedTeeth) {
			try {
				await fetch(`/api/clinical/lab-orders/${savedOrder.id}/items`, {
					method: "POST",
					headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({
						toothFdi: tooth,
						restorationType: mapConstructionTypeToRestorationType(params.constructionType),
						material: mapMaterialToRestorationMaterial(params.material),
						shadeFinal: params.finalShade,
						shadeStump: params.shadeStump || null,
						translucencyLevel: params.translucency,
						cementGapMicrons: params.cementGapMicrons,
						priceRub: params.totalLabPriceRub / params.selectedTeeth.length,
					}),
				});
			} catch { /* offline fallback */ }
		}
	}

	showToast(isExistingOrder ? "Наряд ЗТЛ успешно обновлен" : "Наряд-заказ в ЗТЛ успешно оформлен!", "success");

	const resultData: DentalLabOrderData = {
		...savedOrder,
		selectedTeeth: params.selectedTeeth,
		jawScope: params.jawScope,
		constructionType: params.constructionType,
		material: params.material,
		impressionType: params.impressionType,
		colorVita: params.finalShade,
		shadeSystem: params.shadeSystem,
		shadeCervical: params.shadeCervical,
		shadeBody: params.shadeBody,
		shadeIncisal: params.shadeIncisal,
		shadeStump: params.shadeStump,
		translucency: params.translucency,
		mamelons: params.mamelons,
		calcifications: params.calcifications,
		opalescence: params.opalescence,
		occlusalScheme: params.occlusalScheme,
		contactTightness: params.contactTightness,
		surfaceTexture: params.surfaceTexture,
		cementGapMicrons: params.cementGapMicrons,
		currentStage: params.currentStage,
		frameworkTrialDate: params.frameworkTrialDate,
		ceramicTrialDate: params.ceramicTrialDate,
		dueDate: params.dueDate,
		scheduledVisitDate: params.scheduledVisitDate || undefined,
		fittingCollisionWarning: params.fittingCollision.hasCollision ? (params.fittingCollision.warningRu ?? undefined) : undefined,
		clinicSharePct: params.clinicSharePct,
		doctorSharePct: params.doctorSharePct,
		doctorDeductionRub: params.doctorAmountRub,
		attachedImageUrl: params.attachedImageUrl || null,
		treatmentPlanId: params.treatmentPlanId,
		stageId: params.stageId,
		stageNumber: params.stageNumber,
		stageTitle: params.stageTitle,
		includeImpressionBilling: params.includeImpressionBilling,
	};

	params.onOrderSaved?.(resultData);
	params.onSaveOrder?.(resultData);

	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: resultData }));
		for (const toothNum of params.selectedTeeth) {
			window.dispatchEvent(new CustomEvent("dente-quick-tooth-apply", {
				detail: { toothNumber: toothNum, state: "Planned_Crown", patientId: params.effectivePatientId },
			}));
		}

		const effectiveFittingDate = params.scheduledVisitDate || params.ceramicTrialDate ||
			(params.dueDate ? addWorkingDays(new Date(params.dueDate), 1).toISOString().slice(0, 10) : "");

		if (effectiveFittingDate) {
			const appointmentDraft = buildFittingAppointmentDraft({
				effectivePatientId: params.effectivePatientId,
				formPatientName: params.formPatientName,
				formDoctorId: params.formDoctorId,
				formDoctorName: params.formDoctorName,
				effectiveFittingDate,
				material: params.material,
				selectedTeeth: params.selectedTeeth,
				gostOrderNumber: params.gostOrderNumber,
				finalShade: params.finalShade,
				dueDate: params.dueDate,
			});
			try {
				window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(appointmentDraft));
				window.dispatchEvent(new CustomEvent("dente-quick-appointment-draft", { detail: appointmentDraft }));
				window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: appointmentDraft }));
			} catch { /* quota fallback */ }
		}

		if (params.includeImpressionBilling && !isExistingOrder) {
			const orgId = typeof window.localStorage !== "undefined"
				? window.localStorage.getItem("dente_organization_id") || "00000000-0000-0000-0000-000000000001"
				: "00000000-0000-0000-0000-000000000001";
			fetch(`/api/inventory/${orgId}/quick-writeoff-orthopedic`, {
				method: "POST",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({
					protocolId: params.impressionType === "digital_scan" ? "ortho_digital_scan_impression" : "ortho_impression_silicone",
					toothNumber: params.selectedTeeth.length > 0 ? params.selectedTeeth[0] : null,
					notes: `Автосписание материалов слепка по наряду ЗТЛ ${params.gostOrderNumber}`,
				}),
			})
				.then((r) => (r.ok ? r.json() : null))
				.then((data) => {
					if (data?.deductedItems?.length) {
						const overdraftNote = data.isOverdraft ? " (мягкий овердрафт склада)" : "";
						showToast(
							`Склад: списаны материалы слепка (${data.deductedItems.length} поз.)${overdraftNote}`,
							data.isOverdraft ? "warning" : "info",
							3000,
						);
					}
				})
				.catch(() => {});
		}
	}

	params.onClose();
}
