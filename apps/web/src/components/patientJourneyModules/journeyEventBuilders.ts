import type { Dashboard } from "@dental/shared";
import {
	appointmentStatusLabels,
	insightRiskLabels,
	paymentMethodLabels,
	paymentStatusLabels,
} from "./journeyHelpers";
import type { JourneyEvent } from "./journeyTypes";

export function createPatientJourneyEvents(
	patientId: string,
	dashboard: Dashboard | null | undefined,
	staffById: Map<string, { fullName?: string }>,
): JourneyEvent[] {
	const doctorName = (id: string | null | undefined) =>
		!id
			? "врач не назначен"
			: (staffById.get(id)?.fullName ?? "врач не найден в списке");

	const visitEvents: JourneyEvent[] = (dashboard?.appointments || [])
		.filter((a) => a.patientId === patientId)
		.map((a) => {
			const statusKey = String(a.status ?? "").toLowerCase();
			return {
				id: a.id,
				timestamp: a.startsAt,
				type: "appointment",
				title: `Приём: ${appointmentStatusLabels[statusKey] ?? statusKey}`,
				description: `${doctorName(a.doctorUserId)} · ${a.reason || "повод не указан"}`,
				status: appointmentStatusLabels[statusKey] ?? statusKey,
				actionUrl: `/patients/${patientId}/visit/${a.id}`,
			};
		});

	const paymentEvents: JourneyEvent[] = (dashboard?.payments || [])
		.filter((p) => p.patientId === patientId)
		.map((p) => ({
			id: p.id,
			timestamp: p.paidAt || p.createdAt,
			type: "transaction",
			title: `Оплата: ${paymentMethodLabels[String(p.method)] ?? p.method}`,
			description: `Сумма ${p.amountRub ? `${p.amountRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}`,
			amount: p.amountRub,
			status: paymentStatusLabels[String(p.status)] ?? p.status,
			actionUrl: "#finance",
		}));

	const insightEvents: JourneyEvent[] = (dashboard?.patientInsights || [])
		.filter((i) => i.patientId === patientId)
		.map((i) => ({
			id: `insight-${i.patientId}-${i.riskLevel}`,
			timestamp: i.lastActivityAt || new Date().toISOString(),
			type: "medical_alert",
			title: `Инсайт: ${insightRiskLabels[String(i.riskLevel)] ?? i.riskLevel}`,
			description:
				[i.riskReasons.join(" · "), i.nextBestAction]
					.filter(Boolean)
					.join(" — ") || "нет пояснений к риску",
			status: insightRiskLabels[String(i.riskLevel)] ?? i.riskLevel,
		}));

	return [...visitEvents, ...paymentEvents, ...insightEvents].sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	);
}

export function calculateTreatmentPlanProgress(
	planItems: any[] | undefined,
	patientId: string,
) {
	const items = (planItems ?? []).filter((i) => i?.patientId === patientId);
	const active = (items ?? []).filter((i) => i?.status !== "cancelled");
	const completed = (active ?? []).filter((i) => i?.status === "completed");
	const total = active.length;
	const comp = completed.length;
	const pct = total > 0 ? Math.round((comp / total) * 100) : 0;
	return {
		totalItemsCount: total,
		completedItemsCount: comp,
		progressPercentage: pct,
		showProgress: total > 0 && pct < 100,
	};
}
