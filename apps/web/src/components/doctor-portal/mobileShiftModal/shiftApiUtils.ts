import {
	generateUuidV7,
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	type DoctorShiftAppointment,
} from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";

export function getShowcaseShiftAppointments(
	doctorId: string,
	doctorName: string,
	doctorSpecialty: string,
	shiftDateIso: string,
): DoctorShiftAppointment[] {
	const targetDate = shiftDateIso?.split("T")[0] || new Date().toISOString().slice(0, 10);
	return SAMPLE_DOCTOR_SHIFT_APPOINTMENTS.map((apt) => {
		const timeStart = apt.startsAtIso.split("T")[1] || "09:00:00.000Z";
		const timeEnd = apt.endsAtIso.split("T")[1] || "10:00:00.000Z";
		return {
			...apt,
			doctorId,
			doctorFullName: doctorName || apt.doctorFullName,
			doctorSpecialty: doctorSpecialty || apt.doctorSpecialty,
			startsAtIso: `${targetDate}T${timeStart}`,
			endsAtIso: `${targetDate}T${timeEnd}`,
		};
	});
}

export async function persistBatchSigningToApi(
	doctorId: string,
	doctorName: string,
	shiftDateIso: string,
	protocolHash: string,
	signedAtIso: string,
	targetIds: readonly string[],
	updatedAppts: readonly DoctorShiftAppointment[],
): Promise<void> {
	try {
		const shiftRes = await fetch("/api/schedule/shifts", {
			method: "POST",
			headers: denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			}),
			body: JSON.stringify({
				shifts: [
					{
						doctorId,
						doctorName,
						dateIso: shiftDateIso,
						shiftDateIso,
						protocolHash,
						signedAtIso,
						signedAppointmentIds: targetIds,
						appointments: updatedAppts,
					},
				],
			}),
		});
		if (!shiftRes.ok) {
			clientLogger.warn(
				"[DoctorMobileShiftModal] /api/schedule/shifts returned error status:",
				shiftRes.status,
			);
		}
	} catch (err) {
		clientLogger.warn(
			"[DoctorMobileShiftModal] Ошибка отправки статуса смены на /api/schedule/shifts",
			err,
		);
	}

	const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	for (const aptId of targetIds) {
		if (!uuidRe.test(aptId)) continue;
		try {
			const visitRes = await fetch(`/api/diaries/visit/${encodeURIComponent(aptId)}`, {
				method: "GET",
				headers: denteClinicalMutationHeaders(),
			});
			if (!visitRes.ok) continue;
			const visitRaw = await visitRes.json().catch(() => null);
			const visitPayload = (visitRaw?.data ?? visitRaw) as { diary?: { id?: string | null } } | null;
			const diaryId = visitPayload?.diary?.id;
			if (typeof diaryId !== "string" || !uuidRe.test(diaryId)) continue;

			const lockRes = await fetch(`/api/diaries/${encodeURIComponent(diaryId)}/lock`, {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					pkcs7Signature: protocolHash,
				}),
			});
			if (!lockRes.ok) {
				clientLogger.warn(
					"[DoctorMobileShiftModal] /api/diaries/lock returned error status:",
					lockRes.status,
				);
			}
		} catch (err) {
			clientLogger.warn(
				"[DoctorMobileShiftModal] Ошибка блокировки дневника /api/diaries/lock",
				err,
			);
		}
	}
}

export function buildEmergencyAppointment(
	doctorId: string,
	doctorName: string,
	shiftDateIso?: string | undefined,
): DoctorShiftAppointment {
	const now = new Date();
	const nowTimeStr = now.toTimeString().slice(0, 5);
	const endHour = new Date(now.getTime() + 30 * 60 * 1000).toTimeString().slice(0, 5);
	const shiftDate = shiftDateIso ?? now.toISOString().slice(0, 10);

	return {
		id: `apt-emerg-${now.getTime()}`,
		doctorId,
		doctorFullName: doctorName,
		patientId: `pat-emerg-${now.getTime()}`,
		patientFullName: "Экстренный пациент (Острая боль)",
		cardNumber: `ЭКСТР-${now.getTime().toString().slice(-4)}`,
		startsAtIso: `${shiftDate}T${nowTimeStr}:00`,
		endsAtIso: `${shiftDate}T${endHour}:00`,
		chairName: "Кресло № 1",
		status: "in_chair",
		treatmentDescription: "Экстренная стоматологическая помощь (острая боль)",
		services: [
			{
				id: `srv-emerg-${now.getTime()}`,
				code804n: "A16.07.001",
				nameRu: "Первичный осмотр и купирование острой зубной боли",
				category: "therapy",
				quantity: 1,
				unitPriceKop: 0,
				totalCostKop: 0,
				discountKop: 0,
				finalRevenueKop: 0,
				commissionPercent: 25,
				directLabZtlCostKop: 0,
				directMaterialCostKop: 0,
				earnedDoctorPayoutKop: 0,
			},
		],
		emrCard043uStatus: "draft",
	};
}
