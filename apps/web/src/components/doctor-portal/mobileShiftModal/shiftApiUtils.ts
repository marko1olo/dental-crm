import {
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
	type DoctorShiftAppointment,
} from "@dental/shared";

export function getShowcaseShiftAppointments(
	doctorId: string,
	doctorName: string,
	doctorSpecialty: string,
	shiftDateIso: string,
): DoctorShiftAppointment[] {
	const targetDate = shiftDateIso?.split("T")[0] || new Date().toISOString().split("T")[0]!;
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
		await fetch("/api/diary/shifts", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				shifts: [
					{
						doctorId,
						doctorName,
						shiftDateIso,
						protocolHash,
						signedAtIso,
						signedAppointmentIds: targetIds,
						appointments: updatedAppts,
					},
				],
			}),
		});
	} catch (err) {
		console.warn(
			"[DoctorMobileShiftModal] Ошибка отправки статуса смены на /api/diary/shifts",
			err,
		);
	}

	for (const aptId of targetIds) {
		try {
			await fetch(`/api/diaries/${encodeURIComponent(aptId)}/lock`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					pkcs7Signature: protocolHash,
					pepProtocolHash: protocolHash,
					signedAtIso,
				}),
			});
		} catch {
			// Non-blocking fallback
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
	const shiftDate = shiftDateIso ?? now.toISOString().split("T")[0]!;

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
