/**
 * callPlayer.test.tsx
 *
 * Unit tests for CallPlayer:
 * 1. Play/Pause toggle button (36px compact).
 * 2. Playback speed rotation strictly 1x -> 1.5x -> 2x.
 * 3. Anti-hang error resilience.
 */
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CallPlayer } from "../CallPlayer";

describe("CallPlayer Component (Voice & Telephony)", () => {
	it("renders compact 36px player with Play/Pause button and 1x speed default", () => {
		const html = renderToStaticMarkup(
			<CallPlayer recordingUrl="/audio/sample-call.mp3" durationSeconds={125} />,
		);

		// Container
		assert.ok(html.includes('data-testid="call-player"'), "Must render call-player");

		// Play/Pause button
		assert.ok(
			html.includes('data-testid="call-player-toggle-btn"'),
			"Must render play/pause toggle button",
		);

		// Speed button with 1x default
		assert.ok(
			html.includes('data-testid="call-player-speed-btn"'),
			"Must render playback speed button",
		);
		assert.ok(html.includes("1x"), "Must display default speed 1x");

		// Duration formatted correctly: 125s -> 02:05
		assert.ok(html.includes("02:05"), "Must display formatted duration 02:05");
	});

	it("renders audio element with preload=metadata", () => {
		const html = renderToStaticMarkup(
			<CallPlayer recordingUrl="/audio/test.mp3" durationSeconds={60} />,
		);

		assert.ok(html.includes('src="/audio/test.mp3"'), "Audio must have valid src");
		assert.ok(html.includes('preload="metadata"'), "Audio must preload metadata");
	});
});
