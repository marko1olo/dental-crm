import type { DisinfectionRoomType, GeneralCleaningScheduleStatus } from "./disinfectionTypes";

export function calculateNextGeneralCleaningDate(lastCleaningDateStr: string): string {
	const lastDate = new Date(lastCleaningDateStr);
	if (Number.isNaN(lastDate.getTime())) {
		const fallback = new Date();
		fallback.setDate(fallback.getDate() + 7);
		return fallback.toISOString().slice(0, 10);
	}
	const nextDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
	return nextDate.toISOString().slice(0, 10);
}

export function validateGeneralCleaningSchedule(
	lastCleaningDateStr: string,
	roomName: string = "Хирургический кабинет № 1",
	roomType: DisinfectionRoomType = "surgical",
	checkDateStr: string = new Date().toISOString().slice(0, 10),
): GeneralCleaningScheduleStatus {
	const lastDate = new Date(lastCleaningDateStr);
	const checkDate = new Date(checkDateStr);

	if (Number.isNaN(lastDate.getTime()) || Number.isNaN(checkDate.getTime())) {
		return {
			roomName,
			roomType,
			lastCleaningDate: lastCleaningDateStr,
			nextPlannedDate: calculateNextGeneralCleaningDate(lastCleaningDateStr),
			daysElapsed: 0,
			daysRemaining: 7,
			isOverdue: false,
			status: "optimal",
			statusMessageRu: "Некорректная дата уборки",
		};
	}

	const diffMs = checkDate.getTime() - lastDate.getTime();
	const daysElapsed = Math.floor(diffMs / (24 * 60 * 60 * 1000));
	const daysRemaining = 7 - daysElapsed;
	const nextPlannedDate = calculateNextGeneralCleaningDate(lastCleaningDateStr);

	if (daysElapsed > 7) {
		const overdueDays = daysElapsed - 7;
		return {
			roomName,
			roomType,
			lastCleaningDate: lastCleaningDateStr,
			nextPlannedDate,
			daysElapsed,
			daysRemaining,
			isOverdue: true,
			status: "overdue",
			statusMessageRu: `ВНИМАНИЕ! Просрочена генеральная уборка на ${overdueDays} дн.! (СанПиН 3.3686-21 требует проведение генеральной уборки не реже 1 раза в 7 дней).`,
		};
	}

	if (daysRemaining <= 1) {
		return {
			roomName,
			roomType,
			lastCleaningDate: lastCleaningDateStr,
			nextPlannedDate,
			daysElapsed,
			daysRemaining,
			isOverdue: false,
			status: "approaching_limit",
			statusMessageRu: `Срок проведения генеральной уборки наступает ${daysRemaining === 0 ? "СЕГОДНЯ" : "ЗАВТРА"}. Интервал: 7 дней.`,
		};
	}

	return {
		roomName,
		roomType,
		lastCleaningDate: lastCleaningDateStr,
		nextPlannedDate,
		daysElapsed,
		daysRemaining,
		isOverdue: false,
		status: "optimal",
		statusMessageRu: `График генеральных уборок в норме (до следующей уборки ${daysRemaining} дн.).`,
	};
}
