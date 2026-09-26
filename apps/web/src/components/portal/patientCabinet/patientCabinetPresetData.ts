/**
 * Patient Personal Portal & SMS/OTP Cabinet Secondary Preset Profiles
 * (DOMAIN: PORTAL PATIENT CABINET - PRESET PROFILES: ELENA & DMITRY)
 *
 * Эталонные клинические сценарии и профили пациентов:
 * - Елена Сергеевна Миронова (эстетическая реабилитация, виниры E.max, все оплачено)
 * - Дмитрий Константинович Соколов (первичный пациент с острой болью, пульпит #4.6)
 */

import type { PatientPersonalCabinetData } from "./patientCabinetEngine";

// ============================================================================
// PROFILE 2: Елена Сергеевна Миронова (Эстетика, виниры E.max, все оплачено)
// ============================================================================

export const PATIENT_CABINET_PRESET_ELENA: PatientPersonalCabinetData = {
	patientId: "pat-9201",
	fullName: "Миронова Елена Сергеевна",
	phone: "+7 (911) 987-65-43",
	email: "elena.mironova@example.com",
	birthDate: "1992-11-28",
	cardNumber: "043-9201",
	curatingDoctor: "Д-р Кузнецова О. И. (Ортопед-эстетист)",
	loyaltyBonusBalance: 34200,
	loyaltyTierRu: "Платиновый VIP (15%)",
	cashbackEarnedRub: 51300,
	invoices: [
		{
			id: "inv-9201-01",
			invoiceNumber: "СЧ-2026/099",
			issueDateIso: "2026-08-15",
			dueDateIso: "2026-08-15",
			titleRu: "Тотальное преображение улыбки: 8 керамических виниров IPS e.max Press",
			totalAmountRub: 220000,
			paidAmountRub: 220000,
			remainingAmountRub: 0,
			status: "paid",
			paymentMethod: "sbp",
			paidAtIso: "2026-08-15T14:30:00Z",
			fiscalReceiptNumber: "ФД-993821",
			fiscalReceiptUrl: "https://receipt.nalog.ru/v1/check/inv-9201-01",
			items: [
				{
					code: "A16.07.003",
					titleRu: "Керамический винир IPS e.max Press (Bleach 2)",
					quantity: 8,
					priceRub: 27500,
					totalRub: 220000,
					toothFdi: "1.4-2.4",
				},
			],
		},
	],
	appointments: [
		{
			id: "apt-9201-1",
			dateIso: "2026-12-27",
			timeRu: "16:00",
			doctorId: "doc-lebedeva",
			doctorName: "Д-р Лебедева Елена Михайловна",
			doctorSpecialtyRu: "Гигиенист-пародонтолог",
			roomNumber: "Кабинет № 1 (Профгигиена)",
			clinicName: "DENTE Премиум на Невском",
			clinicAddressRu: "г. Санкт-Петербург, Невский пр-т, д. 140",
			titleRu: "Контрольный осмотр гигиены и полировка виниров пастой Prisma Gloss",
			status: "scheduled",
			priceRub: 0,
			reminderSent: true,
			reminderChannel: "push",
		},
	],
	treatmentPlans: [
		{
			id: "plan-9201-esthetic",
			planNumber: "ПЛАН-2026/088",
			titleRu: "Эстетическая реабилитация зоны улыбки 8 винирами E.max",
			curatingDoctor: "Д-р Кузнецова О. И.",
			createdAtIso: "2026-07-01",
			totalCostRub: 220000,
			paidCostRub: 220000,
			remainingDueRub: 0,
			progressPercent: 100,
			status: "completed",
			stages: [
				{
					id: "st-9201-1",
					orderIndex: 1,
					titleRu: "Digital Smile Design (DSD) & Mock-up",
					categoryRu: "Диагностика",
					teethFdi: ["1.4-2.4"],
					costRub: 20000,
					status: "completed",
					procedures: ["Интраоральное 3D сканирование Trios", "Эстетический Mock-up в полости рта"],
				},
				{
					id: "st-9201-2",
					orderIndex: 2,
					titleRu: "Адгезивная фиксация 8 виниров E.max",
					categoryRu: "Ортопедия",
					teethFdi: ["1.4-2.4"],
					costRub: 200000,
					status: "completed",
					procedures: ["Препарирование 0.3 мм", "Адгезивная фиксация на цемент Variolink Esthetic"],
				},
			],
		},
	],
	warranties: [
		{
			certificateId: "WAR-2026-9201-01",
			issueDateIso: "2026-08-15",
			expirationDateIso: "2029-08-15", // 3 года
			adjustedWarrantyMonths: 36,
			doctorName: "Д-р Кузнецова О. И.",
			status: "active",
			nextCheckupDueDateIso: "2026-09-05", // Через 14 дней (urgent)
			checkupIntervalMonths: 6,
			checkupScheduleCount: 6,
			verificationUrl: "https://dente-clinic.ru/portal/warranty?cert=WAR-2026-9201-01&card=043-9201",
			items: [
				{
					toothFdi: "1.4-2.4",
					workTitleRu: "Керамические виниры IPS e.max Press (8 единиц)",
					materialName: "Дисиликат лития IPS e.max Press",
					manufacturer: "Ivoclar Vivadent (Лихтенштейн)",
					vitaShade: "Bleach 2",
					lotNumber: "LOT #EMX-9821",
				},
			],
		},
	],
	consents: [
		{
			id: "c-elena-1",
			code: "ИДС-ОРТ-01",
			titleRu: "Информированное согласие на ортопедическое лечение керамическими винирами",
			categoryRu: "Ортопедия",
			statutoryBasis: "323-ФЗ",
			status: "signed",
			summaryTextRu: "Препарирование твердых тканей зубов под микроскопом и адгезивная фиксация виниров E.max.",
			fullTextContent: "Согласие на эстетическую реставрацию 8 зубов винирами E.max. Подписано через SMS/OTP.",
			signedAtIso: "2026-08-01T11:00:00Z",
			signatureAudit: {
				verificationMethod: "sms_otp",
				phone: "+7 (911) 987-65-43",
				smsOtpCode: "192834",
				integrityHash: "591823abce901283419023841029384019238401928340192834019283401928",
				timestamp: 1785582000000,
				signedAtIso: "2026-08-01T11:00:00Z",
				legalBasis: "63-ФЗ ПЭП",
			},
			pdfDownloadUrl: "/portal/documents/consent-ids-ort-01-pat9201.pdf",
		},
	],
};

// ============================================================================
// PROFILE 3: Дмитрий Константинович Соколов (Острая боль, первичный прием)
// ============================================================================

export const PATIENT_CABINET_PRESET_DMITRY: PatientPersonalCabinetData = {
	patientId: "pat-9914",
	fullName: "Соколов Дмитрий Константинович",
	phone: "+7 (903) 555-12-34",
	birthDate: "1978-03-22",
	cardNumber: "043-9914",
	curatingDoctor: "Д-р Кузнецова О. И. (Терапевт-эндодонтист)",
	loyaltyBonusBalance: 1500,
	loyaltyTierRu: "Базовый",
	cashbackEarnedRub: 1500,
	invoices: [
		{
			id: "inv-9914-01",
			invoiceNumber: "СЧ-2026/104",
			issueDateIso: "2026-08-22",
			dueDateIso: "2026-08-22",
			titleRu: "Неотложная помощь при остром пульпите зуба #4.6 и анестезия",
			totalAmountRub: 6500,
			paidAmountRub: 0,
			remainingAmountRub: 6500,
			status: "unpaid",
			items: [
				{
					code: "A16.07.030",
					titleRu: "Неотложное купирование острой боли: раскрытие полости зуба, наложение пасты",
					quantity: 1,
					priceRub: 4500,
					totalRub: 4500,
					toothFdi: "4.6",
				},
				{
					code: "B01.003.004",
					titleRu: "Проводниковая мандибулярная анестезия препаратом Убистезин Форте",
					quantity: 1,
					priceRub: 2000,
					totalRub: 2000,
				},
			],
		},
	],
	appointments: [
		{
			id: "apt-9914-1",
			dateIso: "2026-12-22",
			timeRu: "18:30",
			doctorId: "doc-kuznetsova",
			doctorName: "Д-р Кузнецова Ольга Игоревна",
			doctorSpecialtyRu: "Терапевт-эндодонтист",
			roomNumber: "Кабинет № 2",
			clinicName: "DENTE Премиум на Невском",
			clinicAddressRu: "г. Санкт-Петербург, Невский пр-т, д. 140",
			titleRu: "Неотложный прием по острой боли (пульпит зуба #4.6)",
			status: "confirmed",
			priceRub: 6500,
			reminderSent: true,
			reminderChannel: "sms",
		},
	],
	treatmentPlans: [
		{
			id: "plan-9914-endo",
			planNumber: "ПЛАН-2026/104",
			titleRu: "Эндодонтическое лечение пульпита #4.6 и реставрация коронкой",
			curatingDoctor: "Д-р Кузнецова О. И.",
			createdAtIso: "2026-08-22",
			totalCostRub: 38000,
			paidCostRub: 0,
			remainingDueRub: 38000,
			progressPercent: 0,
			status: "in_progress",
			stages: [
				{
					id: "st-9914-1",
					orderIndex: 1,
					titleRu: "Неотложная помощь и девитализация",
					categoryRu: "Терапия",
					teethFdi: ["4.6"],
					costRub: 6500,
					status: "in_progress",
					procedures: ["Купирование боли, временная повязка"],
				},
				{
					id: "st-9914-2",
					orderIndex: 2,
					titleRu: "Инструментация и пломбирование 3 каналов",
					categoryRu: "Терапия",
					teethFdi: ["4.6"],
					costRub: 16500,
					status: "planned",
					procedures: ["Пломбирование каналов горячей гуттаперчей"],
				},
				{
					id: "st-9914-3",
					orderIndex: 3,
					titleRu: "Покрытие зуба циркониевой коронкой",
					categoryRu: "Ортопедия",
					teethFdi: ["4.6"],
					costRub: 15000,
					status: "planned",
					procedures: ["Циркониевая коронка для предотвращения раскола зуба"],
				},
			],
		},
	],
	warranties: [],
	consents: [
		{
			id: "c-dmitry-1",
			code: "ИДС-ПЕРВ-01",
			titleRu: "Информированное добровольное согласие на медицинское вмешательство и анестезию",
			categoryRu: "Анестезия",
			statutoryBasis: "323-ФЗ",
			status: "pending_signature",
			diagnosisIcd: "K04.0 Острый пульпит зуба #4.6",
			toothNumbers: "4.6",
			summaryTextRu:
				"Согласие на первичный осмотр, рентгенодиагностику, проводниковую анестезию и механическую обработку полости зуба.",
			fullTextContent:
				"Я, Соколов Дмитрий Константинович, даю информированное добровольное согласие на проведение лечебно-диагностических мероприятий и местной анестезии в клинике DENTE. Предупрежден о возможных временных парестезиях и аллергических реакциях.",
		},
	],
};
