/**
 * leadReliabilityScoring.test.ts
 *
 * Verifies Mandate 8ap:
 * 1. Normalized DB facts drive the reliability calculation.
 * 2. Text notes parsing via regex is strictly BANNED (notes have zero effect on scoring).
 * 3. Deterministic scores, confidence factors, risk factors, and tiers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeLeadReliabilityScore,
	type LeadReliabilityInput,
} from "../leads/leadReliabilityScoring.js";

describe("Mandate 8ap: Lead Reliability Scoring Engine", () => {
	it("1. Unrated tier for fresh lead with no history and no channel", () => {
		const freshLead: LeadReliabilityInput = {
			id: "lead-new-1",
			stage: "new",
		};
		const result = computeLeadReliabilityScore(freshLead);
		assert.equal(result.tier, "unrated");
		assert.equal(result.score, 50);
		assert.equal(result.tierLabelRu, "Новое обращение (без истории)");
		assert.ok(result.confidenceFactors.length > 0);
	});

	it("2. High reliability for repeat patient with confirmed consultation and phone channel", () => {
		const repeatLead: LeadReliabilityInput = {
			id: "lead-repeat-1",
			hasExistingPatient: true,
			completedVisitsCount: 4,
			isTimeConfirmed: true,
			channel: "Входящий звонок",
			noShowCount: 0,
		};
		const result = computeLeadReliabilityScore(repeatLead);
		assert.equal(result.tier, "high");
		assert.ok(result.score >= 85, `Score should be >= 85, got ${result.score}`);
		assert.ok(result.confidenceFactors.some((f) => f.includes("Постоянный пациент")));
		assert.ok(result.confidenceFactors.some((f) => f.includes("Время консультации")));
		assert.ok(result.confidenceFactors.some((f) => f.includes("телефонный звонок")));
		assert.equal(result.riskFactors.length, 0);
	});

	it("3. Deducts risk penalties for normalized no-shows without touching notes", () => {
		const riskyLead: LeadReliabilityInput = {
			id: "lead-risky-1",
			hasExistingPatient: true,
			completedVisitsCount: 1,
			isTimeConfirmed: false,
			channel: "Сайт",
			noShowCount: 2, // 2 no-shows: -40 pts
			cancellationsCount: 2, // 2 cancellations: -10 pts
		};
		const result = computeLeadReliabilityScore(riskyLead);
		assert.equal(result.tier, "low");
		assert.ok(result.score < 45, `Score should be < 45, got ${result.score}`);
		assert.ok(result.riskFactors.some((f) => f.includes("пропуск(ов) визита")));
		assert.ok(result.riskFactors.some((f) => f.includes("отмен визитов")));
	});

	it("4. MANDATE 8ap PROOF: Free-form notes text NEVER alters the reliability score", () => {
		const baseLead: LeadReliabilityInput = {
			id: "lead-neutral-1",
			hasExistingPatient: true,
			completedVisitsCount: 2,
			isTimeConfirmed: true,
			channel: "WhatsApp",
			noShowCount: 0,
		};

		// 1. Without notes
		const scoreWithoutNotes = computeLeadReliabilityScore(baseLead);

		// 2. With scary notes that pseudo-scientific legacy systems try to parse
		const scoreWithScaryNotes = computeLeadReliabilityScore({
			...baseLead,
			notes: "Опоздал на 40 минут! Скандалил, угрожал судом, отменил 5 раз, ненадёжный пациент, мошенник!",
		});

		// 3. With glowing praised notes
		const scoreWithFlatteringNotes = computeLeadReliabilityScore({
			...baseLead,
			notes: "Супер надёжный VIP пациент! 100% придёт, оплатил 500 000 руб вперед, рекомендую!",
		});

		// INVARIANT: All three MUST yield the exact identical score and factors!
		assert.equal(
			scoreWithoutNotes.score,
			scoreWithScaryNotes.score,
			"Scary text notes must not change the score",
		);
		assert.equal(
			scoreWithoutNotes.score,
			scoreWithFlatteringNotes.score,
			"Praised text notes must not change the score",
		);
		assert.equal(scoreWithoutNotes.tier, scoreWithScaryNotes.tier);
		assert.deepEqual(scoreWithoutNotes.confidenceFactors, scoreWithScaryNotes.confidenceFactors);
		assert.deepEqual(scoreWithoutNotes.riskFactors, scoreWithScaryNotes.riskFactors);
	});
});
