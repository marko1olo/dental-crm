import type { Appointment, Patient } from "@dental/shared";
import { formatPatientBalanceBadge } from "./patientReliabilityBalance";
import { classifyReliability } from "./patientReliabilityClassifier";
import { computePatientVisitStats } from "./patientReliabilityHistory";
import type {
	PatientReliabilityAssessment,
	PatientReliabilityBadge,
	ReliabilityCalculationOptions,
} from "./patientReliabilityTypes";

export * from "./patientReliabilityTypes";
export * from "./patientReliabilityBalance";
export * from "./patientReliabilityHistory";
export * from "./patientReliabilityClassifier";
export * from "./patientReliabilityStreak";

export function calculatePatientReliability(
	patient: Patient | null | undefined,
	appointments?: readonly Appointment[] | null | undefined,
	options?: ReliabilityCalculationOptions,
): PatientReliabilityAssessment {
	const patientId = patient?.id || "";
	const allAppts = appointments ?? [];
	const stats = computePatientVisitStats(patientId, allAppts, options);
	const financialBadge = formatPatientBalanceBadge(patient?.balanceRub);

	const isInsightHighRisk = options?.overrideInsight?.riskLevel === "high";

	const { category, status, score, badge, receptionistAlert: baseAlert } =
		classifyReliability({
			totalFinished: stats.totalAppointments,
			completedCount: stats.completedCount,
			noShowCount: stats.noShowCount,
			consecutiveNoShows: stats.consecutiveNoShows,
			maxConsecutiveNoShows: stats.maxConsecutiveNoShows,
			lateCount: stats.lateCount,
			cancelledCount: stats.cancelledCount,
			attendanceRatePercent: stats.attendanceRatePercent,
			onTimeRatePercent: stats.onTimeRatePercent,
			isInsightHighRisk,
		});

	const flags: string[] = [];
	if (stats.consecutiveNoShows >= 2) {
		flags.push(`${stats.consecutiveNoShows} неявки подряд («Требуется подтверждение за 2 часа»)`);
	} else if (stats.noShowCount > 0) {
		flags.push(`${stats.noShowCount} неявка(и) без предупреждения`);
	}
	if (stats.lateCount > 0) {
		flags.push(`Опоздания >15 мин: ${stats.lateCount} раз(а)`);
	}
	if (stats.cancelledCount >= 2) {
		flags.push(`Отмен визитов: ${stats.cancelledCount}`);
	}
	if (financialBadge.isDebt) {
		flags.push(`Задолженность: ${financialBadge.formattedAmount}`);
	} else if (financialBadge.isDeposit) {
		flags.push(`Депозит: ${financialBadge.formattedAmount}`);
	}

	let receptionistAlert = baseAlert;
	if (financialBadge.isDebt) {
		if (receptionistAlert) {
			receptionistAlert += ` Долг: ${financialBadge.formattedAmount}.`;
		} else {
			receptionistAlert = `У пациента задолженность ${financialBadge.formattedAmount}. Напомнить при записи.`;
		}
	}

	return {
		patientId,
		score,
		category,
		stats,
		reliabilityBadge: badge,
		financialBadge,
		flags,
		receptionistAlert,
	};
}

export const calculatePatientReliabilityScore = (
	patientId: string,
	appointments: readonly Appointment[] = [],
	patient?: Patient | null,
	options?: ReliabilityCalculationOptions,
) => calculatePatientReliability(patient ? { ...patient, id: patientId } : ({ id: patientId } as Patient), appointments, options);

export function getReliabilityBadgeConfig(
	assessment: PatientReliabilityAssessment,
): PatientReliabilityBadge {
	return assessment.reliabilityBadge;
}
