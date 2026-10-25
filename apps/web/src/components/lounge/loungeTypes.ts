/**
 * loungeTypes.ts — Типы данных и демо-пресеты табло зоны ожидания
 */

export interface WaitingLoungeQueueItem {
	id: string;
	cabinetNumber: string;
	cabinetName?: string;
	doctorName: string;
	doctorRole?: string;
	patientName: string;
	status: "calling" | "in_treatment" | "waiting";
	scheduledTime?: string;
}

export interface WaitingLoungeSignageProps {
	readonly clinicName?: string;
	readonly initialItems?: readonly WaitingLoungeQueueItem[];
	readonly onExit?: () => void;
}

/** Реалистичные демонстрационные данные табло клиники (только для showcase) */
export const DEFAULT_LOUNGE_QUEUE: WaitingLoungeQueueItem[] = [
	{
		id: "q-1",
		cabinetNumber: "Кабинет №1",
		cabinetName: "Терапия и эндодонтия",
		doctorName: "Зубов А. В.",
		doctorRole: "Врач-стоматолог-терапевт",
		patientName: "Иванов И. О.",
		status: "calling",
		scheduledTime: "18:30",
	},
	{
		id: "q-2",
		cabinetNumber: "Кабинет №2",
		cabinetName: "Хирургия и имплантация",
		doctorName: "Смирнова О. В.",
		doctorRole: "Стоматолог-хирург",
		patientName: "Петрова Е. С.",
		status: "in_treatment",
		scheduledTime: "18:15",
	},
	{
		id: "q-3",
		cabinetNumber: "Кабинет №3",
		cabinetName: "Ортодонтия и гнатология",
		doctorName: "Соколов М. Д.",
		doctorRole: "Врач-ортодонт",
		patientName: "Кузнецов А. М.",
		status: "waiting",
		scheduledTime: "18:45",
	},
	{
		id: "q-4",
		cabinetNumber: "Кабинет №4",
		cabinetName: "Детский приём и гигиена",
		doctorName: "Васильева Н. И.",
		doctorRole: "Детский стоматолог",
		patientName: "Морозова Т. П.",
		status: "waiting",
		scheduledTime: "19:00",
	},
];
