import type { MobileAnalyticsPeriod, TopDoctorPerformanceRow } from "./executiveAnalyticsTypes";

export function buildTopDoctorsPerformanceRows(
	doctorsReport: any[],
	activePeriod: MobileAnalyticsPeriod,
	isDemo: boolean,
): TopDoctorPerformanceRow[] {
	if (doctorsReport && doctorsReport.length > 0) {
		return doctorsReport.slice(0, 5).map((doc: any, idx: number) => {
			const appts = doc.appointments || {};
			const total = Number(appts.total || 0);
			const completed = Number(appts.completed || 0);
			const visitsCount = Math.max(1, completed || total || 1);
			const revenueRub = Math.round(Number(doc.revenueRub || 0));
			const avgCheckRub = Math.round(revenueRub / visitsCount);
			const attendance = total > 0 ? `${Math.round((completed / total) * 100)}%` : "—";
			const name = doc.doctorName || "Врач клиники";
			const initials = name
				.split(" ")
				.filter(Boolean)
				.map((w: string) => w[0])
				.slice(0, 2)
				.join("")
				.toUpperCase();
			return {
				id: doc.doctorUserId || `doc-${idx}`,
				name,
				specialty: "Стоматолог",
				initials: initials || "ВК",
				billed: `${revenueRub.toLocaleString("ru-RU")} ₽`,
				averageCheckFormatted: `${avgCheckRub.toLocaleString("ru-RU")} ₽`,
				visits: completed || total,
				attendance,
				complexPlansShare: doc.complexPlansShare || "65%",
				rank: idx + 1,
				badgeColor: "var(--teal, #0d9488)",
			};
		});
	}

	if (isDemo) {
		return [
			{
				id: "doc-1",
				name: "Д-р Воронов А. В.",
				specialty: "Терапия, Ортопедия",
				initials: "ВА",
				billed: activePeriod === "day" ? "68 000 ₽" : activePeriod === "week" ? "420 000 ₽" : "1 580 000 ₽",
				averageCheckFormatted: "32 900 ₽",
				visits: activePeriod === "day" ? 5 : activePeriod === "week" ? 22 : 48,
				attendance: "96%",
				complexPlansShare: "74%",
				rank: 1,
				badgeColor: "var(--teal, #0d9488)",
			},
			{
				id: "doc-2",
				name: "Д-р Соколова Е. И.",
				specialty: "Ортодонтия",
				initials: "СЕ",
				billed: activePeriod === "day" ? "45 000 ₽" : activePeriod === "week" ? "310 000 ₽" : "1 240 000 ₽",
				averageCheckFormatted: "34 400 ₽",
				visits: activePeriod === "day" ? 4 : activePeriod === "week" ? 18 : 36,
				attendance: "92%",
				complexPlansShare: "82%",
				rank: 2,
				badgeColor: "var(--teal, #0d9488)",
			},
			{
				id: "doc-3",
				name: "Д-р Морозов Д. С.",
				specialty: "Хирургия, Имплантация",
				initials: "МД",
				billed: activePeriod === "day" ? "38 000 ₽" : activePeriod === "week" ? "290 000 ₽" : "1 150 000 ₽",
				averageCheckFormatted: "41 000 ₽",
				visits: activePeriod === "day" ? 3 : activePeriod === "week" ? 14 : 28,
				attendance: "89%",
				complexPlansShare: "78%",
				rank: 3,
				badgeColor: "var(--teal, #0d9488)",
			},
			{
				id: "doc-4",
				name: "Д-р Кузнецова А. П.",
				specialty: "Детская стоматология",
				initials: "КА",
				billed: activePeriod === "day" ? "24 000 ₽" : activePeriod === "week" ? "160 000 ₽" : "880 000 ₽",
				averageCheckFormatted: "20 950 ₽",
				visits: activePeriod === "day" ? 4 : activePeriod === "week" ? 16 : 42,
				attendance: "94%",
				complexPlansShare: "62%",
				rank: 4,
				badgeColor: "var(--teal, #0d9488)",
			},
		];
	}

	return [];
}
