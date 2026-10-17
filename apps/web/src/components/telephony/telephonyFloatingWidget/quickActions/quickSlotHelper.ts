export function computeQuickSlot(slotType: "urgent" | "consultation" | "tomorrow", todayIso: string) {
	if (slotType === "urgent") {
		return { targetDate: todayIso, startTime: "10:00:00", endTime: "10:30:00", reason: "Острая боль / Экстренный визит" };
	}
	if (slotType === "consultation") {
		return { targetDate: todayIso, startTime: "15:00:00", endTime: "15:30:00", reason: "Первичная консультация и план лечения" };
	}
	const d = new Date(todayIso);
	d.setDate(d.getDate() + 1);
	return { targetDate: d.toISOString().split("T")[0]!, startTime: "11:00:00", endTime: "11:30:00", reason: "Плановый осмотр" };
}
