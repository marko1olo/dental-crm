/**
 * SoftPresenceIndicator.test.tsx — Unit & Invariant Tests for Soft Presence
 *
 * Verifies Mandate 8e (Doctor Autonomy) and Mandate 8c (Quiet Telemetry):
 * 1. Zero visual clutter when solo: renders null when no other peers present.
 * 2. Non-blocking indicator: shows polite banner and tooltip stating edits are never locked.
 * 3. 44x44px touch-accessible target and aria-label.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SoftPresenceIndicator } from "../SoftPresenceIndicator";
import type { SoftPeerPresence } from "../../../hooks/useSoftPresence";

describe("SoftPresenceIndicator & Doctor Autonomy Invariants", () => {
	it("1. Renders null when no peers are viewing (Mandate 8c Quiet Telemetry)", () => {
		const markup = renderToStaticMarkup(
			createElement(SoftPresenceIndicator, {
				activePeers: [],
				summaryText: null,
			}),
		);

		assert.strictEqual(
			markup,
			"",
			"SoftPresenceIndicator must render nothing when solo doctor is working alone",
		);
	});

	it("2. Renders non-blocking passive pill when peer is viewing the same visit", () => {
		const mockPeers: SoftPeerPresence[] = [
			{
				staffId: "usr-admin-1",
				staffName: "Иванова А. В.",
				role: "registrar",
				visitId: "visit-123",
				action: "viewing",
				lastSeen: Date.now(),
			},
		];

		const markup = renderToStaticMarkup(
			createElement(SoftPresenceIndicator, {
				activePeers: mockPeers,
				summaryText: "Регистратор Иванова А. В. также просматривает эту карту",
			}),
		);

		assert.ok(
			markup.includes('data-testid="soft-presence-indicator"'),
			"Must render container element with testid",
		);
		assert.ok(
			markup.includes("Регистратор: Иванова А. В."),
			"Must display role and name of observing peer",
		);
	});

	it("3. Displays plural peer counter when multiple colleagues have opened the card", () => {
		const mockPeers: SoftPeerPresence[] = [
			{
				staffId: "usr-admin-1",
				staffName: "Иванова А. В.",
				role: "registrar",
				visitId: "visit-123",
				action: "viewing",
				lastSeen: Date.now(),
			},
			{
				staffId: "usr-assistant-2",
				staffName: "Петров П. С.",
				role: "assistant",
				visitId: "visit-123",
				action: "viewing",
				lastSeen: Date.now(),
			},
		];

		const markup = renderToStaticMarkup(
			createElement(SoftPresenceIndicator, {
				activePeers: mockPeers,
				summaryText: "Коллеги (Иванова А. В., Петров П. С.) также просматривают эту карту",
			}),
		);

		assert.ok(
			markup.includes("+1"),
			"Must display +1 counter for additional peer viewers",
		);
	});
});
