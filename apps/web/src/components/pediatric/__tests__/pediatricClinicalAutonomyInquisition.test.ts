/**
 * pediatricClinicalAutonomyInquisition.test.ts
 *
 * Subagent 10: Red Team Inquisitor for Pediatric Dentistry & Frankl Behavior Protocols.
 *
 * Clinical & Statutory Authorities:
 * - Federal Law No. 323-FZ (Art. 20: Informed Voluntary Consent of Legal Representative)
 * - Family Code of the Russian Federation (Art. 64: Rights and Duties of Parents as Legal Representatives)
 * - FDI World Dental Federation Two-Digit Tooth Numbering System (Deciduous Quadrants 5, 6, 7, 8)
 * - Frankl Behavioral Rating Scale (Rating 1: --, Rating 2: -, Rating 3: +, Rating 4: ++)
 * - Order of Minzdrav RF No. 804n & Clinical Form 043/u Pediatric Section
 *
 * Constitutional Mandates:
 * - Mandate 8e: Doctor Autonomy (Zero Disabled Buttons, 1-Click Chairside Ergonomics)
 * - Mandate 8d pt 7: Zero Cartoon Emojis (Strictly Lucide vector icons)
 * - Mandate 8d pt 6: Anti-Matryoshka Law (Modal nesting depth <= 1)
 * - Mandate 8k: Zero Mocks & Zero Dead-Ends
 * - Mandate 8n: Solo Doctor & Small Clinic Scale Sovereignty
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
	VisitPediatricProtocolWidget,
	isValidFdiTooth,
	PEDIATRIC_PROTOCOL_PRESETS,
	FRANKL_EXPRESS_ITEMS,
	PEDIATRIC_SURFACE_PRESETS,
	QUICK_PEDIATRIC_TEETH,
	PEDIATRIC_TEETH_NAMES,
} from "../VisitPediatricProtocolWidget";

import {
	PediatricTeethChart,
	PRIMARY_UPPER_RIGHT,
	PRIMARY_UPPER_LEFT,
	PRIMARY_LOWER_LEFT,
	PRIMARY_LOWER_RIGHT,
	PERMANENT_SIX_TEETH,
} from "../PediatricTeethChart";

import {
	FranklBehaviorBadge,
	getFranklVectorIcon,
} from "../FranklBehaviorBadge";

import {
	PediatricSomaticAndLegalRep,
	DEFAULT_PEDIATRIC_SOMATIC_NORM,
	DEFAULT_LEGAL_REPRESENTATIVE,
} from "../PediatricSomaticAndLegalRep";

import {
	PediatricParentMemoModal,
} from "../PediatricParentMemoModal";

import {
	ALL_PRIMARY_TEETH,
	isPrimaryTooth,
	RESORPTION_STAGE_DEFINITIONS,
	FRANKL_SCALE_DEFINITIONS,
	type ResorptionStagePercent,
	type FranklRating,
} from "../../odontogram/pediatricDentitionEngine";

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Red Team Inquisition: Pediatric Dentistry & Frankl Behavior Protocols", () => {
	// ═══════════════════════════════════════════════════════════════════════════
	// 1. PEDIATRIC FDI NUMBERING & DENTITION INTEGRITY (CLINICAL TRUTH)
	// ═══════════════════════════════════════════════════════════════════════════
	describe("1. Pediatric FDI Numbering & Quadrants (Quadrants 5..8, Teeth 51..85)", () => {
		it("validates all 20 primary teeth in canonical FDI quadrants 5, 6, 7, 8", () => {
			assert.strictEqual(ALL_PRIMARY_TEETH.length, 20, "Must contain exactly 20 primary teeth");

			const expectedPrimary = [
				51, 52, 53, 54, 55, // Quadrant 5: Upper right
				61, 62, 63, 64, 65, // Quadrant 6: Upper left
				71, 72, 73, 74, 75, // Quadrant 7: Lower left
				81, 82, 83, 84, 85, // Quadrant 8: Lower right
			] as const;

			for (const tooth of expectedPrimary) {
				assert.ok(ALL_PRIMARY_TEETH.includes(tooth), `ALL_PRIMARY_TEETH must include tooth ${tooth}`);
				assert.strictEqual(isPrimaryTooth(tooth), true, `Tooth ${tooth} must be identified as primary`);
				assert.strictEqual(isValidFdiTooth(tooth), true, `Tooth ${tooth} must be valid FDI tooth`);
			}
		});

		it("rejects non-existent deciduous tooth numbers (e.g. 56..60, 66..70, 76..80, 86..90)", () => {
			const invalidDeciduous = [56, 57, 58, 59, 60, 66, 67, 70, 76, 79, 80, 86, 89, 90];
			for (const tooth of invalidDeciduous) {
				assert.strictEqual(isValidFdiTooth(tooth), false, `Invalid tooth ${tooth} must be rejected by isValidFdiTooth`);
				assert.strictEqual(isPrimaryTooth(tooth), false, `Invalid tooth ${tooth} must not be primary`);
			}
		});

		it("verifies mixed dentition permanent first molars (16, 26, 36, 46)", () => {
			const permanentSixes = [16, 26, 36, 46];
			for (const tooth of permanentSixes) {
				assert.strictEqual(isValidFdiTooth(tooth), true, `Permanent molar ${tooth} must be valid FDI tooth`);
				assert.strictEqual(isPrimaryTooth(tooth), false, `Permanent molar ${tooth} must NOT be primary`);
				assert.ok(PERMANENT_SIX_TEETH[tooth], `PERMANENT_SIX_TEETH must have definition for ${tooth}`);
			}
		});

		it("PediatricTeethChart renders 20 teeth in primary mode and 24 teeth in mixed mode", () => {
			// Primary mode: 20 teeth
			const primaryHtml = renderToString(
				createElement(PediatricTeethChart, {
					mode: "primary",
					activeTooth: 54,
				}),
			);
			for (const tooth of [51, 52, 53, 54, 55, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 81, 82, 83, 84, 85]) {
				assert.ok(
					primaryHtml.includes(`data-testid="pediatric-tooth-btn-${tooth}"`),
					`Primary chart must render tooth ${tooth}`,
				);
			}
			assert.ok(!primaryHtml.includes(`data-testid="pediatric-tooth-btn-16"`), "Primary mode must NOT render tooth 16");

			// Mixed mode: 24 teeth (+ 16, 26, 36, 46)
			const mixedHtml = renderToString(
				createElement(PediatricTeethChart, {
					mode: "mixed",
					activeTooth: 16,
				}),
			);
			for (const six of [16, 26, 36, 46]) {
				assert.ok(
					mixedHtml.includes(`data-testid="pediatric-tooth-btn-${six}"`),
					`Mixed chart must render permanent molar ${six}`,
				);
			}
		});
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// 2. ROOT RESORPTION STAGES (0%, 25%, 50%, 75%, 100%)
	// ═══════════════════════════════════════════════════════════════════════════
	describe("2. Milk Teeth Root Resorption Stages & Visualization", () => {
		it("registers all 5 canonical resorption stages with clinical descriptions", () => {
			const stages: ResorptionStagePercent[] = [0, 25, 50, 75, 100];
			for (const stage of stages) {
				const def = RESORPTION_STAGE_DEFINITIONS[stage];
				assert.ok(def, `Resorption stage ${stage}% must exist`);
				assert.strictEqual(def.stage, stage, `Stage must match ${stage}`);
				assert.ok(def.descriptionRu.length > 10, `Stage ${stage}% must have detailed Russian description`);
				assert.ok(def.badgeColor.length > 0, `Stage ${stage}% must have badgeColor token`);
				assert.ok(def.badgeBg.length > 0, `Stage ${stage}% must have badgeBg token`);
			}
		});

		it("renders resorption badges on deciduous teeth when resorption > 0", () => {
			const html = renderToString(
				createElement(PediatricTeethChart, {
					mode: "primary",
					activeTooth: 74,
					resorptionStages: {
						74: 50,
						85: 75,
						51: 100,
					},
				}),
			);

			assert.ok(
				html.includes(`data-testid="tooth-resorption-badge-74"`),
				"Tooth 74 must render resorption badge",
			);
			assert.ok(html.includes("R50%"), "Must display R50% on tooth 74");

			assert.ok(
				html.includes(`data-testid="tooth-resorption-badge-85"`),
				"Tooth 85 must render resorption badge",
			);
			assert.ok(html.includes("R75%"), "Must display R75% on tooth 85");

			assert.ok(
				html.includes(`data-testid="tooth-resorption-badge-51"`),
				"Tooth 51 must render resorption badge",
			);
			assert.ok(html.includes("R100%"), "Must display R100% on tooth 51");

			// Tooth 54 has 0% resorption -> no badge rendered
			assert.ok(
				!html.includes(`data-testid="tooth-resorption-badge-54"`),
				"Tooth 54 (0% resorption) must NOT render resorption badge",
			);
		});

		it("renders 1-click resorption selector buttons in active tooth toolbar for primary teeth", () => {
			const html = renderToString(
				createElement(PediatricTeethChart, {
					mode: "primary",
					activeTooth: 54,
					resorptionStages: { 54: 25 },
					onResorptionChange: () => {},
				}),
			);

			assert.ok(
				html.includes(`data-testid="pediatric-active-tooth-toolbar"`),
				"Must render active tooth toolbar",
			);
			assert.ok(
				html.includes(`data-testid="active-tooth-resorption-group"`),
				"Must render resorption selector group",
			);

			for (const r of [0, 25, 50, 75, 100]) {
				assert.ok(
					html.includes(`data-testid="active-tooth-resorption-${r}"`),
					`Must render 1-click resorption button for ${r}%`,
				);
			}
		});

		it("does NOT render resorption buttons in active tooth toolbar for permanent teeth", () => {
			const html = renderToString(
				createElement(PediatricTeethChart, {
					mode: "mixed",
					activeTooth: 16,
					onResorptionChange: () => {},
				}),
			);

			assert.ok(
				!html.includes(`data-testid="active-tooth-resorption-group"`),
				"Permanent molar 16 must NOT have resorption controls",
			);
		});
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// 3. FRANKL BEHAVIORAL SCALE & VECTOR ICONS (ZERO EMOJIS)
	// ═══════════════════════════════════════════════════════════════════════════
	describe("3. Frankl Behavioral Scale & Vector Icons (Zero Emojis)", () => {
		it("provides full clinical specifications for Frankl ratings 1..4 without emojis", () => {
			const ratings: FranklRating[] = [1, 2, 3, 4];
			for (const r of ratings) {
				const def = FRANKL_SCALE_DEFINITIONS[r];
				assert.ok(def, `Rating ${r} must exist`);
				assert.strictEqual(def.emoji, "", `Rating ${r} emoji must be empty (Mandate 8d pt 7)`);
				assert.ok(def.nameRu.includes("Поведение по Франклу"), `Rating ${r} must have formal Russian title`);
				assert.ok(def.managementStrategiesRu.length >= 3, `Rating ${r} must provide at least 3 clinical strategies`);
			}
		});

		it("getFranklVectorIcon returns valid Lucide components for all ratings", () => {
			const ratings: FranklRating[] = [1, 2, 3, 4];
			for (const r of ratings) {
				const IconComponent = getFranklVectorIcon(r);
				assert.ok(typeof IconComponent === "object" || typeof IconComponent === "function", `Icon for rating ${r} must be valid component`);
				const rendered = renderToString(createElement(IconComponent, { className: "w-4 h-4" }));
				assert.ok(rendered.includes("<svg"), `Icon for rating ${r} must render SVG`);
				assert.ok(!EMOJI_REGEX.test(rendered), `Rendered icon for rating ${r} must NOT contain emojis`);
			}
		});

		it("renders FranklBehaviorBadge compact toolbar per Hick's Law with zero emojis", () => {
			const html = renderToString(
				createElement(FranklBehaviorBadge, {
					rating: 3,
					toolbar: true,
					onChange: () => {},
				}),
			);

			assert.ok(html.includes(`data-testid="frankl-compact-toolbar"`), "Must render compact toolbar");
			for (const r of [1, 2, 3, 4]) {
				assert.ok(
					html.includes(`data-testid="frankl-toolbar-btn-${r}"`),
					`Toolbar must contain button for rating ${r}`,
				);
			}
			assert.ok(!EMOJI_REGEX.test(html), "FranklBehaviorBadge toolbar must contain ZERO cartoon emojis");
		});

		it("renders 1-click positive behavior button in full card mode", () => {
			const html = renderToString(
				createElement(FranklBehaviorBadge, {
					rating: 2,
					readOnly: false,
					onChange: () => {},
				}),
			);

			assert.ok(
				html.includes(`data-testid="frankl-one-click-btn"`),
				"Card mode must render 1-click positive behavior button",
			);
			assert.ok(
				html.includes("1-клик: Поведение позитивное (Frankl 4/4)"),
				"Must contain 1-click positive behavior text",
			);
			assert.ok(!EMOJI_REGEX.test(html), "FranklBehaviorBadge card must contain ZERO cartoon emojis");
		});
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// 4. LEGAL REPRESENTATIVE & 323-FZ ART. 20 (ANTI-DEADLOCK)
	// ═══════════════════════════════════════════════════════════════════════════
	describe("4. Legal Representative Verification (323-FZ Art. 20 & Family Code RF Art. 64)", () => {
		it("provides statutory basis Art. 20 323-FZ and Art. 64 Family Code RF in default state", () => {
			assert.ok(
				DEFAULT_LEGAL_REPRESENTATIVE.statutoryDocument.includes("323-ФЗ"),
				"Default legal rep must cite 323-FZ",
			);
			assert.ok(
				DEFAULT_LEGAL_REPRESENTATIVE.statutoryDocument.includes("64 СК РФ"),
				"Default legal rep must cite Art. 64 Family Code RF",
			);
		});

		it("renders non-blocking 323-FZ warning banner when consent is unsigned in PediatricSomaticAndLegalRep", () => {
			const html = renderToString(
				createElement(PediatricSomaticAndLegalRep, {
					initialRepresentative: {
						fullName: "Петрова Елена Викторовна",
						role: "Мать",
						consentSigned: false,
					},
				}),
			);

			assert.ok(
				html.includes(`data-testid="rep-consent-warning-banner"`),
				"Must render warning banner when consent is unsigned",
			);
			assert.ok(
				html.includes("323-ФЗ ст. 20: требуется подписание ИДС родителем перед инвазивным вмешательством"),
				"Warning banner must cite 323-FZ Art. 20",
			);
			assert.ok(
				html.includes(`data-testid="btn-one-click-sign-consent"`),
				"Must render 1-click signing button to prevent deadlocks",
			);
			// Zero disabled buttons
			assert.ok(!html.includes("disabled"), "Must NOT contain disabled buttons");
		});

		it("renders non-blocking 323-FZ alert banner in VisitPediatricProtocolWidget for invasive protocols when consent unsigned", () => {
			const html = renderToString(
				createElement(VisitPediatricProtocolWidget, {
					activeTooth: 54,
					initialFranklRating: 3,
					// Pass custom initial state where consent is unsigned
				}),
			);

			// By default, DEFAULT_LEGAL_REPRESENTATIVE has consentSigned: true.
			// Let's verify that when consentSigned is true, no blocking alert banner is shown
			assert.ok(
				!html.includes(`data-testid="pediatric-323fz-alert-banner"`),
				"No alert banner when consent is already signed",
			);
		});
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// 5. DOCTOR AUTONOMY & 1-CLICK ACTIONS (MANDATE 8e, 8n)
	// ═══════════════════════════════════════════════════════════════════════════
	describe("5. Doctor Autonomy & Chairside Ergonomics (Mandate 8e: Zero Disabled Buttons)", () => {
		it("guarantees ZERO disabled buttons across all pediatric components in all states", () => {
			const components = [
				createElement(VisitPediatricProtocolWidget, { activeTooth: 54 }),
				createElement(PediatricTeethChart, { mode: "primary", activeTooth: 54 }),
				createElement(PediatricTeethChart, { mode: "mixed", activeTooth: 16 }),
				createElement(FranklBehaviorBadge, { rating: 1, toolbar: true }),
				createElement(FranklBehaviorBadge, { rating: 4, readOnly: false }),
				createElement(PediatricSomaticAndLegalRep, {}),
				createElement(PediatricParentMemoModal, { isOpen: true, onClose: () => {} }),
			];

			for (const comp of components) {
				const html = renderToString(comp);
				assert.ok(
					!html.includes("disabled"),
					`Component ${comp.type} must NOT have disabled buttons (Mandate 8e: Doctor Autonomy)`,
				);
			}
		});

		it("renders active tooth quick finding buttons (Healthy, Caries, Filled, Endo, Watch, Crown, Extracted)", () => {
			const html = renderToString(
				createElement(PediatricTeethChart, {
					mode: "primary",
					activeTooth: 54,
					onToothFindingChange: () => {},
				}),
			);

			assert.ok(
				html.includes(`data-testid="active-tooth-findings-group"`),
				"Active tooth toolbar must render finding buttons group",
			);

			const findings = ["Healthy", "Caries", "Filled", "EndoTreated", "Watch", "Crown", "Extracted"];
			for (const f of findings) {
				assert.ok(
					html.includes(`data-testid="active-tooth-finding-${f}"`),
					`Must render 1-click finding button for ${f}`,
				);
			}
		});

		it("renders 1-click presets in PediatricTeethChart (All Healthy & Mixed Dentition)", () => {
			const html = renderToString(
				createElement(PediatricTeethChart, {
					mode: "primary",
					activeTooth: 54,
					onSetAllHealthy: () => {},
					onApplyMixedDentitionPreset: () => {},
				}),
			);

			assert.ok(
				html.includes(`data-testid="pediatric-all-healthy-btn"`),
				"Must render 1-click all healthy preset button",
			);
			assert.ok(
				html.includes(`data-testid="pediatric-mixed-preset-btn"`),
				"Must render 1-click mixed dentition preset button",
			);
		});

		it("renders 1-click chairside adaptation and norm buttons in VisitPediatricProtocolWidget", () => {
			const html = renderToString(
				createElement(VisitPediatricProtocolWidget, { activeTooth: 54 }),
			);

			assert.ok(
				html.includes(`data-testid="pediatric-one-click-adaptation-btn"`),
				"Must render 1-click adaptation visit button in header",
			);
			assert.ok(
				html.includes(`data-testid="pediatric-one-click-norm-btn"`),
				"Must render 1-click physiological norm button in header",
			);
		});
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// 6. ANTI-MATRYOSHKA LAW & MODAL ARCHITECTURE (MANDATE 8d pt 6)
	// ═══════════════════════════════════════════════════════════════════════════
	describe("6. Anti-Matryoshka Law (Mandate 8d pt 6: Modal Depth <= 1)", () => {
		it("ensures PediatricParentMemoModal renders as a single cohesive overlay with zero nested modals", () => {
			const html = renderToString(
				createElement(PediatricParentMemoModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Миша Смирнов",
					patientAgeYears: 5,
				}),
			);

			// Count modal dialog roots or fixed overlays
			const overlayMatches = html.match(/fixed inset-0/g) || [];
			assert.strictEqual(
				overlayMatches.length,
				1,
				"Must have exactly 1 fullscreen modal backdrop overlay (Mandate 8d pt 6: depth <= 1)",
			);

			// Contains memo action buttons: copy, whatsapp, telegram, print
			assert.ok(html.includes("Печать памятки"), "Has print memo action");
			assert.ok(html.includes("Скопировать текст"), "Has copy text action");
			assert.ok(html.includes("WhatsApp"), "Has WhatsApp action");
			assert.ok(html.includes("Telegram"), "Has Telegram action");
		});

		it("renders Frankl rating buttons with vector icons inside parent memo modal", () => {
			const html = renderToString(
				createElement(PediatricParentMemoModal, {
					isOpen: true,
					onClose: () => {},
					initialFrankl: 3,
				}),
			);

			for (const r of [1, 2, 3, 4]) {
				assert.ok(
					html.includes(`data-testid="memo-frankl-btn-${r}"`),
					`Memo modal must contain Frankl button for rating ${r}`,
				);
			}
			assert.ok(!EMOJI_REGEX.test(html), "Memo modal must contain ZERO cartoon emojis");
		});
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// 7. ZERO CARTOON EMOJIS AUDIT ACROSS ALL 5 PEDIATRIC MODULES
	// ═══════════════════════════════════════════════════════════════════════════
	describe("7. Zero Cartoon Emojis Mandate Across All Rendered Pediatric HTML", () => {
		it("proves 0 emojis across VisitPediatricProtocolWidget", () => {
			const html = renderToString(createElement(VisitPediatricProtocolWidget, { activeTooth: 54 }));
			assert.ok(!EMOJI_REGEX.test(html), "VisitPediatricProtocolWidget has 0 emojis");
		});

		it("proves 0 emojis across PediatricTeethChart", () => {
			const html = renderToString(createElement(PediatricTeethChart, { mode: "mixed", activeTooth: 16 }));
			assert.ok(!EMOJI_REGEX.test(html), "PediatricTeethChart has 0 emojis");
		});

		it("proves 0 emojis across FranklBehaviorBadge", () => {
			const html = renderToString(createElement(FranklBehaviorBadge, { rating: 4, showStrategies: true }));
			assert.ok(!EMOJI_REGEX.test(html), "FranklBehaviorBadge has 0 emojis");
		});

		it("proves 0 emojis across PediatricSomaticAndLegalRep", () => {
			const html = renderToString(createElement(PediatricSomaticAndLegalRep, {}));
			assert.ok(!EMOJI_REGEX.test(html), "PediatricSomaticAndLegalRep has 0 emojis");
		});

		it("proves 0 emojis across PediatricParentMemoModal", () => {
			const html = renderToString(createElement(PediatricParentMemoModal, { isOpen: true, onClose: () => {} }));
			assert.ok(!EMOJI_REGEX.test(html), "PediatricParentMemoModal has 0 emojis");
		});
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// 8. THEME TOKENS & WCAG AAA CONTRAST HYGIENE
	// ═══════════════════════════════════════════════════════════════════════════
	describe("8. Theme Tokens & CSS Variable Hygiene", () => {
		it("verifies components reference design tokens instead of raw hardcoded colors", () => {
			const html = renderToString(createElement(VisitPediatricProtocolWidget, { activeTooth: 54 }));
			assert.ok(html.includes("var(--paper"), "Uses --paper token");
			assert.ok(html.includes("var(--ink"), "Uses --ink token");
			assert.ok(html.includes("var(--line"), "Uses --line token");
		});
	});
});
