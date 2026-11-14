/**
 * dentalLabApiMapper.ts — Maps raw PostgreSQL 18 JSON response into typed DentalLabWorkflowOrder.
 */

import type { DentalLabWorkflowOrder, LabWorkflowStatus, OrthopedicWorkTypeId } from "./dentalLabWorkflowEngine";
import { checkLabDeadlineAndAlert } from "./workflowEngine/workflowDeadlineAlerts";

export interface RawDentalLabOrderApiRecord {
	readonly id?: string;
	readonly orderNumber?: string;
	readonly order_number?: string;
	readonly patientId?: string;
	readonly patient_id?: string;
	readonly patientName?: string;
	readonly patient_name?: string;
	readonly doctorId?: string;
	readonly doctor_id?: string;
	readonly doctorName?: string;
	readonly doctor_name?: string;
	readonly clinicName?: string;
	readonly clinic_name?: string;
	readonly labName?: string;
	readonly lab_name?: string;
	readonly workTypeId?: string;
	readonly constructionType?: string;
	readonly materialName?: string;
	readonly material?: string;
	readonly toothFdi?: string | number;
	readonly shadeSystem?: "classical" | "3d_master" | "bleach";
	readonly shadeCode?: string;
	readonly colorVita?: string;
	readonly stumpShadeCode?: string;
	readonly shadeStump?: string;
	readonly translucency?: "HT" | "MT" | "LT" | "MO" | "HO";
	readonly surfaceTexture?: "high_gloss" | "microtexture" | "matte";
	readonly currentStage?: string;
	readonly status?: string;
	readonly stageHistory?: readonly {
		readonly stage: LabWorkflowStatus;
		readonly timestampIso: string;
		readonly authorName: string;
		readonly note?: string | undefined;
	}[];
	readonly createdAt?: string;
	readonly updatedAt?: string;
	readonly orderDateIso?: string;
	readonly dueDate?: string;
	readonly expectedLabDateIso?: string;
	readonly scheduledVisitDateIso?: string;
	readonly scheduledVisitDate?: string;
	readonly fittingDate?: string;
	readonly fittingDateIso?: string;
	readonly appointmentId?: string;
	readonly patientPriceRub?: number;
	readonly priceRub?: number;
	readonly patientPriceKopecks?: number | string;
	readonly priceKopecks?: number | string;
	readonly labCostRub?: number;
	readonly costRub?: number;
	readonly costKopecks?: number | string;
	readonly labCostKopecks?: number | string;
	readonly [key: string]: unknown;
}

function normalizeWorkTypeId(rawId?: string): OrthopedicWorkTypeId {
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

function normalizeLabWorkflowStatus(rawStage?: string): LabWorkflowStatus {
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

export function mapRawApiOrderToWorkflowOrder(
	raw: RawDentalLabOrderApiRecord,
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
		orderNumber: raw.orderNumber || raw.order_number || `ЗТЛ-${1000 + idx}`,
		patientName: raw.patientName || raw.patient_name || defaultPatientName,
		doctorName: raw.doctorName || raw.doctor_name || defaultDoctorName,
		labName: raw.labName || raw.lab_name,
	});

	const marginPercent = priceRub > 0 ? Math.round(((priceRub - costRub) / priceRub) * 1000) / 10 : 0;

	return {
		id: raw.id || `live-ztl-${idx}`,
		orderNumber: raw.orderNumber || raw.order_number || `ЗТЛ-${1000 + idx}`,
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
		translucency: raw.translucency || "MT",
		surfaceTexture: raw.surfaceTexture || "microtexture",
		currentStage: normalizeLabWorkflowStatus(raw.currentStage || raw.status),
		stageHistory: Array.isArray(raw.stageHistory)
			? (raw.stageHistory as DentalLabWorkflowOrder["stageHistory"])
			: [
					{
						stage: normalizeLabWorkflowStatus(raw.currentStage || raw.status),
						timestampIso: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
						authorName: typeof raw.doctorName === "string" ? raw.doctorName : defaultDoctorName || "Врач-ортопед",
						note: "Импортировано из медицинской карты",
					},
			  ],
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
