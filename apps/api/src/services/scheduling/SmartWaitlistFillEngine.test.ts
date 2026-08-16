import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	SmartWaitlistFillEngine,
	type FreedSlotInfo,
	type WaitlistCandidate,
} from "./SmartWaitlistFillEngine.js";

describe("SmartWaitlistFillEngine — Feature #334 Smart Waitlist Fill", () => {
	const slot: FreedSlotInfo = {
		doctorId: "doc-1",
		durationMinutes: 60,
		startTime: new Date("2026-08-17T14:00:00Z"),
	};

	const candidatePain: WaitlistCandidate = {
		id: "w-1",
		patientId: "pat-1",
		preferredDoctorId: "doc-1",
		requestedDurationMinutes: 60,
		urgency: "urgent_pain",
		waitingSince: new Date("2026-08-17T08:00:00Z"),
	};

	const candidateStandard: WaitlistCandidate = {
		id: "w-2",
		patientId: "pat-2",
		preferredDoctorId: "doc-2",
		requestedDurationMinutes: 30,
		urgency: "standard",
		waitingSince: new Date("2026-08-16T12:00:00Z"),
	};

	const candidateTooLong: WaitlistCandidate = {
		id: "w-3",
		patientId: "pat-3",
		preferredDoctorId: "doc-1",
		requestedDurationMinutes: 90, // Exceeds 60 min
		urgency: "urgent_pain",
		waitingSince: new Date("2026-08-17T09:00:00Z"),
	};

	test("1. Ranks urgent pain and exact doctor match at top", () => {
		const ranked = SmartWaitlistFillEngine.rankCandidates(slot, [
			candidateStandard,
			candidatePain,
			candidateTooLong,
		]);

		assert.equal(ranked.length, 2); // candidateTooLong filtered out
		assert.equal(ranked[0]!.candidate.id, "w-1");
		assert.equal(ranked[0]!.matchScore, 100); // 50 (pain) + 30 (doc) + 20 (exact duration)
	});
});
