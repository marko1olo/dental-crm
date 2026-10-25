export type WaitlistMatch = {
	entryId: string;
	patientId: string;
	patientName: string;
	phone: string | null;
	priorityLevel: string;
	waitingDays: number;
	sameDoctor: boolean;
	timeFits: boolean;
	alreadyBooked: boolean;
	reason: string;
};

export type FreedSlot = {
	appointmentId: string;
	startsAt: string;
	endsAt: string;
	status: string;
	doctorName: string | null;
	freedBecause: string;
	topMatches: WaitlistMatch[];
	candidatesTotal: number;
};

export type FreedSlotsReport = {
	slots: FreedSlot[];
	horizonDays: number;
	note: string;
};

export const DEMO_SHOWCASE_FREED_REPORT: FreedSlotsReport = {
	slots: [
		{
			appointmentId: "demo-freed-slot-1",
			startsAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
			endsAt: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
			status: "cancelled",
			doctorName: "Д-р Смирнов А.П.",
			freedBecause: "Пациент перенёс визит на следующую неделю",
			candidatesTotal: 2,
			topMatches: [
				{
					entryId: "demo-waitlist-1",
					patientId: "demo-pat-ivanov",
					patientName: "Иванов Иван Иванович",
					phone: "+7 (999) 123-45-67",
					priorityLevel: "urgent",
					waitingDays: 2,
					sameDoctor: true,
					timeFits: true,
					alreadyBooked: false,
					reason: "Острая боль / срочный приём",
				},
				{
					entryId: "demo-waitlist-2",
					patientId: "demo-pat-petrova",
					patientName: "Петрова Анна Сергеевна",
					phone: "+7 (999) 765-43-21",
					priorityLevel: "treatment_plan",
					waitingDays: 5,
					sameDoctor: true,
					timeFits: true,
					alreadyBooked: false,
					reason: "Этап ортопедии (ждёт освободившегося окна)",
				},
			],
		},
	],
	horizonDays: 7,
	note: "Демонстрационный режим: показано освободившееся окно с автоматическим подбором кандидатов из листа ожидания",
};

export function formatMoment(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleString("ru-RU", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatDuration(fromIso: string, toIso: string): string {
	const minutes = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000);
	if (!Number.isFinite(minutes) || minutes <= 0) return "";
	if (minutes < 60) return `${minutes} мин`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

export const calledKey = (slotId: string, patientId: string | null | undefined) =>
	`${slotId}|${patientId ?? ""}`;
