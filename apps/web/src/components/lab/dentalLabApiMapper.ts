/**
 * dentalLabApiMapper.ts — Maps raw PostgreSQL 18 JSON response into typed DentalLabWorkflowOrder.
 */

import type { DentalLabWorkflowOrder, LabWorkflowStatus, OrthopedicWorkTypeId } from "./dentalLabWorkflowEngine";
import { checkLabDeadlineAndAlert } from "./dentalLabWorkflowEngine";
import type { DentalLabOrderData } from "./labMath";

export interface RawDentalLabOrderApiRecord {
	readonly id?: string | null | undefined;
	readonly orderNumber?: string | null | undefined;
	readonly order_number?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly patient_id?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly patient_name?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctor_id?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctor_name?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinic_name?: string | null | undefined;
	readonly labName?: string | null | undefined;
	readonly lab_name?: string | null | undefined;
	readonly workTypeId?: string | null | undefined;
	readonly constructionType?: string | null | undefined;
	readonly materialName?: string | null | undefined;
	readonly materialId?: string | null | undefined;
	readonly material?: string | null | undefined;
	readonly toothFdi?: string | number | null | undefined;
	readonly shadeSystem?: "classical" | "3d_master" | "bleach" | null | undefined;
	readonly shadeCode?: string | null | undefined;
	readonly colorVita?: string | null | undefined;
	readonly stumpShadeCode?: string | null | undefined;
	readonly shadeStump?: string | null | undefined;
	readonly translucency?: "HT" | "MT" | "LT" | "MO" | "HO" | string | null | undefined;
	readonly surfaceTexture?: "high_gloss" | "microtexture" | "matte" | string | null | undefined;
	readonly currentStage?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly stageHistory?: readonly unknown[] | null | undefined;
	readonly createdAt?: string | null | undefined;
	readonly updatedAt?: string | null | undefined;
	readonly orderDateIso?: string | null | undefined;
	readonly dueDate?: string | null | undefined;
	readonly expectedLabDateIso?: string | null | undefined;
	readonly scheduledVisitDateIso?: string | null | undefined;
	readonly scheduledVisitDate?: string | null | undefined;
	readonly fittingDate?: string | null | undefined;
	readonly fittingDateIso?: string | null | undefined;
	readonly appointmentId?: string | null | undefined;
	readonly patientPriceRub?: number | null | undefined;
	readonly priceRub?: number | null | undefined;
	readonly patientPriceKopecks?: number | string | null | undefined;
	readonly priceKopecks?: number | string | null | undefined;
	readonly labCostRub?: number | null | undefined;
	readonly costRub?: number | null | undefined;
	readonly costKopecks?: number | string | null | undefined;
	readonly labCostKopecks?: number | string | null | undefined;
}

function normalizeWorkTypeId(rawId?: string | null): OrthopedicWorkTypeId {
	switch (rawId) {
		case "crown_zirconia":
		case "crown_emax":
		case "metal_ceramic":
		case "temporary_pmma":
		case "clasp_prosthesis":
		case "custom_abutment":
		case "removable_acrylic":
		case "aligners":
			return rawId;
		case "single_crown":
		case "crown":
		case "bridge":
			return "crown_zirconia";
		case "veneer":
		case "inlay_onlay":
			return "crown_emax";
		case "clasp_denture":
		case "denture":
			return "clasp_prosthesis";
		case "implant_abutment":
		case "implant":
			return "custom_abutment";
		case "aligner_nightguard":
		case "aligners_nightguard":
		case "orthodontic":
			return "aligners";
		default:
			return "crown_zirconia";
	}
}

function normalizeLabWorkflowStatus(rawStage?: string | null): LabWorkflowStatus {
	switch (rawStage) {
		case "draft":
		case "sent_to_lab":
		case "fitting_scheduled":
		case "installed_completed":
		case "warranty_rework":
			return rawStage;
		case "sent":
		case "in_progress":
		case "shipped":
		case "impression_sent":
		case "cad_design":
		case "model_cad_design":
		case "milling_wax_up":
		case "framework_wax_milling":
		case "sintering_ceramic_layering":
			return "sent_to_lab";
		case "received":
		case "ready":
		case "ready_in_clinic":
		case "try_in_fitting":
		case "refitting":
			return "fitting_scheduled";
		case "fitted":
		case "completed":
		case "installed":
		case "fixed":
		case "delivered_to_clinic":
		case "installed_in_mouth":
		case "final_glaze":
		case "glaze_finish":
			return "installed_completed";
		case "rejected_remake":
		case "rework":
			return "warranty_rework";
		default:
			return "draft";
	}
}

function normalizeTranslucency(t?: string | null): "HT" | "MT" | "LT" | "MO" | "HO" {
	switch (t) {
		case "HT":
		case "MT":
		case "LT":
		case "MO":
		case "HO":
			return t;
		default:
			return "MT";
	}
}

function normalizeSurfaceTexture(s?: string | null): "high_gloss" | "microtexture" | "matte" {
	switch (s) {
		case "high_gloss":
		case "microtexture":
		case "matte":
			return s;
		default:
			return "microtexture";
	}
}

function normalizeStageHistory(
	history: readonly unknown[] | null | undefined,
	currentStage: LabWorkflowStatus,
	createdAtIso: string,
	doctorName: string,
): DentalLabWorkflowOrder["stageHistory"] {
	if (!Array.isArray(history) || history.length === 0) {
		return [
			{
				stage: currentStage,
				timestampIso: createdAtIso,
				authorName: doctorName,
				note: "Импортировано из медицинской карты",
			},
		];
	}
	return history.map((item) => {
		if (item && typeof item === "object") {
			const rec = item as Record<string, unknown>;
			const rawStage = typeof rec.stage === "string" ? rec.stage : undefined;
			const timestampIso = typeof rec.timestampIso === "string" ? rec.timestampIso : typeof rec.timestamp === "string" ? rec.timestamp : createdAtIso;
			const authorName = typeof rec.authorName === "string" ? rec.authorName : doctorName;
			const note = typeof rec.note === "string" ? rec.note : undefined;
			return {
				stage: normalizeLabWorkflowStatus(rawStage),
				timestampIso,
				authorName,
				note,
			};
		}
		return {
			stage: currentStage,
			timestampIso: createdAtIso,
			authorName: doctorName,
			note: undefined,
		};
	});
}

export function mapRawApiOrderToWorkflowOrder(
	raw: RawDentalLabOrderApiRecord | DentalLabOrderData,
	idx: number,
	defaultPatientId?: string,
	defaultPatientName?: string,
	defaultDoctorName?: string,
): DentalLabWorkflowOrder {
	const teethArr = raw.toothFdi
		? String(raw.toothFdi)
				.split(",")
				.map((t: string) => parseInt(t.trim(), 10))
				.filter((n: number) => !isNaN(n) && n >= 11 && n <= 48)
		: [11];

	const priceRub = raw.patientPriceRub ?? raw.priceRub ?? (raw.patientPriceKopecks != null ? Number(raw.patientPriceKopecks) / 100 : raw.priceKopecks != null ? Number(raw.priceKopecks) / 100 : 0);
	const costRub = raw.labCostRub ?? raw.costRub ?? (raw.costKopecks != null ? Number(raw.costKopecks) / 100 : raw.labCostKopecks != null ? Number(raw.labCostKopecks) / 100 : 0);
	const count = teethArr.length || 1;
	const isCompleted = ["fitted", "completed", "installed", "fixed"].includes(String(raw.currentStage || raw.status || "").toLowerCase());

	const delayAlert = checkLabDeadlineAndAlert({
		expectedLabDate: raw.expectedLabDateIso || raw.dueDate || raw.orderDateIso || raw.createdAt || new Date().toISOString(),
		scheduledVisitDate: raw.scheduledVisitDateIso || raw.scheduledVisitDate || null,
		fittingDate: raw.fittingDateIso || raw.fittingDate || null,
		appointmentId: raw.appointmentId || undefined,
		isInstalledOrCompleted: isCompleted,
		orderNumber: String(raw.orderNumber || raw.order_number || `ЗТЛ-${1000 + idx}`),
		patientName: (raw.patientName || raw.patient_name || defaultPatientName) ?? undefined,
		doctorName: (raw.doctorName || raw.doctor_name || defaultDoctorName) ?? undefined,
		labName: (raw.labName || raw.lab_name) ?? undefined,
	});

	const marginPercent = priceRub > 0 ? Math.round(((priceRub - costRub) / priceRub) * 1000) / 10 : 0;

	return {
		id: raw.id || `live-ztl-${idx}`,
		orderNumber: String(raw.orderNumber || raw.order_number || `ЗТЛ-${1000 + idx}`),
		patientId: raw.patientId || raw.patient_id || defaultPatientId || "pat",
		patientName: raw.patientName || raw.patient_name || defaultPatientName || "Пациент",
		doctorId: raw.doctorId || raw.doctor_id || "doc",
		doctorName: raw.doctorName || raw.doctor_name || defaultDoctorName || "Врач-ортопед",
		clinicName: raw.clinicName || raw.clinic_name || "Стоматологическая клиника DENTE",
		labName: raw.labName || raw.lab_name || "Центральная зуботехническая лаборатория",
		workTypeId: normalizeWorkTypeId(raw.workTypeId || raw.constructionType),
		materialName: raw.materialName || raw.material || "Диоксид циркония",
		selectedTeeth: teethArr.length > 0 ? teethArr : [11],
		shadeSystem: raw.shadeSystem || "classical",
		shadeCode: raw.shadeCode || raw.colorVita || "A2",
		stumpShadeCode: raw.stumpShadeCode || raw.shadeStump || undefined,
		translucency: normalizeTranslucency(raw.translucency),
		surfaceTexture: normalizeSurfaceTexture(raw.surfaceTexture),
		currentStage: normalizeLabWorkflowStatus(raw.currentStage || raw.status),
		stageHistory: normalizeStageHistory(
			raw.stageHistory,
			normalizeLabWorkflowStatus(raw.currentStage || raw.status),
			typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
			typeof raw.doctorName === "string" ? raw.doctorName : defaultDoctorName || "Врач-ортопед",
		),
		orderDateIso: (raw.orderDateIso || raw.createdAt || new Date().toISOString()).slice(0, 10),
		expectedLabDateIso: (raw.expectedLabDateIso || raw.dueDate || new Date().toISOString()).slice(0, 10),
		scheduledVisitDateIso: raw.scheduledVisitDateIso?.slice(0, 10),
		fittingDate: raw.fittingDate?.slice(0, 10),
		fittingDateIso: (raw.fittingDateIso || raw.fittingDate)?.slice(0, 10),
		appointmentId: raw.appointmentId || undefined,
		financials: {
			unitsCount: count,
			pricePerUnitKopecks: priceRub * 100,
			costPerUnitKopecks: costRub * 100,
			patientPriceTotalKopecks: priceRub * 100 * count,
			labCostKopecks: costRub * 100 * count,
			labCostTotalKopecks: costRub * 100 * count,
			clinicGrossMarginKopecks: (priceRub - costRub) * 100 * count,
			grossMarginPercent: marginPercent,
			doctorPercent: 20,
			doctorWageBaseKopecks: (priceRub - costRub) * 100 * count,
			doctorWageKopecks: Math.round((priceRub - costRub) * 20 * count),
			clinicNetProfitKopecks: Math.round((priceRub - costRub) * 80 * count),
			patientPriceTotalRub: priceRub * count,
			labCostTotalRub: costRub * count,
			clinicGrossMarginRub: (priceRub - costRub) * count,
			doctorWageRub: Math.round((priceRub - costRub) * 0.2 * count),
			clinicNetProfitRub: Math.round((priceRub - costRub) * 0.8 * count),
			isBalanced: true,
		},
		delayAlert,
		isDelayedAlert: delayAlert.isDelayedAlert,
		createdAtIso: raw.createdAt || new Date().toISOString(),
		updatedAtIso: raw.updatedAt || new Date().toISOString(),
	};
}
