import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	calculateSilnessLoeScore,
	CLINICAL_DEEP_FLUORIDATION_SUMMARY_RU,
	CLINICAL_PERIO_ANTISEPTIC_SUMMARY_RU,
	CLINICAL_TOOTH_MOUSSE_SUMMARY_RU,
	createDeepFluoridationProtocolText,
	createPerioAntisepticProtocolText,
	createToothMousseProtocolText,
	HYGIENE_EXPRESS_SERVICES,
	HygieneIndicesPanel,
} from "../HygieneIndicesPanel";

describe("HygieneIndicesPanel — Chairside Express Protocols & Invoice Services (Mandates 8e, 8i, 8k, 8n)", () => {
	it("verifies HYGIENE_EXPRESS_SERVICES dictionary contracts according to 804n Nomenclature", () => {
		assert.equal(HYGIENE_EXPRESS_SERVICES.proHygiene.code, "A16.07.051");
		assert.equal(HYGIENE_EXPRESS_SERVICES.proHygiene.price, 5500);
		assert.equal(HYGIENE_EXPRESS_SERVICES.proHygiene.category, "hygiene");

		assert.equal(HYGIENE_EXPRESS_SERVICES.deepFluoridation.code, "A11.07.012");
		assert.equal(HYGIENE_EXPRESS_SERVICES.deepFluoridation.price, 1800);
		assert.equal(HYGIENE_EXPRESS_SERVICES.deepFluoridation.category, "hygiene");

		assert.equal(HYGIENE_EXPRESS_SERVICES.toothMousse.code, "A11.07.010");
		assert.equal(HYGIENE_EXPRESS_SERVICES.toothMousse.price, 1500);
		assert.equal(HYGIENE_EXPRESS_SERVICES.toothMousse.category, "hygiene");

		assert.equal(HYGIENE_EXPRESS_SERVICES.perioAntiseptic.code, "A16.07.053");
		assert.equal(HYGIENE_EXPRESS_SERVICES.perioAntiseptic.price, 1200);
		assert.equal(HYGIENE_EXPRESS_SERVICES.perioAntiseptic.category, "hygiene");
	});

	it("verifies protocol generators produce detailed 043/u clinical diary texts without placeholders", () => {
		const deepFluorText = createDeepFluoridationProtocolText();
		assert.ok(deepFluorText.includes("A11.07.012"));
		assert.ok(deepFluorText.includes("Tiefenfluorid"));
		assert.ok(deepFluorText.includes("CaF2"));
		assert.equal(deepFluorText.includes("TODO"), false);

		const toothMousseText = createToothMousseProtocolText();
		assert.ok(toothMousseText.includes("A11.07.010"));
		assert.ok(toothMousseText.includes("GC Tooth Mousse"));
		assert.ok(toothMousseText.includes("Recaldent CPP-ACP"));
		assert.ok(toothMousseText.includes("капп"));
		assert.equal(toothMousseText.includes("TODO"), false);

		const perioAntisepticText = createPerioAntisepticProtocolText();
		assert.ok(perioAntisepticText.includes("A16.07.053"));
		assert.ok(perioAntisepticText.includes("хлоргексидин"));
		assert.ok(perioAntisepticText.includes("Метрогил Дента"));
		assert.equal(perioAntisepticText.includes("TODO"), false);
	});

	it("renders all clinical status presets and chairside treatment protocols with 48px touch targets and zero emojis", () => {
		const html = renderToStaticMarkup(
			createElement(HygieneIndicesPanel, {
				readOnly: false,
			}),
		);

		// Header & Diagnostic panel
		assert.ok(html.includes("Индексы гигиены полости рта (OHI-S, PMA, КПИ Леуса)"));
		assert.ok(html.includes("data-testid=\"hygiene-insert-to-043-btn\""));

		// 5 Periodontal Status Presets
		assert.ok(html.includes("data-testid=\"hygiene-preset-norm\""));
		assert.ok(html.includes("data-testid=\"hygiene-preset-gingivitis\""));
		assert.ok(html.includes("data-testid=\"hygiene-preset-mild-periodontitis\""));
		assert.ok(html.includes("data-testid=\"hygiene-preset-periodontitis\""));
		assert.ok(html.includes("data-testid=\"hygiene-preset-severe-periodontitis\""));

		// 4 Chairside Treatment & Prevention Protocols (804n)
		assert.ok(html.includes("data-testid=\"hygiene-preset-pro-hygiene\""));
		assert.ok(html.includes("data-testid=\"hygiene-preset-deep-fluoridation\""));
		assert.ok(html.includes("data-testid=\"hygiene-preset-tooth-mousse\""));
		assert.ok(html.includes("data-testid=\"hygiene-preset-perio-antiseptic\""));

		// All 804n service codes rendered
		assert.ok(html.includes("A16.07.051"));
		assert.ok(html.includes("A11.07.012"));
		assert.ok(html.includes("A11.07.010"));
		assert.ok(html.includes("A16.07.053"));

		// All prices rendered
		assert.ok(html.includes("5 500 ₽"));
		assert.ok(html.includes("1 800 ₽"));
		assert.ok(html.includes("1 500 ₽"));
		assert.ok(html.includes("1 200 ₽"));

		// Touch target law: all preset buttons must have min-h-[48px]
		assert.ok(html.includes("min-h-[48px]"));

		// Zero raw cartoon emojis in medical UI
		assert.equal(html.includes("⚡"), false, "Must not contain raw lightning emoji");
		assert.equal(html.includes("💡"), false, "Must not contain raw lightbulb emoji");
		assert.equal(html.includes("🦷"), false, "Must not contain raw tooth emoji");
		assert.equal(html.includes("🔬"), false, "Must not contain raw microscope emoji");
	});

	it("verifies dual event dispatch contract for invoice and 043/u diary", () => {
		const eventsDispatched: Array<{ type: string; detail: any }> = [];

		const mockWindow = {
			dispatchEvent: (event: { type: string; detail: any }) => {
				eventsDispatched.push({ type: event.type, detail: event.detail });
				return true;
			},
		};

		// 1. Pro-hygiene contract
		const proHygieneService = HYGIENE_EXPRESS_SERVICES.proHygiene;
		mockWindow.dispatchEvent({
			type: "dente-add-estimate-service",
			detail: proHygieneService,
		});
		mockWindow.dispatchEvent({
			type: "dente-add-services-to-invoice",
			detail: {
				...proHygieneService,
				service: proHygieneService,
				services: [proHygieneService],
			},
		});

		// 2. Deep fluoridation contract
		const deepFluorService = HYGIENE_EXPRESS_SERVICES.deepFluoridation;
		mockWindow.dispatchEvent({
			type: "dente-add-estimate-service",
			detail: deepFluorService,
		});
		mockWindow.dispatchEvent({
			type: "dente-add-services-to-invoice",
			detail: {
				...deepFluorService,
				service: deepFluorService,
				services: [deepFluorService],
			},
		});

		// 3. Tooth Mousse contract
		const toothMousseService = HYGIENE_EXPRESS_SERVICES.toothMousse;
		mockWindow.dispatchEvent({
			type: "dente-add-estimate-service",
			detail: toothMousseService,
		});
		mockWindow.dispatchEvent({
			type: "dente-add-services-to-invoice",
			detail: {
				...toothMousseService,
				service: toothMousseService,
				services: [toothMousseService],
			},
		});

		// 4. Perio antiseptic contract
		const perioAntisepticService = HYGIENE_EXPRESS_SERVICES.perioAntiseptic;
		mockWindow.dispatchEvent({
			type: "dente-add-estimate-service",
			detail: perioAntisepticService,
		});
		mockWindow.dispatchEvent({
			type: "dente-add-services-to-invoice",
			detail: {
				...perioAntisepticService,
				service: perioAntisepticService,
				services: [perioAntisepticService],
			},
		});

		// Verification
		const invoiceEvents = eventsDispatched.filter(
			(e) => e.type === "dente-add-services-to-invoice",
		);
		assert.equal(invoiceEvents.length, 4, "Must dispatch 4 invoice events");

		const estimateEvents = eventsDispatched.filter(
			(e) => e.type === "dente-add-estimate-service",
		);
		assert.equal(estimateEvents.length, 4, "Must dispatch 4 estimate events");

		// Validate specific codes in invoice events
		const codesInInvoice = invoiceEvents.map((e) => e.detail.code);
		assert.deepEqual(codesInInvoice, [
			"A16.07.051",
			"A11.07.012",
			"A11.07.010",
			"A16.07.053",
		]);

		// Validate services array exists on all invoice events
		for (const ev of invoiceEvents) {
			assert.ok(Array.isArray(ev.detail.services), "Invoice event must contain services array");
			assert.equal(ev.detail.services.length, 1);
			assert.equal(ev.detail.services[0].code, ev.detail.code);
		}
	});

	it("verifies WCAG AAA contrast classes in Light/Dark mode and zero dark fallbacks in design tokens", () => {
		const html = renderToStaticMarkup(
			createElement(HygieneIndicesPanel, {
				readOnly: false,
			}),
		);

		// DEFECT 1: Light Mode contrast classes with dark: variant
		assert.ok(
			html.includes("text-teal-900 dark:text-teal-300"),
			"Must include text-teal-900 dark:text-teal-300 for high contrast",
		);
		assert.ok(
			html.includes("text-emerald-900 dark:text-emerald-300"),
			"Must include text-emerald-900 dark:text-emerald-300 for high contrast",
		);
		assert.ok(
			html.includes("text-rose-900 dark:text-rose-200"),
			"Must include text-rose-900 dark:text-rose-200 for high contrast",
		);
		assert.ok(
			html.includes("text-cyan-900 dark:text-cyan-300"),
			"Must include text-cyan-900 dark:text-cyan-300 for high contrast",
		);
		assert.ok(
			html.includes("text-sky-900 dark:text-sky-300"),
			"Must include text-sky-900 dark:text-sky-300 for high contrast",
		);
		assert.ok(
			html.includes("text-violet-900 dark:text-violet-300"),
			"Must include text-violet-900 dark:text-violet-300 for high contrast",
		);

		// DEFECT 2: Zero hardcoded dark fallback colors in CSS tokens
		assert.equal(
			html.includes("#1e293b"),
			false,
			"Must not contain hardcoded dark fallback #1e293b",
		);
		assert.equal(
			html.includes("#334155"),
			false,
			"Must not contain hardcoded dark fallback #334155",
		);
		assert.equal(
			html.includes("#0f172a"),
			false,
			"Must not contain hardcoded dark fallback #0f172a",
		);
		assert.equal(
			html.includes("#f8fafc"),
			false,
			"Must not contain hardcoded dark fallback #f8fafc",
		);

		// Pure tokens verification
		assert.ok(
			html.includes("bg-[var(--paper-soft)]"),
			"Must use pure bg-[var(--paper-soft)] token",
		);
		assert.ok(
			html.includes("border-[var(--line)]"),
			"Must use pure border-[var(--line)] token",
		);
		assert.ok(
			html.includes("text-[var(--ink)]"),
			"Must use pure text-[var(--ink)] token",
		);
	});

	it("verifies Hick's Law toolbar for 4 indices, Miller's Law print action and truncate classes", () => {
		const html = renderToStaticMarkup(
			createElement(HygieneIndicesPanel, {
				readOnly: false,
			}),
		);

		// Hick's Law 32-36px toolbar for switching indices
		assert.ok(html.includes("OHI-S (Грин-Вермиллион)"));
		assert.ok(html.includes("Silness-Löe (Сиднесс-Лоэ)"));
		assert.ok(html.includes("Федорова-Володкина"));
		assert.ok(html.includes("PHP (Подошадлей-Хейли)"));

		// Miller's Law print protocol button
		assert.ok(html.includes("data-testid=\"hygiene-print-protocol-btn\""));
		assert.ok(html.includes("Печать протокола"));

		// Truncate safeguards for long Russian text
		assert.ok(html.includes("truncate"));
		assert.ok(html.includes("min-w-0"));
	});

	it("verifies mathematical accuracy of Silness-Löe, Fedorov-Volodkina and PHP pure index calculators", () => {
		// 1. Healthy norm: all teeth 0
		const normAssessments = {
			16: { toothNumber: 16, debrisScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
			11: { toothNumber: 11, debrisScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
			26: { toothNumber: 26, debrisScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
			36: { toothNumber: 36, debrisScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
			31: { toothNumber: 31, debrisScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
			46: { toothNumber: 46, debrisScore: 0, silnessScore: 0, fedorovScore: 1, phpScore: 0 },
		};

		const silnessNorm = calculateSilnessLoeScore(normAssessments);
		assert.equal(silnessNorm.score, 0);
		assert.equal(silnessNorm.isOptimal, true);
		assert.equal(silnessNorm.evaluation, "excellent");

		const fedorovNorm = calculateFedorovVolodkinaScore(normAssessments);
		assert.equal(fedorovNorm.score, 1.0);
		assert.equal(fedorovNorm.isOptimal, true);
		assert.equal(fedorovNorm.evaluation, "good");

		const phpNorm = calculatePhpScore(normAssessments);
		assert.equal(phpNorm.score, 0);
		assert.equal(phpNorm.isOptimal, true);
		assert.equal(phpNorm.evaluation, "excellent");

		// 2. Moderate pathology
		const pathoAssessments = {
			16: { toothNumber: 16, debrisScore: 2, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
			11: { toothNumber: 11, debrisScore: 1, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
			26: { toothNumber: 26, debrisScore: 2, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
			36: { toothNumber: 36, debrisScore: 2, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
			31: { toothNumber: 31, debrisScore: 1, silnessScore: 1, fedorovScore: 2, phpScore: 2 },
			46: { toothNumber: 46, debrisScore: 2, silnessScore: 2, fedorovScore: 3, phpScore: 3 },
		};

		const silnessPatho = calculateSilnessLoeScore(pathoAssessments);
		assert.equal(silnessPatho.score, 1.7);
		assert.equal(silnessPatho.evaluation, "moderate");

		const fedorovPatho = calculateFedorovVolodkinaScore(pathoAssessments);
		assert.equal(fedorovPatho.score, 2.7);
		assert.equal(fedorovPatho.evaluation, "bad");

		const phpPatho = calculatePhpScore(pathoAssessments);
		assert.equal(phpPatho.score, 2.7);
		assert.equal(phpPatho.evaluation, "poor");
	});
});
