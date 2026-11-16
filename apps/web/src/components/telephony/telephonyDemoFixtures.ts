/**
 * apps/web/src/components/telephony/telephonyDemoFixtures.ts
 *
 * DENTE Dental CRM — Telephony Demo & Showcase Call Fixtures.
 * Isolated synthetic demo call dataset strictly for showcase & test environments (Mandate 8wy).
 */

import type { TelephonyCatalogCall } from "./telephonyCatalogData";

export const TELEPHONY_DEMO_CALLS: TelephonyCatalogCall[] = [
	{
		id: "call-rec-001",
		callType: "incoming_answered",
		phone: "+7 (999) 123-45-67",
		callerName: "Иванов Сергей Павлович",
		patientId: "pat-ivanov-01",
		patientCategory: "Постоянный",
		balanceRub: 0,
		lastVisitDate: "14.10.2026",
		attendingDoctor: "Смирнова А.В.",
		clinicalNote: "Терапия: зуб 36 кариес дентина, плановый осмотр",
		somaticAlert: null,
		durationSeconds: 165,
		timestampText: "Сегодня, 10:42",
		hasRecording: false,
		recordingUrl: undefined,
		transcriptSnippet: "Пациент уточняет время контрольного осмотра после лечения пульпита зуба 36.",
	},
	{
		id: "call-rec-002",
		callType: "incoming_missed",
		phone: "+7 (916) 555-43-21",
		callerName: "Ковалева Елена Викторовна",
		patientId: "pat-kovaleva-02",
		patientCategory: "Первичный",
		balanceRub: 0,
		lastVisitDate: null,
		attendingDoctor: null,
		clinicalNote: "Острая ноющая боль в области зуба 46, реакция на холодное",
		somaticAlert: "Аллергия на лидокаин",
		durationSeconds: 0,
		timestampText: "Сегодня, 09:15",
		hasRecording: false,
		transcriptSnippet: "Звонок не принят. Требуется обратный звонок в течение 15 минут.",
	},
	{
		id: "call-rec-003",
		callType: "outgoing_success",
		phone: "+7 (903) 777-88-99",
		callerName: "Смирнов Дмитрий Александрович",
		patientId: "pat-smirnov-03",
		patientCategory: "VIP",
		balanceRub: 15000,
		lastVisitDate: "20.10.2026",
		attendingDoctor: "Попов И.С.",
		clinicalNote: "Ортопедия: примерка каркаса коронки из диоксида циркония",
		somaticAlert: null,
		durationSeconds: 75,
		timestampText: "Вчера, 16:30",
		hasRecording: false,
		recordingUrl: undefined,
		transcriptSnippet: "Администратор подтвердил готовность ортопедической конструкции из лаборатории.",
	},
	{
		id: "call-rec-004",
		callType: "incoming_answered",
		phone: "+7 (925) 111-22-33",
		callerName: "Михайлова Анна Сергеевна",
		patientId: "pat-mikhailova-04",
		patientCategory: "Долг",
		balanceRub: -2500,
		lastVisitDate: "05.10.2026",
		attendingDoctor: "Васильев К.Н.",
		clinicalNote: "Ортодонтия: коррекция дуги брекет-системы",
		somaticAlert: null,
		durationSeconds: 200,
		timestampText: "Вчера, 14:10",
		hasRecording: false,
		recordingUrl: undefined,
		transcriptSnippet: "Запись на плановую замену эластических лигатур на верхней челюсти.",
	},
	{
		id: "call-rec-005",
		callType: "incoming_missed",
		phone: "+7 (985) 000-11-22",
		callerName: "Неизвестный номер",
		patientId: null,
		patientCategory: "Первичный",
		balanceRub: 0,
		lastVisitDate: null,
		attendingDoctor: null,
		clinicalNote: "Новое обращение по рекламе (Яндекс Карты)",
		somaticAlert: null,
		durationSeconds: 0,
		timestampText: "Вчера, 11:05",
		hasRecording: false,
		transcriptSnippet: "Входящий вызов с рекламного подменного номера клиники.",
	},
];

/**
 * Backward compatibility alias for demo calls fixture catalog.
 */
export const TELEPHONY_CATALOG_DATA = TELEPHONY_DEMO_CALLS;
