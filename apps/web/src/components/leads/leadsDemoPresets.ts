/**
 * leadsDemoPresets.ts — Showcase Leads Presets for DENTE CRM.
 *
 * Governed by Mandate 18 (Honest Production & Demo-Only Mocks):
 * Used strictly when isDemoShowcaseMode() is active for visual validation,
 * Playwright mobile audits, and clinical walkthroughs.
 * Production remains 100% fail-closed and strictly real.
 */

import type { Lead } from "../../store/leadsStore";

export function getDemoShowcaseLeads(): Lead[] {
	const now = Date.now();
	return [
		{
			id: "lead-demo-1",
			name: "Иванова Екатерина Сергеевна",
			phone: "+7 (925) 501-23-45",
			source: "yandex_maps",
			status: "new",
			priority: "high",
			clinicalTags: ["Имплантация All-on-4", "Консультация хирурга"],
			notes: "Интересуется тотальной имплантацией All-on-4 на верхней челюсти. Нужен расчет стоимости и запись на КТ со снимком.",
			expectedRevenue: "280000",
			createdAt: new Date(now - 24 * 60 * 1000).toISOString(), // 24 mins ago -> SLA breached (>15m)
			audioRecordUrl: "/demo/audio/call-1.mp3",
			transcriptionSnippet:
				"«Здравствуйте, подскажите, сколько у вас стоит All-on-4 под ключ? Хотела бы попасть к хирургу на консультацию со снимком.»",
			audioDurationSeconds: 48,
		},
		{
			id: "lead-demo-2",
			name: "Смирнов Алексей Викторович",
			phone: "+7 (916) 412-88-99",
			source: "telegram",
			status: "new",
			priority: "urgent",
			clinicalTags: ["Острая боль", "Пульпит 36 зуба"],
			notes: "Острая ноющая боль с ночи, пульсирует, реакция на холодное/горячее. Просит ближайшее окно сегодня к терапевту.",
			expectedRevenue: "9500",
			createdAt: new Date(now - 4 * 60 * 1000).toISOString(), // 4 mins ago -> Fresh
			transcriptionSnippet:
				"«Здравствуйте! Очень болит зуб внизу слева, обезболивающее не помогает. Можно сегодня попасть к врачу?»",
		},
		{
			id: "lead-demo-3",
			name: "Ковалева Анна Дмитриевна",
			phone: "+7 (903) 777-12-34",
			source: "telephony",
			status: "new",
			priority: "normal",
			clinicalTags: ["Ортодонтия", "Элайнеры"],
			notes: "Консультация по исправлению прикуса. Спрашивает про элайнеры Spark/Eurokappa и 3D сканирование.",
			expectedRevenue: "195000",
			createdAt: new Date(now - 12 * 60 * 1000).toISOString(), // 12 mins ago -> Warning
			audioRecordUrl: "/demo/audio/call-2.mp3",
			transcriptionSnippet:
				"«Добрый день, хочу поставить элайнеры, сколько занимает диагностика и есть ли рассрочка от клиники?»",
			audioDurationSeconds: 62,
		},
		{
			id: "lead-demo-4",
			name: "Кузнецов Михаил Павлович",
			phone: "+7 (985) 640-33-21",
			source: "whatsapp",
			status: "contacted",
			priority: "high",
			clinicalTags: ["Коронки цирконий", "Ортопедия"],
			notes: "Квалифицирован куратором. Согласен на комплексную консультацию с ортопедом Орловым А.В. Выбирает между металлокерамикой и диоксидом циркония.",
			expectedRevenue: "145000",
			createdAt: new Date(now - 65 * 60 * 1000).toISOString(),
			stageEnteredAt: new Date(now - 40 * 60 * 1000).toISOString(),
			existingPatient: { id: "p-101", fullName: "Кузнецов Михаил Павлович" },
		},
		{
			id: "lead-demo-5",
			name: "Петрова Ольга Николаевна",
			phone: "+7 (926) 333-44-55",
			source: "site_seo",
			status: "contacted",
			priority: "normal",
			clinicalTags: ["Профгигиена AirFlow", "Отбеливание Zoom"],
			notes: "Записалась через форму на сайте на профгигиену и отбеливание. Просит удобное вечернее время в четверг.",
			expectedRevenue: "18000",
			createdAt: new Date(now - 120 * 60 * 1000).toISOString(),
			stageEnteredAt: new Date(now - 90 * 60 * 1000).toISOString(),
		},
		{
			id: "lead-demo-6",
			name: "Васильев Денис Игоревич",
			phone: "+7 (915) 222-33-44",
			source: "prodoctorov",
			status: "consult_booked",
			priority: "high",
			clinicalTags: ["Удаление 8 зуба", "Хирургия"],
			notes: "Записан на первичный осмотр к хирургу Громову К. Д. на завтра 15:30. Дистопированный восьмой зуб.",
			expectedRevenue: "12000",
			createdAt: new Date(now - 180 * 60 * 1000).toISOString(),
			stageEnteredAt: new Date(now - 120 * 60 * 1000).toISOString(),
		},
		{
			id: "lead-demo-7",
			name: "Морозов Артем Сергеевич",
			phone: "+7 (964) 555-66-77",
			source: "gis_2",
			status: "showed_up",
			priority: "normal",
			clinicalTags: ["Первичная консультация", "Терапия"],
			notes: "Пришёл в клинику вовремя, оформлен администратором Смирновой, на приёме у д-ра Соколова.",
			expectedRevenue: "4500",
			createdAt: new Date(now - 240 * 60 * 1000).toISOString(),
			stageEnteredAt: new Date(now - 30 * 60 * 1000).toISOString(),
		},
		{
			id: "lead-demo-8",
			name: "Белова Елена Юрьевна",
			phone: "+7 (905) 111-22-33",
			source: "telephony",
			status: "no_answer",
			priority: "normal",
			clinicalTags: ["Лечение кариеса"],
			notes: "Дважды не брала трубку при подтверждении. Отправлено автосообщение в WhatsApp.",
			expectedRevenue: "7000",
			createdAt: new Date(now - 300 * 60 * 1000).toISOString(),
			stageEnteredAt: new Date(now - 120 * 60 * 1000).toISOString(),
		},
		{
			id: "lead-demo-9",
			name: "Федоров Сергей Павлович",
			phone: "+7 (999) 888-77-66",
			source: "site_seo",
			status: "trash",
			dropReason: "Дорого",
			notes: "[Причина срыва]: Дорого. Хотел лечение под седацией за 20 000 руб.",
			expectedRevenue: "65000",
			createdAt: new Date(now - 360 * 60 * 1000).toISOString(),
			stageEnteredAt: new Date(now - 240 * 60 * 1000).toISOString(),
		},
	];
}
