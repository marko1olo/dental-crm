import type { RawDoctorVisitItem } from "./doctorProductivityTypes";

export interface DoctorAccumulator {
	doctorId: string;
	doctorName: string;
	specialty: string;
	totalBilledKopecks: number;
	totalPaidKopecks: number;
	completedVisitsCount: number;
	totalScheduledAppointments: number;
	attendedAppointmentsCount: number;
	cancelledCount: number;
	noShowCount: number;
	totalMinutes: number;
	uniquePatients: Set<string>;
	primaryPatients: Set<string>;
	repeatPatients: Set<string>;
}

export function accumulateDoctorVisits(
	visits: readonly RawDoctorVisitItem[],
): Map<string, DoctorAccumulator> {
	const doctorMap = new Map<string, DoctorAccumulator>();

	for (const v of visits) {
		const docId = v.doctorId || "unassigned";
		const docName = v.doctorName || "Врач не назначен";
		const spec = v.specialty || "Стоматолог общей практики";

		let acc = doctorMap.get(docId);
		if (!acc) {
			acc = {
				doctorId: docId,
				doctorName: docName,
				specialty: spec,
				totalBilledKopecks: 0,
				totalPaidKopecks: 0,
				completedVisitsCount: 0,
				totalScheduledAppointments: 0,
				attendedAppointmentsCount: 0,
				cancelledCount: 0,
				noShowCount: 0,
				totalMinutes: 0,
				uniquePatients: new Set<string>(),
				primaryPatients: new Set<string>(),
				repeatPatients: new Set<string>(),
			};
			doctorMap.set(docId, acc);
		}

		acc.totalScheduledAppointments += 1;

		if (v.status === "cancelled") {
			acc.cancelledCount += 1;
			continue;
		}

		if (v.status === "no_show") {
			acc.noShowCount += 1;
			continue;
		}

		acc.attendedAppointmentsCount += 1;

		const billed = Math.max(0, Math.round(v.billedKopecks || 0));
		const paid = Math.max(0, Math.round(v.paidKopecks || 0));
		const dur = Math.max(0, Math.round(v.durationMinutes || 30));

		acc.totalBilledKopecks += billed;
		acc.totalPaidKopecks += paid;
		acc.totalMinutes += dur;

		if (v.status === "completed") {
			acc.completedVisitsCount += 1;
		}

		if (v.patientId) {
			acc.uniquePatients.add(v.patientId);
			if (v.isPrimaryPatient) {
				acc.primaryPatients.add(v.patientId);
			} else {
				acc.repeatPatients.add(v.patientId);
			}
		}
	}

	return doctorMap;
}
