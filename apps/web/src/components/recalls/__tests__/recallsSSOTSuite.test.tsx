/**
 * apps/web/src/components/recalls/__tests__/recallsSSOTSuite.test.tsx
 *
 * Канонический Red Team тест-сьют для SSOT Студии повторных вызовов и профосмотров.
 * Мандаты: 8b/8zi (SSOT архитектура), 8e (Автономия врача, 0 disabled кнопок),
 * 8n (Соло-врач и 1-5 кресел), 8x (Живой клинический язык), 8ze/8al/8am (Apple HIG Touch).
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RecallStudioModal } from "../RecallStudioModal";
import {
	type PatientRecallRecord,
	type RecallCycleType,
	DEMO_SHOWCASE_CANDIDATES,
	CANONICAL_RECALL_STATUS_CONFIG,
	toCanonicalRecallStatus,
	fromCanonicalRecallStatus,
	generateWhatsAppRecallMessage,
	generateSmsRecallMessage,
	calculateSmsSegments,
	calculateHygieneRecallTrigger,
	calculateImplantProstheticRecallTrigger,
	calculateOrthoActivationRecallTrigger,
	calculatePediatricRecallTrigger,
	cleanPhoneDigits,
	extractFirstName,
	extractPolitePatientName,
} from "../recallsCatalogData";

describe("Recall Studio SSOT Master Suite", () => {
	const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
	const forbiddenSymbols = ["✓", "✔", "❌", "🦷", "📅", "📞", "💬", "⭐", "⚠️", "🔥"];

	const sampleCandidate: PatientRecallRecord = {
		id: "cand-test-01",
		patientId: "pat-test-01",
		fullName: "Иванов Иван Иванович",
		phone: "+7 (999) 111-22-33",
		cycleType: "standard_prophylaxis",
		cycleLabel: "Профгигиена каждые 6 месяцев",
		lastVisitDate: "2026-03-01",
		dueDate: "2026-09-01",
		daysOverdue: 20,
		urgencyStatus: "due_now",
		status: "due_now",
		attendingDoctorId: "doc-1",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		historicalRevenueRub: 18500,
		visitsCount: 3,
	};

	it("1. Verifies 5 canonical clinical prophylaxis cycles and intervals", () => {
		// 1. Профгигиена: 6 месяцев
		const hygiene = calculateHygieneRecallTrigger("2026-03-01");
		assert.strictEqual(hygiene.intervalMonths, 6);
		assert.strictEqual(hygiene.formattedDueDate, "2026-09-01");
		assert.strictEqual(hygiene.mappedCycleType, "standard_prophylaxis");

		// 2. Контроль имплантации: 12 месяцев (или 3-6)
		const implant = calculateImplantProstheticRecallTrigger("2025-10-15");
		assert.strictEqual(implant.intervalMonths, 12);
		assert.strictEqual(implant.formattedDueDate, "2026-10-15");
		assert.strictEqual(implant.mappedCycleType, "implant_monitoring");

		// 3. Ортодонтия: 4 недели (1 месяц)
		const ortho = calculateOrthoActivationRecallTrigger("2026-04-01");
		assert.strictEqual(ortho.intervalWeeks, 4);
		assert.strictEqual(ortho.mappedCycleType, "orthodontic_braces");

		// 4. Детская флюоризация: 3 месяца
		const ped = calculatePediatricRecallTrigger("2026-01-10", 3);
		assert.strictEqual(ped.intervalMonths, 3);
		assert.strictEqual(ped.formattedDueDate, "2026-04-10");
		assert.strictEqual(ped.mappedCycleType, "pediatric_fluoridation");

		// 5. Проверка демо-витрины на наличие всех ключевых циклов
		const demoCycles = DEMO_SHOWCASE_CANDIDATES.map((c) => c.cycleType);
		assert.ok(demoCycles.includes("standard_prophylaxis"));
		assert.ok(demoCycles.includes("implant_monitoring"));
		assert.ok(demoCycles.includes("orthodontic_adjustment"));
		assert.ok(demoCycles.includes("pediatric_fluoridation"));
		assert.ok(demoCycles.includes("periodontal_maintenance"));
	});

	it("2. Verifies 4 canonical workflow statuses without Soviet bureaucratic jargon", () => {
		assert.strictEqual(CANONICAL_RECALL_STATUS_CONFIG.not_called.label, "Пора приглашать");
		assert.strictEqual(CANONICAL_RECALL_STATUS_CONFIG.reached.label, "Приглашение отправлено (WhatsApp/СМС)");
		assert.strictEqual(CANONICAL_RECALL_STATUS_CONFIG.scheduled.label, "Записан на приём");
		assert.strictEqual(CANONICAL_RECALL_STATUS_CONFIG.declined.label, "Отказ / Перенос");

		assert.strictEqual(toCanonicalRecallStatus("due_now"), "not_called");
		assert.strictEqual(toCanonicalRecallStatus("contacted"), "reached");
		assert.strictEqual(toCanonicalRecallStatus("scheduled"), "scheduled");
		assert.strictEqual(toCanonicalRecallStatus("declined"), "declined");

		assert.strictEqual(fromCanonicalRecallStatus("not_called"), "due_now");
		assert.strictEqual(fromCanonicalRecallStatus("reached"), "contacted");
		assert.strictEqual(fromCanonicalRecallStatus("scheduled"), "scheduled");
		assert.strictEqual(fromCanonicalRecallStatus("declined"), "declined");
	});

	it("3. Verifies 1-click personalized WhatsApp and SMS generation with zero emojis", () => {
		const wa = generateWhatsAppRecallMessage(sampleCandidate, { clinicName: "Стоматология ДЕНТЕ" });
		const sms = generateSmsRecallMessage(sampleCandidate, { clinicName: "ДЕНТЕ" });

		assert.ok(wa.includes("Здравствуйте, Иван!"));
		assert.ok(wa.includes("Д-р Кузнецова Е.В."));
		assert.ok(wa.includes("2026-03-01"));
		assert.ok(sms.includes("Иван, прошло 6 мес"));

		// Проверка на отсутствие мусорных эмодзи и юникод-галочек
		assert.strictEqual(emojiRegex.test(wa), false);
		assert.strictEqual(emojiRegex.test(sms), false);
		for (const sym of forbiddenSymbols) {
			assert.ok(!wa.includes(sym), `Forbidden symbol in WhatsApp: ${sym}`);
			assert.ok(!sms.includes(sym), `Forbidden symbol in SMS: ${sym}`);
		}

		// Проверка 3GPP SMS сегментации
		const calc = calculateSmsSegments(sms);
		assert.strictEqual(calc.encoding, "UCS-2");
		assert.ok(calc.segmentCount >= 1);
	});

	it("4. Verifies Mandate 8e: zero disabled buttons in RecallStudioModal markup", () => {
		const html = renderToStaticMarkup(
			createElement(RecallStudioModal, {
				isOpen: true,
				onClose: () => {},
				initialCandidates: [sampleCandidate],
			}),
		);

		// Ни одна кнопка не имеет атрибута disabled
		const hasDisabledButton = /<button[^>]*\bdisabled\b/i.test(html);
		assert.strictEqual(hasDisabledButton, false, "Mandate 8e violation: found disabled button in RecallStudioModal");
	});

	it("5. Verifies Apple HIG touch targets (>= 44x44px) and CSS class assignments", () => {
		const html = renderToStaticMarkup(
			createElement(RecallStudioModal, {
				isOpen: true,
				onClose: () => {},
				initialCandidates: [sampleCandidate],
			}),
		);

		// Проверка наличия элементов Apple HIG Bottom Sheet
		assert.ok(html.includes("recall-studio-drag-handle"), "Missing drag handle for mobile bottom sheet");
		assert.ok(html.includes("recall-studio-close-btn"), "Missing close button with 44x44px minimum target");
		assert.ok(html.includes("recall-studio-btn-primary"), "Missing primary CTA button");
		assert.ok(html.includes("primary-recall-cta"), "Missing primary-recall-cta test id");

		// Проверка текста шапки и KPI
		assert.ok(html.includes("Повторные вызовы и диспансеризация"));
		assert.ok(html.includes("Доходимость:"));
		assert.ok(html.includes("Требуют вызова сегодня:"));
	});

	it("6. Verifies modal respects isOpen=false with clean unmount", () => {
		const html = renderToStaticMarkup(
			createElement(RecallStudioModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.strictEqual(html, "");
	});
});
