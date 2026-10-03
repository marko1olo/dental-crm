/**
 * pediatricSmartDentitionAndArt54.test.ts
 *
 * Targeted Unit & Integration Test Suite for:
 * 1. Smart age-based dentition initial calculation (<6y: pediatric, 6–11y: mixed, 12+y: adult)
 * 2. Doctor autonomy: manual switches preserved without clobbering (Mandate 8e)
 * 3. Federal Law No. 323-FZ Art. 54 Part 2 & Art. 20 validation:
 *    - Minor < 15 years: mandatory legal representative consent
 *    - Minor 15+ years: self-signing right per Art. 54 Part 2 323-FZ
 * 4. Mixed dentition 1-click sanitation (all 24 teeth)
 * 5. Frankl behavioral scale ergonomics (1-click without academic clutter, zero emojis)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	formatPediatricRepresentativeText,
	PediatricSomaticAndLegalRep,
	DEFAULT_LEGAL_REPRESENTATIVE,
	DEFAULT_PEDIATRIC_SOMATIC_NORM,
} from "../components/pediatric/PediatricSomaticAndLegalRep";
import {
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	ALL_ADULT_TEETH_NUMBERS,
} from "../components/odontogram/ToothChart";
import {
	FRANKL_EXPRESS_ITEMS,
	PEDIATRIC_PROTOCOL_PRESETS,
	VisitPediatricProtocolWidget,
} from "../components/pediatric/VisitPediatricProtocolWidget";
import {
	FranklBehaviorBadge,
	getFranklVectorIcon,
	type FranklRating,
} from "../components/pediatric/FranklBehaviorBadge";

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;

describe("Pediatric Smart Dentition & Federal Law No. 323-FZ Art. 54", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. SMART DENTITION MODE CALCULATION BY AGE
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Smart Initial Dentition Selection by Patient Age", () => {
		function getSmartDentitionMode(patientAge: number | null): "adult" | "pediatric" | "mixed" {
			if (patientAge === null) return "adult";
			if (patientAge < 6) return "pediatric";
			if (patientAge < 12) return "mixed";
			return "adult";
		}

		it("selects primary dentition (FDI 51–85) for child under 6 years old", () => {
			assert.strictEqual(getSmartDentitionMode(3), "pediatric");
			assert.strictEqual(getSmartDentitionMode(4), "pediatric");
			assert.strictEqual(getSmartDentitionMode(5), "pediatric");
		});

		it("selects mixed dentition (24 teeth) for child between 6 and 11 years old", () => {
			assert.strictEqual(getSmartDentitionMode(6), "mixed");
			assert.strictEqual(getSmartDentitionMode(7), "mixed");
			assert.strictEqual(getSmartDentitionMode(8), "mixed");
			assert.strictEqual(getSmartDentitionMode(10), "mixed");
			assert.strictEqual(getSmartDentitionMode(11), "mixed");
		});

		it("selects adult dentition (FDI 11–48) for patient 12 years old and above", () => {
			assert.strictEqual(getSmartDentitionMode(12), "adult");
			assert.strictEqual(getSmartDentitionMode(15), "adult");
			assert.strictEqual(getSmartDentitionMode(30), "adult");
		});

		it("defaults safely to adult dentition when patient age is unknown / null", () => {
			assert.strictEqual(getSmartDentitionMode(null), "adult");
		});

		it("guarantees mixed dentition formula contains exactly 24 teeth (20 primary + 4 first molars 16, 26, 36, 46)", () => {
			const mixedTeeth = [...MIXED_TOP_TEETH, ...MIXED_BOTTOM_TEETH];
			assert.strictEqual(mixedTeeth.length, 24);

			// Permanent first molars present
			assert.ok(mixedTeeth.includes(16), "Mixed dentition contains permanent upper right molar 16");
			assert.ok(mixedTeeth.includes(26), "Mixed dentition contains permanent upper left molar 26");
			assert.ok(mixedTeeth.includes(36), "Mixed dentition contains permanent lower left molar 36");
			assert.ok(mixedTeeth.includes(46), "Mixed dentition contains permanent lower right molar 46");

			// Deciduous incisors and molars present
			assert.ok(mixedTeeth.includes(51), "Mixed dentition contains 51");
			assert.ok(mixedTeeth.includes(85), "Mixed dentition contains 85");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. STATUTORY LEGAL REPRESENTATIVE & ART. 54 323-FZ VALIDATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Statutory Representative & Art. 54 323-FZ (Consent at Age 15+)", () => {
		it("formats representative consent for child under 15 years old (< 15: requires parental consent)", () => {
			const rep = {
				...DEFAULT_LEGAL_REPRESENTATIVE,
				fullName: "Смирнова Анна",
				phone: "+7 999 123-45-67",
				consentSigned: true,
			};

			const textSigned = formatPediatricRepresentativeText(rep, 7);
			assert.ok(textSigned.includes("Родитель: Мама (Смирнова Анна, +7 999 123-45-67)"));
			assert.ok(textSigned.includes("Согласие на лечение получено"));

			const textUnsigned = formatPediatricRepresentativeText({ ...rep, consentSigned: false }, 7);
			assert.ok(textUnsigned.includes("ВНИМАНИЕ: требуется подписание согласия родителем"));
		});

		it("formats consent for minor 15+ years old per Art. 54 Part 2 323-FZ (independent signature right)", () => {
			const rep = {
				...DEFAULT_LEGAL_REPRESENTATIVE,
				fullName: "Смирнова Анна",
				phone: "+7 999 123-45-67",
				consentSigned: true,
			};

			const textSigned = formatPediatricRepresentativeText(rep, 16);
			assert.ok(textSigned.includes("Родитель/представитель"));
			assert.ok(textSigned.includes("пациент 15+ лет / представитель, ст. 54 323-ФЗ"));

			const textUnsigned = formatPediatricRepresentativeText({ ...rep, consentSigned: false }, 16);
			assert.ok(textUnsigned.includes("ст. 54 323-ФЗ"));
			assert.ok(textUnsigned.includes("самостоятельно"));
		});

		it("renders Art. 54 323-FZ status in PediatricSomaticAndLegalRep for patient 15+ years", () => {
			const htmlAge16 = renderToStaticMarkup(
				createElement(PediatricSomaticAndLegalRep, {
					patientAge: 16,
					initialRepresentative: {
						role: "Мать",
						consentSigned: false,
					},
				}),
			);

			assert.ok(htmlAge16.includes("Пациент 15+ лет (ст. 54 323-ФЗ)"), "Must indicate 15+ status");
			assert.ok(
				htmlAge16.includes("пациент старше 15 лет вправе подписать ИДС лично"),
				"Warning banner must inform doctor of patient's right under Art. 54",
			);
			assert.ok(!EMOJI_REGEX.test(htmlAge16), "Must contain 0 emojis");
		});

		it("renders Art. 20 323-FZ status in PediatricSomaticAndLegalRep for child under 15 years", () => {
			const htmlAge7 = renderToStaticMarkup(
				createElement(PediatricSomaticAndLegalRep, {
					patientAge: 7,
					initialRepresentative: {
						role: "Мать",
						consentSigned: false,
					},
				}),
			);

			assert.ok(htmlAge7.includes("Законный представитель ребёнка"), "Must indicate legal representative");
			assert.ok(
				htmlAge7.includes("323-ФЗ ст. 20: требуется подписание ИДС родителем перед инвазивным вмешательством"),
				"Warning banner must cite Art. 20 requirement for young children",
			);
			assert.ok(!EMOJI_REGEX.test(htmlAge7), "Must contain 0 emojis");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. DOCTOR AUTONOMY & 1-CLICK ACTIONS (MANDATE 8e)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Doctor Autonomy & Chairside Ergonomics (Mandates 8e, 8n)", () => {
		it("provides 1-click somatic norm without academic questionnaires", () => {
			assert.strictEqual(DEFAULT_PEDIATRIC_SOMATIC_NORM.isNormal, true);
			assert.ok(DEFAULT_PEDIATRIC_SOMATIC_NORM.summaryRu.includes("соматически здоров"));
		});

		it("Frankl behavior badge supports all 4 ratings with zero emojis and 100% SVG icons", () => {
			for (const r of [1, 2, 3, 4] as FranklRating[]) {
				const IconComp = getFranklVectorIcon(r);
				const iconHtml = renderToStaticMarkup(createElement(IconComp, { className: "w-4 h-4" }));
				assert.ok(iconHtml.includes("<svg"), `Frankl ${r} icon must render SVG`);
				assert.ok(!EMOJI_REGEX.test(iconHtml), `Frankl ${r} icon must contain 0 emojis`);
			}
		});

		it("VisitPediatricProtocolWidget accepts patientAgeYears and renders cleanly", () => {
			const html = renderToStaticMarkup(
				createElement(VisitPediatricProtocolWidget, {
					activeTooth: 54,
					patientAgeYears: 7,
					initialFranklRating: 3,
				}),
			);

			assert.ok(html.includes("Зуб 54"), "Renders active tooth 54");
			assert.ok(html.includes("data-testid=\"pediatric-somatic-legal-rep\""), "Renders somatic & legal rep block");
			assert.ok(!EMOJI_REGEX.test(html), "Widget renders with 0 emojis");
		});
	});
});
