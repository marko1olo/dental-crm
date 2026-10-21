import {
	type OrthopedicWorkTypeId,
	type LabWorkflowStatus,
	createDentalLabOrder,
} from "../dentalLabWorkflowEngine";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import type {
	ImplantPlatformType,
	AbutmentCategoryType,
	FixationType,
	LabTechnologicalStageId,
} from "../orders/labWorkOrderPresets";
import type { DentalLabCreateOrderModalProps } from "./labOrderCreateTypes";
import { buildCreateFittingDraft } from "./labOrderCreateFittingDraft";

export interface LabOrderCreateSubmitContext {
	props: DentalLabCreateOrderModalProps;
	newPatientName: string;
	newChartNumber: string;
	newDoctorName: string;
	newLabName: string;
	newWorkType: OrthopedicWorkTypeId;
	newTeethInput: string;
	newShade: string;
	newStumpShade: string;
	newPriceRub: number;
	newCostRub: number;
	newDoctorPercent: number;
	newInitialStatus: LabWorkflowStatus;
	newExpectedLabDate: string;
	newFittingDate: string;
	autoBookFitting: boolean;
	newAppointmentId: string;
	newClinicalNotes: string;
	newImplantPlatform: ImplantPlatformType | "";
	newAbutmentType: AbutmentCategoryType | "";
	newFixationType: FixationType | "";
	newTechStage: LabTechnologicalStageId;
}

export function executeLabOrderCreateSubmit(ctx: LabOrderCreateSubmitContext) {
	const {
		props, newPatientName, newChartNumber, newDoctorName, newLabName, newWorkType,
		newTeethInput, newShade, newStumpShade, newPriceRub, newCostRub, newDoctorPercent,
		newInitialStatus, newExpectedLabDate, newFittingDate, autoBookFitting,
		newAppointmentId, newClinicalNotes, newImplantPlatform, newAbutmentType,
		newFixationType, newTechStage,
	} = ctx;
	const { currentPatientName, currentDoctorName, currentToothNumber, currentPatientId, onCreateOrder, onClose } = props;

	const effectivePatientName = newPatientName.trim() || currentPatientName?.trim() || "Пациент";
	const teeth = newTeethInput
		.split(",")
		.map((s) => Number.parseInt(s.trim(), 10))
		.filter((n) => !Number.isNaN(n) && n >= 11 && n <= 48);
	const defaultTeeth = currentToothNumber && !Number.isNaN(Number(currentToothNumber)) ? [Number(currentToothNumber)] : [11];
	const selectedTeeth = teeth.length > 0 ? teeth : defaultTeeth;

	const created = createDentalLabOrder({
		patientId: currentPatientId || `pat-${Date.now()}`,
		patientName: effectivePatientName,
		patientChartNumber: newChartNumber.trim() || undefined,
		doctorId: "doc-current",
		doctorName: newDoctorName.trim() || currentDoctorName?.trim() || "Врач-ортопед",
		clinicName: "Стоматологическая клиника DENTE",
		labName: newLabName,
		workTypeId: newWorkType,
		selectedTeeth,
		shadeCode: newShade,
		stumpShadeCode: newStumpShade,
		pricePerUnitRub: newPriceRub,
		costPerUnitRub: newCostRub,
		pricePerUnitKopecks: Math.max(0, Math.round(newPriceRub * 100)),
		costPerUnitKopecks: Math.max(0, Math.round(newCostRub * 100)),
		doctorPercent: newDoctorPercent,
		initialStatus: newInitialStatus,
		expectedLabDate: newExpectedLabDate,
		fittingDate: newFittingDate,
		appointmentId: newAppointmentId.trim() || undefined,
		clinicalNotes: newClinicalNotes.trim() || undefined,
		implantPlatform: newImplantPlatform || undefined,
		abutmentType: newAbutmentType || undefined,
		fixationType: newFixationType || undefined,
		techStage: newTechStage,
	});

	if (autoBookFitting && typeof window !== "undefined") {
		const draft = buildCreateFittingDraft(created, newWorkType, newFittingDate, newExpectedLabDate);
		try {
			window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(draft));
			window.dispatchEvent(new CustomEvent("dente-quick-appointment-draft", { detail: draft }));
			window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: draft }));
		} catch {}
	}

	if (typeof window !== "undefined") {
		window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: created }));
		for (const toothNum of created.selectedTeeth) {
			window.dispatchEvent(new CustomEvent("dente-quick-tooth-apply", {
				detail: { toothNumber: toothNum, state: "Planned_Crown", patientId: currentPatientId || created.patientId },
			}));
		}
		try {
			fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({
					patientId: currentPatientId && /^[0-9a-fA-F-]{36}$/.test(currentPatientId) ? currentPatientId : undefined,
					toothFdi: created.selectedTeeth.join(", "),
					material: created.materialName || created.workTypeId || "zirconia",
					colorVita: newShade,
					dueDate: newExpectedLabDate ? new Date(newExpectedLabDate).toISOString() : null,
					status: newInitialStatus || "sent_to_lab",
					stage: newInitialStatus || "sent_to_lab",
					techStage: newTechStage,
					priceRub: newPriceRub,
					clinicalNotes: newClinicalNotes.trim() || undefined,
					orderNumber: created.orderNumber,
				}),
			}).catch(() => {});
		} catch {}
	}

	onCreateOrder(created);
	onClose();
}
