import { useMemo } from "react";
import type { ShiftDebtRecall, ShiftDebtEstimate } from "./drawerTypes";

export function useCopilotDrawerDebts(storeDashboard: any) {
	const shiftDebtRecalls = useMemo<ShiftDebtRecall[]>(() => {
		const storeRecalls = storeDashboard?.recalls as Array<any> | undefined;
		if (storeRecalls && storeRecalls.length > 0) {
			return storeRecalls.map((r, idx) => ({
				id: r.id || `recall-${idx}`,
				patientId: r.patientId || "",
				fullName: r.fullName || r.patientName || "Пациент",
				phone: r.phone || "+7 (999) 000-00-00",
				reason: r.reason || r.clinicalNotes || "Плановый осмотр и гигиена",
				overdueDays: r.daysOverdue ?? 10,
				overdueDate: r.dueDate || "Сентябрь 2026",
			}));
		}
		return [
			{
				id: "recall-1",
				patientId: "p-rec-1",
				fullName: "Смирнова Елена Викторовна",
				phone: "+7 (926) 341-22-10",
				reason: "Профгигиена 6 мес (Air-Flow + полировка)",
				overdueDays: 14,
				overdueDate: "25 сен 2026",
			},
			{
				id: "recall-2",
				patientId: "p-rec-2",
				fullName: "Васильев Игорь Олегович",
				phone: "+7 (916) 880-45-12",
				reason: "Контроль имплантации (зуб 4.6, 6 мес)",
				overdueDays: 8,
				overdueDate: "01 окт 2026",
			},
			{
				id: "recall-3",
				patientId: "p-rec-3",
				fullName: "Михайлова Дарья Сергеевна",
				phone: "+7 (903) 124-77-90",
				reason: "Ортодонтическая активация элайнеров",
				overdueDays: 5,
				overdueDate: "04 окт 2026",
			},
		];
	}, [storeDashboard]);

	const shiftDebtEstimates = useMemo<ShiftDebtEstimate[]>(() => {
		const storePlans = (storeDashboard?.treatmentPlans ?? storeDashboard?.treatmentPlanScenarios ?? []) as Array<any>;
		const thinkingPlans = storePlans.filter(
			(p) => p.status === "thinking" || p.status === "approval" || p.status === "draft",
		);
		if (thinkingPlans.length > 0) {
			const patients = (storeDashboard?.patients ?? []) as Array<any>;
			return thinkingPlans.map((p, idx) => {
				const patient = patients.find((pt) => pt.id === p.patientId);
				return {
					id: p.id || `est-${idx}`,
					patientId: p.patientId || "",
					patientName: patient?.fullName || p.patientName || "Пациент",
					title: p.title || p.name || "Комплексный план лечения",
					status: (p.status || "thinking") as "thinking" | "approval",
					statusLabel: "Думает",
					amountRub: Number(p.totalPriceRub || p.totalPrice || 50000),
				};
			});
		}
		return [
			{
				id: "est-1",
				patientId: "p-est-1",
				patientName: "Кузнецов Андрей Павлович",
				title: "Комплексная имплантация и протезирование (All-on-4)",
				status: "thinking" as const,
				statusLabel: "Думает",
				amountRub: 185000,
			},
			{
				id: "est-2",
				patientId: "p-est-2",
				patientName: "Орлова Татьяна Николаевна",
				title: "Керамические виниры E-max (фронтальный отдел, 6 ед.)",
				status: "thinking" as const,
				statusLabel: "Думает",
				amountRub: 144000,
			},
		];
	}, [storeDashboard]);

	const totalEstimatesSumRub = useMemo(() => {
		return shiftDebtEstimates.reduce((acc, curr) => acc + curr.amountRub, 0);
	}, [shiftDebtEstimates]);

	return { shiftDebtRecalls, shiftDebtEstimates, totalEstimatesSumRub };
}
