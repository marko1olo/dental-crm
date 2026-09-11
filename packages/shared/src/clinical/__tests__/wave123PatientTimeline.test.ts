/**
 * wave123PatientTimeline.test.ts
 * Unit tests for Patient Timeline Aggregation Engine (DentalPin Adaptation — Wave 123)
 *
 * Covers:
 * 1. Resilient event creation with Mandate 8e defaults (Doctor Autonomy).
 * 2. Filtering by categories (clinical, financial, administrative, imaging, lab, communication).
 * 3. Text search (case-insensitive across title, description, actorName) and date range filtering.
 * 4. Pagination mechanics (page, pageSize, hasMore, out-of-bounds safety, descending date sort).
 * 5. Calculation of facet categoryCounts across all 6 categories.
 * 6. Printable A4 summary generation: strictly 0 emojis (Mandate 8d item 7).
 * 7. Immunity to null, undefined, corrupt, or partial data.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type PatientTimelineEvent,
	type TimelineCategory,
	type TimelineFilter,
	CLINICAL_TIMELINE_CATEGORIES,
	PATIENT_TIMELINE_EVENT_TYPES,
	TIMELINE_CATEGORY_LABELS_RU,
	createTimelineEvent,
	filterAndPaginateTimeline,
	formatTimelineA4Summary,
	isTimelineCategory,
} from "../patientTimelineEngine.js";
import {
	createTimelineEvent as createTimelineEventFromIndex,
	filterAndPaginateTimeline as filterAndPaginateTimelineFromIndex,
	formatTimelineA4Summary as formatTimelineA4SummaryFromIndex,
} from "../index.js";

// ─────────────────────────────────────────────────────────────────────────────
// TEST DATA GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

function createMockEvent(overrides: Partial<PatientTimelineEvent> = {}): PatientTimelineEvent {
	return createTimelineEvent({
		patientId: "pat-001",
		clinicId: "clinic-main",
		category: "clinical",
		eventType: PATIENT_TIMELINE_EVENT_TYPES.TREATMENT_PERFORMED,
		title: "Лечение кариеса зуба 16",
		description: "Препарирование полости, изоляция коффердамом, нанокомпозит Filtek",
		occurredAt: "2026-09-10T10:00:00.000Z",
		actorId: "doc-101",
		actorName: "Барабаш С.В.",
		actorRole: "Врач-стоматолог-терапевт",
		sourceTable: "treatments",
		sourceId: "treat-1001",
		isCritical: false,
		tags: ["терапия", "кариес", "зуб-16"],
		...overrides,
	});
}

function createSampleEventCollection(): PatientTimelineEvent[] {
	return [
		createMockEvent({
			id: "evt-001",
			category: "clinical",
			eventType: PATIENT_TIMELINE_EVENT_TYPES.TREATMENT_PERFORMED,
			title: "Лечение пульпита зуба 24",
			description: "Механическая и медикаментозная обработка 2 корневых каналов",
			occurredAt: "2026-09-01T09:00:00.000Z",
			actorName: "Барабаш С.В.",
			isCritical: false,
		}),
		createMockEvent({
			id: "evt-002",
			category: "financial",
			eventType: PATIENT_TIMELINE_EVENT_TYPES.INVOICE_PAID,
			title: "Оплата счета № 452",
			description: "Оплата услуг терапии картой через терминал 54-ФЗ",
			occurredAt: "2026-09-01T10:15:00.000Z",
			actorName: "Смирнова Е.А.",
			actorRole: "Администратор",
			isCritical: false,
		}),
		createMockEvent({
			id: "evt-003",
			category: "imaging",
			eventType: PATIENT_TIMELINE_EVENT_TYPES.IMAGING_UPLOADED,
			title: "Прицельная радиовизиография зуба 24",
			description: "Контроль обтурации апекса зуба 24. Выход гуттаперчи за верхушку отсутствует",
			occurredAt: "2026-09-03T11:30:00.000Z",
			actorName: "Барабаш С.В.",
			isCritical: false,
		}),
		createMockEvent({
			id: "evt-004",
			category: "lab",
			eventType: PATIENT_TIMELINE_EVENT_TYPES.LAB_ORDER_SENT,
			title: "Наряд в ЗТЛ: Коронка из диоксида циркония на зуб 24",
			description: "Цвет A2 по шкале VITA, анатомическая форма, уступ Chamfer 0.8 мм",
			occurredAt: "2026-09-05T14:00:00.000Z",
			actorName: "Кузнецов И.П.",
			actorRole: "Врач-стоматолог-ортопед",
			isCritical: false,
		}),
		createMockEvent({
			id: "evt-005",
			category: "communication",
			eventType: PATIENT_TIMELINE_EVENT_TYPES.COMMUNICATION_SENT,
			title: "WhatsApp-уведомление о визите на примерку коронки",
			description: "Пациент подтвердил приём на 12.09.2026 15:00",
			occurredAt: "2026-09-08T16:45:00.000Z",
			actorName: "Смирнова Е.А.",
			isCritical: false,
		}),
		createMockEvent({
			id: "evt-006",
			category: "administrative",
			eventType: PATIENT_TIMELINE_EVENT_TYPES.APPOINTMENT_SCHEDULED,
			title: "Запись на плановый профилактический осмотр",
			description: "Кресло № 2, кабинет терапевтической стоматологии",
			occurredAt: "2026-09-09T08:30:00.000Z",
			actorName: "Смирнова Е.А.",
			isCritical: false,
		}),
		createMockEvent({
			id: "evt-007",
			category: "clinical",
			eventType: "allergy.alert",
			title: "Острая аллергическая реакция на антибиотики пенициллинового ряда",
			description: "Анамнез отягощен: отек Квинке в 2021 г. Запрещено применение амоксициллина/амоксиклава!",
			occurredAt: "2026-09-10T12:00:00.000Z",
			actorName: "Барабаш С.В.",
			isCritical: true,
		}),
	];
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

describe("Wave 123: Patient Timeline Engine (DentalPin Adaptation)", () => {
	// ── 1. Barrel Index Verification ──────────────────────────────────────────
	it("re-exports all core engine functions from packages/shared/src/clinical/index.ts", () => {
		assert.strictEqual(typeof createTimelineEventFromIndex, "function");
		assert.strictEqual(typeof filterAndPaginateTimelineFromIndex, "function");
		assert.strictEqual(typeof formatTimelineA4SummaryFromIndex, "function");
	});

	// ── 2. Event Creation & Mandate 8e Defaults ──────────────────────────────
	describe("createTimelineEvent (Mandate 8e Doctor Autonomy)", () => {
		it("generates UUID v4 and ISO timestamp when not supplied", () => {
			const event = createTimelineEvent({
				patientId: "pat-123",
				category: "clinical",
				eventType: "visit.completed",
				title: "Завершение осмотра",
				sourceTable: "appointments",
				sourceId: "app-123",
			});

			assert.ok(event.id);
			assert.match(event.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
			assert.ok(event.occurredAt);
			assert.ok(!Number.isNaN(new Date(event.occurredAt).getTime()));
			assert.strictEqual(event.patientId, "pat-123");
			assert.strictEqual(event.category, "clinical");
			assert.strictEqual(event.isCritical, false);
			assert.deepStrictEqual(event.tags, []);
		});

		it("preserves explicit ID and occurredAt timestamp", () => {
			const explicitId = "custom-uuid-1111-2222-3333";
			const explicitTime = "2026-05-15T08:30:00.000Z";
			const event = createTimelineEvent({
				id: explicitId,
				occurredAt: explicitTime,
				patientId: "pat-456",
				category: "financial",
				eventType: "payment.cash",
				title: "Наличная оплата 5000 руб",
				sourceTable: "payments",
				sourceId: "pay-789",
				isCritical: false,
			});

			assert.strictEqual(event.id, explicitId);
			assert.strictEqual(event.occurredAt, explicitTime);
		});

		it("throws descriptive error when patientId is missing or empty", () => {
			assert.throws(
				() =>
					createTimelineEvent({
						patientId: "",
						category: "clinical",
						eventType: "visit",
						title: "Без пациента",
						sourceTable: "visits",
						sourceId: "v-1",
					}),
				/PatientTimelineEvent requires a valid patientId/,
			);
		});

		it("falls back to 'clinical' category if an unknown category string is passed", () => {
			const event = createTimelineEvent({
				patientId: "pat-999",
				category: "unknown_future_category" as TimelineCategory,
				eventType: "custom.event",
				title: "Тестовое событие",
				sourceTable: "tests",
				sourceId: "t-1",
			});
			assert.strictEqual(event.category, "clinical");
		});

		it("sanitizes tags array and handles empty or non-array tags gracefully", () => {
			const event = createTimelineEvent({
				patientId: "pat-001",
				category: "lab",
				eventType: "lab.status",
				title: "Приемка слепка",
				sourceTable: "labs",
				sourceId: "lab-1",
				tags: ["ортопедия", null as unknown as string, "слепок", 123 as unknown as string],
			});
			assert.deepStrictEqual(event.tags, ["ортопедия", "слепок"]);
		});
	});

	// ── 3. Category Filtering ─────────────────────────────────────────────────
	describe("Category Filtering", () => {
		const events = createSampleEventCollection();

		it("filters by a single category ('clinical')", () => {
			const result = filterAndPaginateTimeline(events, { categories: ["clinical"] });
			assert.strictEqual(result.total, 2);
			assert.ok(result.entries.every((e) => e.category === "clinical"));
		});

		it("filters by multiple categories ('financial' and 'imaging')", () => {
			const result = filterAndPaginateTimeline(events, { categories: ["financial", "imaging"] });
			assert.strictEqual(result.total, 2);
			const categories = new Set(result.entries.map((e) => e.category));
			assert.strictEqual(categories.has("financial"), true);
			assert.strictEqual(categories.has("imaging"), true);
			assert.strictEqual(categories.has("clinical"), false);
		});

		it("returns all events when categories filter is omitted or empty", () => {
			const resultWithUndefined = filterAndPaginateTimeline(events, {});
			assert.strictEqual(resultWithUndefined.total, 7);

			const resultWithEmpty = filterAndPaginateTimeline(events, { categories: [] });
			assert.strictEqual(resultWithEmpty.total, 7);
		});

		it("supports all 6 canonical categories in CLINICAL_TIMELINE_CATEGORIES", () => {
			assert.strictEqual(CLINICAL_TIMELINE_CATEGORIES.length, 6);
			for (const cat of CLINICAL_TIMELINE_CATEGORIES) {
				assert.ok(TIMELINE_CATEGORY_LABELS_RU[cat]);
				const result = filterAndPaginateTimeline(events, { categories: [cat] });
				assert.ok(result.total >= 1);
				assert.strictEqual(isTimelineCategory(cat), true);
			}
			assert.strictEqual(isTimelineCategory("invalid_category"), false);
			assert.strictEqual(isTimelineCategory(null), false);
			assert.strictEqual(isTimelineCategory(123), false);
		});
	});

	// ── 4. Text Search & Date Ranges ──────────────────────────────────────────
	describe("Text Search and Date Ranges", () => {
		const events = createSampleEventCollection();

		it("performs case-insensitive substring search in title", () => {
			const result = filterAndPaginateTimeline(events, { search: "пульпита" });
			assert.strictEqual(result.total, 1);
			assert.strictEqual(result.entries[0]?.id, "evt-001");
		});

		it("performs case-insensitive substring search in description", () => {
			const result = filterAndPaginateTimeline(events, { search: "chamfer" });
			assert.strictEqual(result.total, 1);
			assert.strictEqual(result.entries[0]?.id, "evt-004");
		});

		it("performs case-insensitive substring search in actorName", () => {
			const result = filterAndPaginateTimeline(events, { search: "смирнова" });
			assert.strictEqual(result.total, 3);
			assert.ok(result.entries.every((e) => e.actorName === "Смирнова Е.А."));
		});

		it("trims whitespace in search query and returns empty array on no matches", () => {
			const result = filterAndPaginateTimeline(events, { search: "   несуществующий запрос   " });
			assert.strictEqual(result.total, 0);
			assert.strictEqual(result.entries.length, 0);
		});

		it("filters by startDate (inclusive)", () => {
			// Events from 2026-09-05 onwards: evt-004 (Sep 5), evt-005 (Sep 8), evt-006 (Sep 9), evt-007 (Sep 10)
			const result = filterAndPaginateTimeline(events, { startDate: "2026-09-05T00:00:00.000Z" });
			assert.strictEqual(result.total, 4);
		});

		it("filters by endDate (inclusive)", () => {
			// Events up to 2026-09-03: evt-001 (Sep 1), evt-002 (Sep 1), evt-003 (Sep 3)
			const result = filterAndPaginateTimeline(events, { endDate: "2026-09-03T23:59:59.999Z" });
			assert.strictEqual(result.total, 3);
		});

		it("filters by both startDate and endDate range", () => {
			// Between Sep 2 and Sep 6: evt-003 (Sep 3), evt-004 (Sep 5)
			const result = filterAndPaginateTimeline(events, {
				startDate: "2026-09-02T00:00:00.000Z",
				endDate: "2026-09-06T00:00:00.000Z",
			});
			assert.strictEqual(result.total, 2);
		});

		it("filters by isCriticalOnly", () => {
			const result = filterAndPaginateTimeline(events, { isCriticalOnly: true });
			assert.strictEqual(result.total, 1);
			assert.strictEqual(result.entries[0]?.id, "evt-007");
			assert.strictEqual(result.entries[0]?.isCritical, true);
		});

		it("combines search, date range, and isCriticalOnly simultaneously", () => {
			const result = filterAndPaginateTimeline(events, {
				search: "аллергическая",
				startDate: "2026-09-01T00:00:00.000Z",
				endDate: "2026-09-15T00:00:00.000Z",
				isCriticalOnly: true,
			});
			assert.strictEqual(result.total, 1);
			assert.strictEqual(result.entries[0]?.id, "evt-007");
		});
	});

	// ── 5. Pagination & Sorting ───────────────────────────────────────────────
	describe("Pagination and Chronological Sorting", () => {
		const events = createSampleEventCollection();

		it("sorts entries occurredAt descending (newest first)", () => {
			const result = filterAndPaginateTimeline(events);
			assert.strictEqual(result.total, 7);

			for (let i = 0; i < result.entries.length - 1; i++) {
				const current = new Date(result.entries[i]!.occurredAt).getTime();
				const next = new Date(result.entries[i + 1]!.occurredAt).getTime();
				assert.ok(current >= next, `Event ${i} must be newer than event ${i + 1}`);
			}
			assert.strictEqual(result.entries[0]?.id, "evt-007"); // Sep 10
			assert.strictEqual(result.entries[result.entries.length - 1]?.id, "evt-001"); // Sep 1 09:00
		});

		it("paginates cleanly with page, pageSize, and hasMore flags", () => {
			// Total 7 items, page size 3 -> 3 pages: 3 + 3 + 1
			const page1 = filterAndPaginateTimeline(events, { page: 1, pageSize: 3 });
			assert.strictEqual(page1.entries.length, 3);
			assert.strictEqual(page1.total, 7);
			assert.strictEqual(page1.page, 1);
			assert.strictEqual(page1.pageSize, 3);
			assert.strictEqual(page1.hasMore, true);

			const page2 = filterAndPaginateTimeline(events, { page: 2, pageSize: 3 });
			assert.strictEqual(page2.entries.length, 3);
			assert.strictEqual(page2.hasMore, true);

			const page3 = filterAndPaginateTimeline(events, { page: 3, pageSize: 3 });
			assert.strictEqual(page3.entries.length, 1);
			assert.strictEqual(page3.hasMore, false);

			const page4 = filterAndPaginateTimeline(events, { page: 4, pageSize: 3 });
			assert.strictEqual(page4.entries.length, 0);
			assert.strictEqual(page4.hasMore, false);
		});

		it("handles negative, zero, and fractional pagination parameters safely", () => {
			const resultNeg = filterAndPaginateTimeline(events, { page: -2, pageSize: -10 });
			assert.strictEqual(resultNeg.page, 1);
			assert.strictEqual(resultNeg.pageSize, 20); // clamps safely to default

			const resultFloat = filterAndPaginateTimeline(events, { page: 2.7, pageSize: 3.9 });
			assert.strictEqual(resultFloat.page, 2);
			assert.strictEqual(resultFloat.pageSize, 3);
		});
	});

	// ── 6. Category Facet Counts ──────────────────────────────────────────────
	describe("Category Counts (Facets)", () => {
		const events = createSampleEventCollection();

		it("calculates accurate counts for all 6 categories across full event set", () => {
			const result = filterAndPaginateTimeline(events, {});
			assert.deepStrictEqual(result.categoryCounts, {
				clinical: 2,
				financial: 1,
				administrative: 1,
				imaging: 1,
				lab: 1,
				communication: 1,
			});
		});

		it("calculates category counts matching search filter so tab badges stay informative", () => {
			// Search for "Смирнова" (present in 1 financial, 1 administrative, 1 communication)
			const result = filterAndPaginateTimeline(events, { search: "Смирнова" });
			assert.strictEqual(result.categoryCounts.financial, 1);
			assert.strictEqual(result.categoryCounts.administrative, 1);
			assert.strictEqual(result.categoryCounts.communication, 1);
			assert.strictEqual(result.categoryCounts.clinical, 0);
			assert.strictEqual(result.categoryCounts.imaging, 0);
			assert.strictEqual(result.categoryCounts.lab, 0);
		});

		it("initializes all category counts to zero for empty collections", () => {
			const result = filterAndPaginateTimeline([], {});
			assert.deepStrictEqual(result.categoryCounts, {
				clinical: 0,
				financial: 0,
				administrative: 0,
				imaging: 0,
				lab: 0,
				communication: 0,
			});
		});
	});

	// ── 7. Printable A4 Summary Generation (Strictly 0 Emojis) ────────────────
	describe("formatTimelineA4Summary (Mandate 8d item 7: Strict 0 Emojis)", () => {
		const events = createSampleEventCollection();

		it("generates structured A4 summary with zero emojis", () => {
			const summary = formatTimelineA4Summary(events, "Иванов Иван Иванович", "15.04.1985");

			// Rigorous multi-range unicode emoji inspection
			const extendedPictographicRegex = /\p{Extended_Pictographic}/u;
			const standardEmojiRegex =
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

			assert.strictEqual(
				extendedPictographicRegex.test(summary),
				false,
				"A4 summary must not contain extended pictographic emojis",
			);
			assert.strictEqual(
				standardEmojiRegex.test(summary),
				false,
				"A4 summary must not contain standard unicode emojis",
			);

			// Required Russian medical discharge structure
			assert.match(summary, /ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА \(ФОРМА 043\/У\)/);
			assert.match(summary, /Пациент: Иванов Иван Иванович/);
			assert.match(summary, /Дата рождения: 15\.04\.1985/);
			assert.match(summary, /Всего записей в хронологии: 7/);
			assert.match(summary, /\[КЛИНИКА\] Лечение пульпита/);
			assert.match(summary, /\[КРИТИЧЕСКИЙ СТАТУС \/ ВАЖНО\]/);
			assert.match(summary, /Подпись лечащего врача/);
			assert.match(summary, /М\.П\. \(Место печати медицинской организации\)/);
		});

		it("handles empty event list cleanly without crashing", () => {
			const summary = formatTimelineA4Summary([], "Петров Петр Петрович");
			assert.match(summary, /Записи в хронологическом реестре пациента отсутствуют/);
			assert.strictEqual(/\p{Extended_Pictographic}/u.test(summary), false);
		});

		it("handles missing patient name and birth date gracefully", () => {
			const summary = formatTimelineA4Summary([], "");
			assert.match(summary, /Пациент: Пациент не указан/);
			assert.match(summary, /Дата рождения: Не указана/);
		});
	});

	// ── 8. Immunity to Corrupt & Malformed Data ────────────────────────────────
	describe("Data Immunity & Error Tolerance", () => {
		it("handles null, undefined, or non-array inputs without throwing", () => {
			// @ts-expect-error testing runtime immunity
			const resNull = filterAndPaginateTimeline(null, {});
			assert.strictEqual(resNull.total, 0);
			assert.strictEqual(resNull.entries.length, 0);

			// @ts-expect-error testing runtime immunity
			const resUndef = filterAndPaginateTimeline(undefined, {});
			assert.strictEqual(resUndef.total, 0);

			// @ts-expect-error testing runtime immunity
			const resNumber = filterAndPaginateTimeline(42, {});
			assert.strictEqual(resNumber.total, 0);
		});

		it("skips corrupt array items (null, undefined, invalid objects) gracefully", () => {
			const mixedList = [
				null,
				undefined,
				"not an event",
				{},
				{ id: "valid-1", patientId: "pat-1", category: "clinical", title: "Valid", occurredAt: "2026-09-01T10:00:00Z" },
				{ id: 12345 }, // invalid id
			] as unknown as PatientTimelineEvent[];

			const result = filterAndPaginateTimeline(mixedList);
			assert.strictEqual(result.total, 1);
			assert.strictEqual(result.entries[0]?.id, "valid-1");
		});

		it("handles invalid date strings in events without crashing sort or filters", () => {
			const corruptDateEvents: PatientTimelineEvent[] = [
				createMockEvent({ id: "e-valid", occurredAt: "2026-09-01T10:00:00.000Z" }),
				{
					id: "e-bad-date",
					patientId: "pat-001",
					category: "clinical",
					eventType: "test",
					title: "Событие с некорректной датой",
					occurredAt: "not-a-valid-date",
					sourceTable: "test",
					sourceId: "1",
				},
			];

			const result = filterAndPaginateTimeline(corruptDateEvents, {});
			assert.strictEqual(result.total, 2);
			assert.strictEqual(result.entries[0]?.id, "e-valid");
			assert.strictEqual(result.entries[1]?.id, "e-bad-date");
		});
	});
});
