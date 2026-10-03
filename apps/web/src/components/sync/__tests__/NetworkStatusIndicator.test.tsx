/**
 * NetworkStatusIndicator.test.tsx — Unit & SSR Tests for Offline Network Indicator & Queue
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NetworkStatusIndicator } from "../NetworkStatusIndicator";
import { OfflineMutationQueueViewer } from "../OfflineMutationQueueViewer";

describe("NetworkStatusIndicator & Offline Mutation Outbox", () => {
	it("1. NetworkStatusIndicator renders cleanly in SSR without errors", () => {
		const markup = renderToStaticMarkup(
			createElement(NetworkStatusIndicator, { compact: false }),
		);

		assert.ok(
			markup.includes('data-testid="network-status-indicator"'),
			"NetworkStatusIndicator should render root element with testid",
		);
		assert.ok(
			markup.includes("Онлайн") || markup.includes("Офлайн") || markup.includes("Сеть"),
			"Indicator should render a localized status label",
		);
	});

	it("2. NetworkStatusIndicator supports compact presentation mode", () => {
		const markup = renderToStaticMarkup(
			createElement(NetworkStatusIndicator, { compact: true }),
		);

		assert.ok(markup.includes('data-testid="network-status-indicator"'));
	});

	it("3. OfflineMutationQueueViewer renders clean empty state", () => {
		const markup = renderToStaticMarkup(
			createElement(OfflineMutationQueueViewer),
		);

		assert.ok(
			markup.includes('data-testid="offline-mutation-queue-viewer"'),
			"Queue viewer should render root element with testid",
		);
		assert.ok(
			markup.includes("Очередь сброса мутаций"),
			"Queue viewer should render header title in Russian",
		);
		assert.ok(
			markup.includes("data-testid=\"drain-outbox-button\""),
			"Queue viewer should include drain button",
		);
	});

	it("4. NetworkStatusIndicator provides accessible role and aria-label", () => {
		const markup = renderToStaticMarkup(
			createElement(NetworkStatusIndicator, { compact: false }),
		);

		assert.ok(
			markup.includes('role="button"'),
			"Indicator capsule must have role=button for accessibility",
		);
		assert.ok(
			markup.includes('aria-label="Статус сети:'),
			"Indicator must provide comprehensive aria-label describing connection status",
		);
		assert.ok(
			markup.includes('tabindex="0"'),
			"Indicator must be keyboard accessible via tabIndex 0",
		);
	});

	it("5. Quiet Telemetry invariant: compact mode omits wordy text labels to prevent clinical UI clutter", () => {
		const markup = renderToStaticMarkup(
			createElement(NetworkStatusIndicator, { compact: true }),
		);

		// Compact mode must retain root capsule, accessibility, and indicator dot
		assert.ok(markup.includes('data-testid="network-status-indicator"'));
		assert.ok(markup.includes('role="button"'));
		assert.ok(markup.includes('rounded-full'));

		// But must NOT render bulky text tags ("Локальная сеть (LAN)") in the button body
		assert.ok(
			!markup.includes("Локальная сеть (LAN)"),
			"Compact mode must enforce Quiet Telemetry and eliminate screaming LAN text ovals",
		);
	});
});

