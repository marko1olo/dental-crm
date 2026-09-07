import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import {
	PRIORITY_CONFIG,
	TREATMENT_CATEGORIES,
	type TargetSlotInfo,
	type WaitlistPatientEntry,
	WaitlistQuickFillModal,
	calculateMatchScore,
	generateWhatsAppOfferMessage,
} from "../WaitlistQuickFillModal";

// biome-ignore lint/suspicious/noExplicitAny: mock AppLogic value for isolated unit testing
const mockAppLogicValue: any = {
	dashboard: {
		clinicSettings: {
			name: "Стоматология DENTE",
			staff: [{ id: "doc-1", fullName: "Д-р Ковалев", role: "doctor" }],
		},
		patients: [{ id: "p-1", fullName: "Сергей Иванов", phone: "+79001234567" }],
	},
	auth: {
		denteClinicalReadHeaders: () => ({}),
	},
};

describe("WaitlistQuickFillModal Match Scoring Engine", () => {
	const basePatient: WaitlistPatientEntry = {
		id: "patient-1",
		patientId: "pid-1",
		patientName: "Иванов Иван Иванович",
		patientPhone: "+7 (999) 111-22-33",
		preferredDoctorId: "doc-1",
		preferredDoctorName: "Д-р Смирнов А.В.",
		priorityLevel: "urgent",
		treatmentCategory: "Терапия",
		preferredDays: ["weekdays"],
		preferredTimeOfDay: ["morning"],
		notes: "Острая боль в зубе 4.6",
		status: "active",
		createdAt: new Date().toISOString(),
	};

	const baseSlot: TargetSlotInfo = {
		appointmentId: "slot-1",
		startsAt: "2026-08-19T09:00:00.000Z", // Wednesday 09:00 (Morning, Weekday)
		endsAt: "2026-08-19T10:00:00.000Z",
		doctorUserId: "doc-1",
		doctorName: "Д-р Смирнов А.В.",
		treatmentCategory: "Терапия",
		freedBecause: "приём отменён",
	};

	it("calculates top score for perfect match (doctor, weekday, morning, therapy, acute pain)", () => {
		const match = calculateMatchScore(basePatient, baseSlot);
		assert.ok(
			match.score >= 80,
			`Expected high match score >= 80, got ${match.score}`,
		);
		assert.equal(match.rating, "excellent");
		assert.equal(match.sameDoctor, true);
		assert.equal(match.dayFits, true);
		assert.equal(match.timeFits, true);
		assert.equal(match.categoryFits, true);
		assert.ok(
			match.matchReasons.some((r) => r.includes("Желаемый врач")),
			"Should contain doctor match reason",
		);
		assert.ok(
			match.matchReasons.some((r) => r.includes("время")),
			"Should contain time match reason",
		);
		assert.ok(
			match.matchReasons.some((r) => r.includes("Острая боль")),
			"Should contain acute pain reason",
		);
	});

	it("penalizes doctor mismatch when patient requested a specific doctor", () => {
		const patientDifferentDoc: WaitlistPatientEntry = {
			...basePatient,
			preferredDoctorId: "doc-other",
		};
		const match = calculateMatchScore(patientDifferentDoc, baseSlot);
		assert.equal(match.sameDoctor, false);
		assert.ok(
			match.mismatchReasons.some((m) => m.includes("другого специалиста")),
			"Should report doctor mismatch",
		);
	});

	it("rewards patient willing to see any doctor", () => {
		const patientAnyDoc: WaitlistPatientEntry = {
			...basePatient,
			preferredDoctorId: null,
		};
		const match = calculateMatchScore(patientAnyDoc, baseSlot);
		assert.equal(match.sameDoctor, true);
		assert.ok(
			match.matchReasons.some((r) => r.includes("любого врача")),
			"Should mention any doctor match",
		);
	});

	it("evaluates day of week preferences (weekdays vs weekend)", () => {
		// Saturday slot: 2026-08-22
		const weekendSlot: TargetSlotInfo = {
			...baseSlot,
			startsAt: "2026-08-22T10:00:00.000Z", // Saturday
			endsAt: "2026-08-22T11:00:00.000Z",
		};

		const patientWantsWeekdays: WaitlistPatientEntry = {
			...basePatient,
			preferredDays: ["weekdays"],
		};
		const matchWeekdays = calculateMatchScore(
			patientWantsWeekdays,
			weekendSlot,
		);
		assert.equal(matchWeekdays.dayFits, false);
		assert.ok(
			matchWeekdays.mismatchReasons.some((m) => m.includes("будни")),
			"Should note patient preferred weekdays",
		);

		const patientWantsWeekend: WaitlistPatientEntry = {
			...basePatient,
			preferredDays: ["weekend"],
		};
		const matchWeekend = calculateMatchScore(patientWantsWeekend, weekendSlot);
		assert.equal(matchWeekend.dayFits, true);
		assert.ok(
			matchWeekend.matchReasons.some((r) => r.includes("выходной")),
			"Should match weekend",
		);
	});

	it("evaluates time of day preferences (morning, day, evening)", () => {
		// Evening slot: 18:00
		const eveningSlot: TargetSlotInfo = {
			...baseSlot,
			startsAt: "2026-08-19T18:00:00.000Z",
			endsAt: "2026-08-19T19:00:00.000Z",
		};

		const morningOnlyPatient: WaitlistPatientEntry = {
			...basePatient,
			preferredTimeOfDay: ["morning"],
		};
		const eveningPatient: WaitlistPatientEntry = {
			...basePatient,
			preferredTimeOfDay: ["evening"],
		};

		const matchMorning = calculateMatchScore(
			morningOnlyPatient,
			eveningSlot,
		);
		assert.equal(matchMorning.timeFits, false);

		const matchEvening = calculateMatchScore(eveningPatient, eveningSlot);
		assert.equal(matchEvening.timeFits, true);
		assert.ok(
			matchEvening.matchReasons.some((r) => r.includes("Вечер")),
			"Should match evening time",
		);
	});

	it("correctly ranks priorities: Acute Pain > Active Treatment Plan > VIP > Routine", () => {
		assert.ok((PRIORITY_CONFIG.urgent?.weight ?? 0) > (PRIORITY_CONFIG.treatment_plan?.weight ?? 0));
		assert.ok((PRIORITY_CONFIG.treatment_plan?.weight ?? 0) > (PRIORITY_CONFIG.vip?.weight ?? 0));
		assert.ok((PRIORITY_CONFIG.vip?.weight ?? 0) > (PRIORITY_CONFIG.routine?.weight ?? 0));

		const acutePatient: WaitlistPatientEntry = {
			...basePatient,
			priorityLevel: "urgent",
		};
		const planPatient: WaitlistPatientEntry = {
			...basePatient,
			priorityLevel: "treatment_plan",
		};
		const vipPatient: WaitlistPatientEntry = {
			...basePatient,
			priorityLevel: "vip",
		};
		const routinePatient: WaitlistPatientEntry = {
			...basePatient,
			priorityLevel: "routine",
		};

		const matchAcute = calculateMatchScore(acutePatient, baseSlot);
		const matchPlan = calculateMatchScore(planPatient, baseSlot);
		const matchVip = calculateMatchScore(vipPatient, baseSlot);
		const matchRoutine = calculateMatchScore(routinePatient, baseSlot);

		assert.ok(matchAcute.priorityRank > matchPlan.priorityRank);
		assert.ok(matchPlan.priorityRank > matchVip.priorityRank);
		assert.ok(matchVip.priorityRank > matchRoutine.priorityRank);
	});
});

describe("generateWhatsAppOfferMessage Helper", () => {
	it("generates personalized slot offer text with patient name, doctor, date and time", () => {
		const message = generateWhatsAppOfferMessage({
			patientName: "Анна Петрова",
			doctorName: "Д-р Сидоров В.В.",
			slotStartsAt: "2026-08-19T14:30:00.000Z",
			clinicName: "Клиника DENTE",
		});

		assert.ok(
			message.includes("Анна Петрова"),
			"Contains patient full name",
		);
		assert.ok(
			message.includes("Д-р Сидоров В.В."),
			"Contains doctor name",
		);
		assert.ok(
			message.includes("Клиника DENTE"),
			"Contains clinic name",
		);
		assert.ok(
			message.includes("освободилось окно"),
			"Contains offer explanation",
		);
		assert.ok(
			message.includes("Ответьте ДА или позвоните"),
			"Contains clear call to action",
		);
	});
});

describe("WaitlistQuickFillModal Component Rendering", () => {
	it("returns null when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(
				AppLogicProvider,
				{
					value: mockAppLogicValue,
					children: createElement(WaitlistQuickFillModal, {
						isOpen: false,
						onClose: () => {},
					}),
				},
			),
		);
		assert.equal(html, "");
	});

	it("renders modal structure with header and tabs when isOpen is true", () => {
		const html = renderToStaticMarkup(
			createElement(
				AppLogicProvider,
				{
					value: mockAppLogicValue,
					children: createElement(WaitlistQuickFillModal, {
						isOpen: true,
						onClose: () => {},
						targetSlot: {
							appointmentId: "slot-99",
							startsAt: "2026-08-19T15:00:00.000Z",
							endsAt: "2026-08-19T16:00:00.000Z",
							doctorName: "Д-р Ковалев",
							freedBecause: "отмена записи",
						},
						dashboard: {
							clinicSettings: {
								name: "Стоматология DENTE",
								staff: [
									{ id: "doc-1", fullName: "Д-р Ковалев", role: "doctor" },
								],
							},
							patients: [
								{ id: "p-1", fullName: "Сергей Иванов", phone: "+79001234567" },
							],
						},
					}),
				},
			),
		);

		assert.ok(
			html.includes("Лист ожидания и быстрая запись"),
			"Renders modal title",
		);
		assert.ok(
			html.includes("Освободившееся окно для записи"),
			"Renders target slot banner",
		);
		assert.ok(
			html.includes("Д-р Ковалев"),
			"Renders doctor name",
		);
		assert.ok(
			html.includes("Подбор на окно"),
			"Renders Match tab button",
		);
		assert.ok(
			html.includes("Все в очереди"),
			"Renders All waitlist tab button",
		);
		assert.ok(
			html.includes("Добавить пациента"),
			"Renders Add patient tab button",
		);
	});

	it("includes all treatment categories in the configuration", () => {
		assert.ok(TREATMENT_CATEGORIES.length >= 7);
		assert.ok(TREATMENT_CATEGORIES.some((c) => c.includes("Терапия")));
		assert.ok(TREATMENT_CATEGORIES.some((c) => c.includes("Хирургия")));
		assert.ok(TREATMENT_CATEGORIES.some((c) => c.includes("Ортопедия")));
		assert.ok(TREATMENT_CATEGORIES.some((c) => c.includes("Ортодонтия")));
	});
});
