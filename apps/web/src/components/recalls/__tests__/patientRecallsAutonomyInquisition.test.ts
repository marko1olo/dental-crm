/**
 * patientRecallsAutonomyInquisition.test.ts
 *
 * Subagent 6: Red Team Inquisitor for Patient Recalls & Clinical Retention Autonomy.
 *
 * Mandate Verifications:
 * - Mandate 8e, 8s: Doctor Autonomy & Solo Sovereignty (Zero disabled buttons, 1-click hygiene/implant dispatch).
 * - Mandate 8d pt 7: Zero Cartoon Emojis (Vector Lucide icons only, zero unicode emoji pollution).
 * - Mandate 8d pt 6: Anti-Matryoshka Law (Modal depth <= 1, zero nested popup dialogs).
 * - Mandate 8i: Anti-Simulator Law (Real SMS/WhatsApp preview, GSM-7/UCS-2 character count and segment calculation, zero mock logs).
 * - CSS Tokens: Zero hardcoded hex colors or untokenized backgrounds in recalls.css.
 */

import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
	PatientRecallsHubModal,
} from "../PatientRecallsHubModal";
import {
	DEFAULT_RECALL_CANDIDATES,
	RECALL_CYCLE_CATALOG,
	calculateSmsSegments,
	formatSmsSummary,
	generateSmsRecallMessage,
	generateTelegramRecallMessage,
	generateWhatsAppRecallMessage,
	type PatientRecallRecord,
	type RecallCycleType,
} from "../patientRecallEngine";
import {
	CLINICAL_CALLING_SCRIPTS,
} from "../recallTemplates";

describe("Subagent 6: Patient Recalls & Clinical Retention Autonomy Inquisition", () => {
	const mockCandidateWithPhone: PatientRecallRecord = {
		id: "cand-hygiene-01",
		patientId: "pat-101",
		fullName: "Волкова Мария Сергеевна",
		phone: "+7 (916) 123-45-67",
		cycleType: "standard_prophylaxis",
		lastVisitDate: "2026-03-01",
		dueDate: "2026-09-01",
		daysOverdue: 24,
		urgencyStatus: "due_now",
		status: "due_now",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		historicalRevenueRub: 18500,
		visitsCount: 2,
	};

	const mockCandidateWithoutPhone: PatientRecallRecord = {
		id: "cand-implant-02",
		patientId: "pat-102",
		fullName: "Соколов Андрей Владимирович",
		phone: "",
		cycleType: "implant_monitoring",
		lastVisitDate: "2025-09-10",
		dueDate: "2026-09-10",
		daysOverdue: 15,
		urgencyStatus: "overdue_30",
		status: "due_now",
		attendingDoctorName: "Д-р Смирнов А.В.",
		historicalRevenueRub: 145000,
		visitsCount: 4,
	};

	const allCycleTypes: readonly RecallCycleType[] = [
		"standard_prophylaxis",
		"periodontal_maintenance",
		"implant_monitoring",
		"orthodontic_braces",
		"orthodontic_aligners",
		"orthodontic_retention",
		"pediatric_fluoridation",
		"caries_high_risk",
		"prosthetic_check",
	];

	// =========================================================================
	// 1. Doctor Autonomy & Solo Sovereignty (Mandate 8e, 8s)
	// =========================================================================
	describe("1. Doctor Autonomy & Solo Sovereignty (Mandates 8e, 8s)", () => {
		it("ensures zero disabled action buttons across all candidates in rendered markup", () => {
			const html = renderToStaticMarkup(
				createElement(PatientRecallsHubModal, {
					isOpen: true,
					onClose: () => {},
					initialCandidates: [mockCandidateWithPhone, mockCandidateWithoutPhone],
				}),
			);

			// Extract all button elements
			const buttonMatches = html.match(/<button[^>]*>[\s\S]*?<\/button>/gi) || [];
			assert.ok(buttonMatches.length > 0, "Buttons must be present in hub modal");

			for (const btn of buttonMatches) {
				assert.ok(
					!btn.includes(" disabled") && !btn.includes('disabled=""'),
					`Mandate 8e violation: found disabled button in Hub: ${btn.slice(0, 100)}`,
				);
			}
		});

		it("provides 1-Click fast presets for routine hygiene (6m) and implant review (1y)", () => {
			const html = renderToStaticMarkup(
				createElement(PatientRecallsHubModal, {
					isOpen: true,
					onClose: () => {},
					initialCandidates: [mockCandidateWithPhone, mockCandidateWithoutPhone],
				}),
			);

			assert.ok(
				html.includes('data-testid="preset-hygiene-6m"'),
				"Must include 1-Click Hygiene 6m solo preset button",
			);
			assert.ok(
				html.includes('data-testid="preset-implants-1y"'),
				"Must include 1-Click Implants 1y solo preset button",
			);
			assert.ok(
				html.includes("1-Click: Профгигиена"),
				"Preset label must clearly indicate 1-click hygiene filter",
			);
			assert.ok(
				html.includes("1-Click: Импланты"),
				"Preset label must clearly indicate 1-click implants filter",
			);
		});

		it("renders direct 1-click actions and preview buttons for candidate rows", () => {
			const html = renderToStaticMarkup(
				createElement(PatientRecallsHubModal, {
					isOpen: true,
					onClose: () => {},
					initialCandidates: [mockCandidateWithPhone],
				}),
			);

			assert.ok(
				html.includes(`data-testid="recall-book-btn-${mockCandidateWithPhone.id}"`),
				"Must render direct 1-click Book button",
			);
			assert.ok(
				html.includes(`data-testid="recall-quick-preview-btn-${mockCandidateWithPhone.id}"`),
				"Must render direct 1-click Preview button",
			);
			assert.ok(
				html.includes(`data-testid="recall-whatsapp-btn-${mockCandidateWithPhone.id}"`),
				"Must render WhatsApp dispatch button",
			);
			assert.ok(
				html.includes(`data-testid="recall-telegram-btn-${mockCandidateWithPhone.id}"`),
				"Must render Telegram dispatch button",
			);
			assert.ok(
				html.includes(`data-testid="recall-sms-btn-${mockCandidateWithPhone.id}"`),
				"Must render SMS dispatch button",
			);
			assert.ok(
				html.includes(`data-testid="recall-preview-btn-${mockCandidateWithPhone.id}"`),
				"Must render Preview menu button",
			);
			assert.ok(
				html.includes(`data-testid="recall-script-btn-${mockCandidateWithPhone.id}"`),
				"Must render Script button",
			);
		});
	});

	// =========================================================================
	// 2. Zero Cartoon Emojis (Mandate 8d pt 7)
	// =========================================================================
	describe("2. Zero Cartoon Emojis (Mandate 8d pt 7)", () => {
		const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
		const forbiddenChars = ["✓", "✔", "❌", "🦷", "📅", "📞", "💬", "⭐", "⚠️", "🔥"];

		it("verifies zero emojis or unicode checkmarks across all 9 clinical cycles in WhatsApp/Telegram/SMS", () => {
			for (const cycle of allCycleTypes) {
				const cand: PatientRecallRecord = {
					...mockCandidateWithPhone,
					cycleType: cycle,
				};

				const wa = generateWhatsAppRecallMessage(cand, { clinicName: "ДЕНТЕ" });
				const tg = generateTelegramRecallMessage(cand, { clinicName: "ДЕНТЕ" });
				const sms = generateSmsRecallMessage(cand, { clinicName: "ДЕНТЕ" });

				for (const text of [wa, tg, sms]) {
					assert.strictEqual(
						emojiRegex.test(text),
						false,
						`Emoji detected in generated recall message for cycle ${cycle}: "${text}"`,
					);
					for (const sym of forbiddenChars) {
						assert.ok(
							!text.includes(sym),
							`Forbidden symbol "${sym}" detected in cycle ${cycle} message: "${text}"`,
						);
					}
				}
			}
		});

		it("verifies zero cartoon emojis in speech calling scripts and objection handling", () => {
			for (const cycle of allCycleTypes) {
				const script = CLINICAL_CALLING_SCRIPTS[cycle];
				if (!script) continue;

				assert.strictEqual(
					emojiRegex.test(script.greeting),
					false,
					`Emoji in script greeting for ${cycle}`,
				);
				assert.strictEqual(
					emojiRegex.test(script.clinicalContext),
					false,
					`Emoji in script context for ${cycle}`,
				);
				assert.strictEqual(
					emojiRegex.test(script.callToAction),
					false,
					`Emoji in script CTA for ${cycle}`,
				);

				for (const obj of script.objections) {
					assert.strictEqual(
						emojiRegex.test(obj.suggestedResponse),
						false,
						`Emoji in suggestedResponse for ${obj.id}`,
					);
					assert.strictEqual(
						emojiRegex.test(obj.psychologicalTip),
						false,
						`Emoji in psychologicalTip for ${obj.id}`,
					);
				}
			}
		});

		it("verifies rendered modal HTML is completely free of raw unicode emojis and checkmarks", () => {
			const html = renderToStaticMarkup(
				createElement(PatientRecallsHubModal, {
					isOpen: true,
					onClose: () => {},
					initialCandidates: [mockCandidateWithPhone, mockCandidateWithoutPhone],
				}),
			);

			assert.strictEqual(
				emojiRegex.test(html),
				false,
				"Rendered PatientRecallsHubModal contains raw unicode emojis",
			);
			assert.ok(
				!html.includes("✓") && !html.includes("✔"),
				"Rendered markup contains raw unicode checkmarks (must use Lucide vector icons)",
			);
		});
	});

	// =========================================================================
	// 3. Anti-Matryoshka Law (Mandate 8d pt 6)
	// =========================================================================
	describe("3. Anti-Matryoshka Law (Mandate 8d pt 6: Modal Depth <= 1)", () => {
		it("enforces single dialog boundary with zero nested popup dialogs or modals", () => {
			const html = renderToStaticMarkup(
				createElement(PatientRecallsHubModal, {
					isOpen: true,
					onClose: () => {},
					initialCandidates: [mockCandidateWithPhone],
				}),
			);

			// Count occurrences of role="dialog"
			const dialogRoleMatches = html.match(/role="dialog"/gi) || [];
			assert.strictEqual(
				dialogRoleMatches.length,
				1,
				`Mandate 8d pt 6 violation: exactly 1 role="dialog" expected, found ${dialogRoleMatches.length}`,
			);

			// Ensure zero HTML5 <dialog> elements
			assert.ok(!html.includes("<dialog"), "No nested <dialog> tags permitted");

			// Ensure modal container wraps flat inline content
			assert.ok(
				html.includes('data-testid="patient-recalls-hub-modal"'),
				"Container must exist with correct testid",
			);
		});
	});

	// =========================================================================
	// 4. Anti-Simulator Law (Mandate 8i) & Real SMS/WhatsApp Calculation
	// =========================================================================
	describe("4. Anti-Simulator Law & Real SMS Segment Calculations (Mandate 8i)", () => {
		it("calculates GSM-7 single and multipart SMS segments with mathematical accuracy", () => {
			// Single GSM-7 segment (<= 160 characters)
			const shortGsm = "Hello! Routine dental checkup reminder from DENTE Clinic. Call 123456.";
			const shortCalc = calculateSmsSegments(shortGsm);

			assert.strictEqual(shortCalc.characterCount, shortGsm.length);
			assert.strictEqual(shortCalc.encoding, "GSM-7");
			assert.strictEqual(shortCalc.segmentCount, 1);
			assert.strictEqual(shortCalc.charsPerSegment, 160);
			assert.strictEqual(shortCalc.remainingInCurrentSegment, 160 - shortGsm.length);
			assert.strictEqual(shortCalc.isMultipart, false);

			// Exact 160 GSM-7 boundary
			const exact160 = "A".repeat(160);
			const exactCalc = calculateSmsSegments(exact160);
			assert.strictEqual(exactCalc.segmentCount, 1);
			assert.strictEqual(exactCalc.remainingInCurrentSegment, 0);
			assert.strictEqual(exactCalc.isMultipart, false);

			// Multipart GSM-7 (161 characters -> 2 segments, 153 chars/segment)
			const multi161 = "A".repeat(161);
			const multiCalc = calculateSmsSegments(multi161);
			assert.strictEqual(multiCalc.segmentCount, 2);
			assert.strictEqual(multiCalc.charsPerSegment, 153);
			assert.strictEqual(multiCalc.maxCharsInCurrentSegment, 306);
			assert.strictEqual(multiCalc.remainingInCurrentSegment, 306 - 161);
			assert.strictEqual(multiCalc.isMultipart, true);
		});

		it("calculates UCS-2 (Cyrillic) single and multipart SMS segments per 3GPP standards", () => {
			// Single UCS-2 segment (<= 70 characters)
			const shortCyrillic = "Мария, прошло 6 мес. Пора на гигиену: https://dente.clinic/b";
			const cyrCalc = calculateSmsSegments(shortCyrillic);

			assert.strictEqual(cyrCalc.characterCount, shortCyrillic.length);
			assert.strictEqual(cyrCalc.encoding, "UCS-2");
			assert.strictEqual(cyrCalc.segmentCount, 1);
			assert.strictEqual(cyrCalc.charsPerSegment, 70);
			assert.strictEqual(cyrCalc.remainingInCurrentSegment, 70 - shortCyrillic.length);
			assert.strictEqual(cyrCalc.isMultipart, false);

			// Exact 70 UCS-2 boundary
			const exact70 = "А".repeat(70);
			const exactCyr = calculateSmsSegments(exact70);
			assert.strictEqual(exactCyr.segmentCount, 1);
			assert.strictEqual(exactCyr.remainingInCurrentSegment, 0);

			// Multipart UCS-2 (71 characters -> 2 segments, 67 chars/segment)
			const multi71 = "А".repeat(71);
			const multiCyr = calculateSmsSegments(multi71);
			assert.strictEqual(multiCyr.segmentCount, 2);
			assert.strictEqual(multiCyr.charsPerSegment, 67);
			assert.strictEqual(multiCyr.maxCharsInCurrentSegment, 134);
			assert.strictEqual(multiCyr.remainingInCurrentSegment, 134 - 71);
			assert.strictEqual(multiCyr.isMultipart, true);

			// Triple segment UCS-2 (150 characters -> 3 segments: 67*3 = 201 capacity)
			const tripleCyr = "А".repeat(150);
			const tripleCalc = calculateSmsSegments(tripleCyr);
			assert.strictEqual(tripleCalc.segmentCount, 3);
			assert.strictEqual(tripleCalc.remainingInCurrentSegment, 201 - 150);
		});

		it("formats human-readable SMS billing summary accurately", () => {
			const calc1 = calculateSmsSegments("Тест");
			const summary1 = formatSmsSummary(calc1);
			assert.ok(summary1.includes("4 симв."));
			assert.ok(summary1.includes("1 SMS"));
			assert.ok(summary1.includes("UCS-2"));

			const emptyCalc = calculateSmsSegments("");
			assert.strictEqual(formatSmsSummary(emptyCalc), "0 символов • 0 SMS");
		});

		it("proves default candidate pool is strictly empty (Mandates 8i, 8s: zero fake simulator records)", () => {
			assert.deepStrictEqual(
				DEFAULT_RECALL_CANDIDATES,
				[],
				"DEFAULT_RECALL_CANDIDATES must be empty array, zero mock records",
			);
		});
	});

	// =========================================================================
	// 5. CSS Tokens & Design System Audit
	// =========================================================================
	describe("5. CSS Tokens Audit (recalls.css)", () => {
		it("verifies zero hardcoded hex colors in recalls.css", () => {
			const cssPath = fs.existsSync(path.resolve(__dirname, "../recalls.css"))
				? path.resolve(__dirname, "../recalls.css")
				: path.resolve(process.cwd(), "apps/web/src/components/recalls/recalls.css");
			const cssContent = fs.readFileSync(cssPath, "utf8");

			const hexMatches = cssContent.match(/#[0-9a-fA-F]{3,8}\b/g);
			assert.strictEqual(
				hexMatches,
				null,
				`Hardcoded hex colors found in recalls.css: ${hexMatches?.join(", ")}`,
			);
		});

		it("verifies zero untokenized rgba/rgb backgrounds or borders in recalls.css", () => {
			const cssPath = fs.existsSync(path.resolve(__dirname, "../recalls.css"))
				? path.resolve(__dirname, "../recalls.css")
				: path.resolve(process.cwd(), "apps/web/src/components/recalls/recalls.css");
			const cssContent = fs.readFileSync(cssPath, "utf8");
			const lines = cssContent.split("\n");

			const violations: string[] = [];
			lines.forEach((line, idx) => {
				if (/(color|background|border|box-shadow):/i.test(line)) {
					// Check for raw rgba/rgb without var()
					if (/rgba?\([0-9,\s.]+\)/i.test(line) && !line.includes("var(")) {
						violations.push(`Line ${idx + 1}: ${line.trim()}`);
					}
				}
			});

			assert.deepStrictEqual(
				violations,
				[],
				`Untokenized color values found in recalls.css: ${violations.join("; ")}`,
			);
		});
	});
});
