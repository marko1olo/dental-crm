import type {
	QuickBookingSlotInfo,
	QuickBookingStageService,
} from "../schedule/QuickBookingDrawerTypes";
import type { PatientRecallRecord } from "./recallCycleCatalog";

/**
 * Номенклатура медицинских услуг 804н для плановых контрольных приёмов и профгигиены.
 */
export function resolveRecallServices(candidate: PatientRecallRecord): QuickBookingStageService[] {
	if (candidate.cycleType === "implant_monitoring") {
		return [
			{
				id: "rec-srv-implant-check",
				code804n: "A16.07.054",
				title: "Осмотр и динамический рентген-контроль дентального имплантата",
				priceRub: 1500,
				quantity: 1,
			},
		];
	}

	if (candidate.cycleType === "periodontal_maintenance") {
		return [
			{
				id: "rec-srv-perio-check",
				code804n: "A16.07.019",
				title: "Пародонтальный поддерживающий осмотр и кюретаж",
				priceRub: 2500,
				quantity: 1,
			},
		];
	}

	if (
		candidate.cycleType === "orthodontic_braces" ||
		candidate.cycleType === "orthodontic_aligners" ||
		candidate.cycleType === "orthodontic_retention"
	) {
		return [
			{
				id: "rec-srv-ortho-check",
				code804n: "A16.07.048",
				title: "Контрольный осмотр и активация ортодонтического аппарата",
				priceRub: 2000,
				quantity: 1,
			},
		];
	}

	if (
		candidate.cycleType === "endodontic_check" ||
		candidate.clinicalNotes?.toLowerCase().includes("эндо") ||
		candidate.clinicalNotes?.toLowerCase().includes("канал")
	) {
		return [
			{
				id: "rec-srv-endo-check",
				code804n: "A06.07.003",
				title: "Прицельная внутриротовая контактная рентгенография / визиография",
				priceRub: 600,
				quantity: 1,
			},
		];
	}

	// По умолчанию — профессиональная гигиена полости рта и зубов (Order 804n)
	return [
		{
			id: "rec-srv-hygiene",
			code804n: "A16.07.051",
			title: "Профессиональная гигиена полости рта и зубов",
			priceRub: 3500,
			quantity: 1,
		},
	];
}

/**
 * Создает предзаполненный слот QuickBookingSlotInfo для мгновенной записи без трения.
 */
export function buildRecallQuickBookingSlot(candidate: PatientRecallRecord): QuickBookingSlotInfo {
	const duration =
		candidate.cycleType === "implant_monitoring"
			? 30
			: candidate.cycleType === "periodontal_maintenance"
				? 45
				: candidate.cycleType === "endodontic_check"
					? 20
					: 30;

	return {
		dateKey: candidate.dueDate || new Date().toISOString().slice(0, 10),
		patientId: candidate.patientId,
		patientName: candidate.fullName,
		patientPhone: candidate.phone ?? undefined,
		doctorUserId: candidate.attendingDoctorId ?? undefined,
		doctorName: candidate.attendingDoctorName ?? undefined,
		reason: candidate.clinicalNotes || "Плановый контрольный осмотр и гигиена",
		stageTitle: "Плановый контрольный осмотр (реколл)",
		durationMinutes: duration,
		estimatedDurationMinutes: duration,
		services: resolveRecallServices(candidate),
	};
}
