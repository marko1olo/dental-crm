import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateNpsMetrics,
	getNpsCategory,
	getNpsUrgency,
} from "../omnichannelEngine.js";
import type { NpsReview } from "../omnichannelTypes.js";

describe("omnichannelEngine — NPS Calculation & Urgency Triage", () => {
	it("correctly calculates NPS index, percentages, and average score", () => {
		const reviews: NpsReview[] = [
			{
				id: "1",
				patientId: "p1",
				patientName: "Иванов И.И.",
				phone: "+79991112233",
				score: 10,
				category: "promoter",
				urgency: "low",
				comment: "Супер!",
				doctorName: "Кузнецова Е.В.",
				serviceName: "Терапия",
				createdAt: "2026-08-28T10:00:00.000Z",
				status: "thanked",
			},
			{
				id: "2",
				patientId: "p2",
				patientName: "Петров П.П.",
				phone: "+79992223344",
				score: 9,
				category: "promoter",
				urgency: "low",
				comment: "Отлично!",
				doctorName: "Кузнецова Е.В.",
				serviceName: "Терапия",
				createdAt: "2026-08-28T10:00:00.000Z",
				status: "thanked",
			},
			{
				id: "3",
				patientId: "p3",
				patientName: "Сидоров С.С.",
				phone: "+79993334455",
				score: 8,
				category: "neutral",
				urgency: "medium",
				comment: "Нормально",
				doctorName: "Морозов А.И.",
				serviceName: "Хирургия",
				createdAt: "2026-08-28T10:00:00.000Z",
				status: "resolved",
			},
			{
				id: "4",
				patientId: "p4",
				patientName: "Козлов К.К.",
				phone: "+79994445566",
				score: 4,
				category: "detractor",
				urgency: "critical",
				comment: "Болит десна!",
				doctorName: "Соколова Н.П.",
				serviceName: "Эндодонтия",
				createdAt: "2026-08-28T10:00:00.000Z",
				status: "pending",
			},
		];

		const metrics = calculateNpsMetrics(reviews);
		assert.equal(metrics.totalReviews, 4);
		assert.equal(metrics.promotersCount, 2);
		assert.equal(metrics.promotersPct, 50);
		assert.equal(metrics.neutralsCount, 1);
		assert.equal(metrics.neutralsPct, 25);
		assert.equal(metrics.detractorsCount, 1);
		assert.equal(metrics.detractorsPct, 25);
		assert.equal(metrics.npsScore, 25);
		assert.equal(metrics.averageScore, 7.8);
		assert.equal(metrics.criticalPendingCount, 1);
	});

	it("handles empty reviews array safely", () => {
		const metrics = calculateNpsMetrics([]);
		assert.equal(metrics.totalReviews, 0);
		assert.equal(metrics.npsScore, 0);
		assert.equal(metrics.averageScore, 0);
		assert.equal(metrics.criticalPendingCount, 0);
	});

	it("categorizes NPS scores accurately", () => {
		assert.equal(getNpsCategory(10), "promoter");
		assert.equal(getNpsCategory(8), "neutral");
		assert.equal(getNpsCategory(4), "detractor");
	});

	it("triages urgency badges and critical cases for chief medical officer", () => {
		const crit = getNpsUrgency(3);
		assert.equal(crit.urgency, "critical");
		assert.ok(crit.badgeText.includes("главврача"));
		assert.equal(getNpsUrgency(6).urgency, "high");
		assert.equal(getNpsUrgency(7).urgency, "medium");
		assert.equal(getNpsUrgency(10).urgency, "low");
	});
});
