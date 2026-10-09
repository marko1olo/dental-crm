import type { ToothComplaint } from "../TelegramInteractiveToothPicker";

export type TelegramCabinetTab =
	| "teeth"
	| "appointments"
	| "imaging"
	| "tax"
	| "finance";

export interface PatientAppointment {
	readonly id: string;
	readonly dateStr: string; // "12 октября 2026"
	readonly timeStr: string; // "14:00"
	readonly doctorName: string;
	readonly doctorRole: string;
	readonly cabinet: string;
	readonly procedureTitle: string;
	readonly durationMinutes: number;
	readonly isConfirmed: boolean;
	readonly isPast: boolean;
	readonly costRub?: number | undefined;
	readonly cashbackEarned?: number | undefined;
	readonly toothNumber?: number | undefined;
}

export interface PatientImagingScan {
	readonly id: string;
	readonly title: string;
	readonly scanType: "rvg_2d" | "cbct_3d" | "optg_pano";
	readonly scanTypeLabel: string;
	readonly dateStr: string;
	readonly doctorName: string;
	readonly radiationDoseMsv: number;
	readonly doctorNotes: string;
	readonly targetTooth?: number | undefined;
	readonly diagnosisBadge: string;
	readonly markerCoords?: { x: number; y: number } | undefined;
}

export interface TelegramPatientPortalCabinetProps {
	readonly organizationId?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly initialTab?: TelegramCabinetTab;
	readonly initialTaxSheetOpen?: boolean;
	readonly onBack?: () => void;
}

export interface FamilyMember {
	readonly id: string;
	readonly name: string;
	readonly relation: string;
}

export const DEMO_FAMILY_MEMBERS: FamilyMember[] = [
	{ id: "self", name: "Александр (Я)", relation: "self" },
	{ id: "child-1", name: "Артём (Сын, 8 лет)", relation: "child" },
	{ id: "child-2", name: "София (Дочь, 12 лет)", relation: "child" },
];

export const DEMO_APPOINTMENTS: PatientAppointment[] = [
	{
		id: "app-upcoming-1",
		dateStr: "Четверг, 12 октября 2026",
		timeStr: "14:00",
		doctorName: "Д-р Смирнов Алексей Васильевич",
		doctorRole: "Терапевт-эндодонтист",
		cabinet: "Кабинет 3 (Терапия)",
		procedureTitle: "Лечение кариеса дентина зуба 16, реставрация",
		durationMinutes: 60,
		isConfirmed: false,
		isPast: false,
		toothNumber: 16,
	},
	{
		id: "app-upcoming-2",
		dateStr: "Понедельник, 19 октября 2026",
		timeStr: "16:30",
		doctorName: "Д-р Воронов Алексей Владимирович",
		doctorRole: "Хирург-имплантолог",
		cabinet: "Кабинет 1 (Хирургия)",
		procedureTitle: "Контрольный осмотр имплантата Straumann в обл. 36",
		durationMinutes: 30,
		isConfirmed: true,
		isPast: false,
		toothNumber: 36,
	},
	{
		id: "app-past-1",
		dateStr: "28 сентября 2026",
		timeStr: "11:00",
		doctorName: "Д-р Романова Елена Сергеевна",
		doctorRole: "Стоматолог-гигиенист",
		cabinet: "Кабинет 2 (Профилактика)",
		procedureTitle: "Комплексная профгигиена полости рта (AirFlow + УЗ)",
		durationMinutes: 45,
		isConfirmed: true,
		isPast: true,
		costRub: 6500,
		cashbackEarned: 325,
	},
	{
		id: "app-past-2",
		dateStr: "14 августа 2026",
		timeStr: "15:00",
		doctorName: "Д-р Смирнов Алексей Васильевич",
		doctorRole: "Терапевт-эндодонтист",
		cabinet: "Кабинет 3 (Терапия)",
		procedureTitle: "Прицельная RVG-визиография и эндодонтия зуба 26",
		durationMinutes: 90,
		isConfirmed: true,
		isPast: true,
		costRub: 18200,
		cashbackEarned: 910,
		toothNumber: 26,
	},
];

export const DEMO_IMAGING_SCANS: PatientImagingScan[] = [
	{
		id: "scan-rvg-16",
		title: "RVG снимок #16",
		scanType: "rvg_2d",
		scanTypeLabel: "Радиовизиография 2D",
		dateStr: "04 октября 2026",
		doctorName: "Д-р Смирнов А.В.",
		radiationDoseMsv: 0.002,
		doctorNotes: "Глубокая кариозная полость жевательно-медиальной поверхности дентина. Периапикальная щель без деструкции.",
		targetTooth: 16,
		diagnosisBadge: "Кариес дентина (K02.1)",
		markerCoords: { x: 54, y: 42 },
	},
	{
		id: "scan-cbct-3d",
		title: "3D КЛКТ сегмента #36",
		scanType: "cbct_3d",
		scanTypeLabel: "3D Томография КЛКТ",
		dateStr: "28 сентября 2026",
		doctorName: "Д-р Воронов А.В.",
		radiationDoseMsv: 0.024,
		doctorNotes: "Установлен имплантат Straumann BLT 4.1x10mm. Толщина кортикальной пластинки 2.2мм, остеоинтеграция стабильна.",
		targetTooth: 36,
		diagnosisBadge: "Контроль имплантации (Z96.5)",
		markerCoords: { x: 48, y: 58 },
	},
	{
		id: "scan-rvg-26",
		title: "RVG снимок #26",
		scanType: "rvg_2d",
		scanTypeLabel: "Радиовизиография 2D",
		dateStr: "14 августа 2026",
		doctorName: "Д-р Смирнов А.В.",
		radiationDoseMsv: 0.002,
		doctorNotes: "3 корневых канала обтурированы гуттаперчей до верхушки апекса. Патологических периапикальных изменений нет.",
		targetTooth: 26,
		diagnosisBadge: "Обтурация каналов (K04.0)",
		markerCoords: { x: 62, y: 48 },
	},
	{
		id: "scan-optg-pano",
		title: "ОПТГ панорама",
		scanType: "optg_pano",
		scanTypeLabel: "Панорамный снимок",
		dateStr: "10 июня 2026",
		doctorName: "Д-р Романова Е.С.",
		radiationDoseMsv: 0.015,
		doctorNotes: "Обзорный снимок обеих челюстей. ВНЧС без выраженной асимметрии, гайморовы пазухи пневматизированы.",
		diagnosisBadge: "Обзорный статус",
	},
];

export const DEMO_TOOTH_COMPLAINTS: ToothComplaint[] = [
	{
		toothNumber: 16,
		complaintType: "acute_throbbing",
		symptomLabel: "Острая пульсирующая боль",
		painLevel: 4,
		cito: true,
		notes: "Реакция на горячее и накусывание 2 дня",
	},
];
