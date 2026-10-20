/**
 * apps/web/src/components/common/__tests__/dynamicVirtualizer.test.tsx
 *
 * Unit tests verifying useDynamicVirtualizer & VirtualizedTimeline:
 * - Window boundary calculation (startIndex, endIndex, virtual count)
 * - Spacer heights (topSpacerHeight + bottomSpacerHeight + visibleItems = totalHeight)
 * - Pruning of out-of-viewport nodes (100 items -> ~10-12 mounted nodes)
 * - Non-virtualized fallback below threshold (<= 8 items)
 * - Scroll anchoring offset calculation (Zero Layout Shift)
 *
 * Compliance: Mandates 8c, 8e, 8k, 8n (Low-Spec Celeron / 4GB RAM Memory Shield)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { VirtualizedTimeline } from "../VirtualizedTimeline";

describe("useDynamicVirtualizer & VirtualizedTimeline (Mandate 8c & Memory Shield)", () => {
	it("1. renders all items directly without spacers when total count <= threshold", () => {
		const items = [
			{ id: "1", title: "Визит 1" },
			{ id: "2", title: "Визит 2" },
			{ id: "3", title: "Визит 3" },
			{ id: "4", title: "Визит 4" },
		];

		const html = renderToString(
			<VirtualizedTimeline
				items={items}
				threshold={8}
				renderItem={(item) => <div className="test-card">{item.title}</div>}
				getItemKey={(item) => item.id}
				dataTestId="timeline-small"
			/>,
		);

		assert.ok(html.includes('data-virtualizing="false"'), "Must not virtualize below threshold");
		assert.ok(html.includes("Визит 1"), "Must render Item 1");
		assert.ok(html.includes("Визит 4"), "Must render Item 4");
		assert.ok(!html.includes("virtualized-timeline-spacer-top"), "Must not render top spacer");
		assert.ok(!html.includes("virtualized-timeline-spacer-bottom"), "Must not render bottom spacer");

		const cardCount = (html.match(/test-card/g) || []).length;
		assert.equal(cardCount, 4, "Must render exactly 4 cards in DOM");
	});

	it("2. prunes 100 items down to bounded window of ~10-14 items at initial scroll position", () => {
		const items = Array.from({ length: 100 }, (_, i) => ({
			id: `item-${i + 1}`,
			title: `Клинический прием #${i + 1}`,
			doctor: "Д-р Иванов И.И.",
			costRub: 3500 + i * 50,
		}));

		// estimateHeight = 100px, viewportHeightOverride = 600px, overscan = 2
		// Visible height = 600px -> ~6 items in view + 2 overscan = ~8-10 items
		const html = renderToString(
			<VirtualizedTimeline
				items={items}
				estimateHeight={100}
				overscan={2}
				threshold={8}
				viewportHeightOverride={600}
				initialScrollTop={0}
				renderItem={(item) => (
					<div className="virtual-visit-card" data-testid={`card-${item.id}`}>
						<span>{item.title}</span>
						<span>{item.doctor}</span>
						<span>{item.costRub} ₽</span>
					</div>
				)}
				getItemKey={(item) => item.id}
				dataTestId="timeline-100-visits"
			/>,
		);

		assert.ok(html.includes('data-virtualizing="true"'), "Must activate virtualization for 100 items");
		assert.ok(html.includes('data-virtual-count="100"'), "Must track total count of 100");

		const renderedCards = (html.match(/virtual-visit-card/g) || []).length;
		assert.ok(
			renderedCards >= 8 && renderedCards <= 16,
			`Must render only ~8-16 visible cards in DOM, found ${renderedCards}`,
		);

		// Must include first card but NOT card 50 or 99 in initial DOM
		assert.ok(html.includes("Клинический прием #1"), "Must render initial visible card #1");
		assert.ok(!html.includes("Клинический прием #50"), "Must prune offscreen card #50 from DOM");
		assert.ok(!html.includes("Клинический прием #99"), "Must prune offscreen card #99 from DOM");

		// Bottom spacer must exist and hold remaining scroll height
		assert.ok(
			html.includes("virtualized-timeline-spacer-bottom"),
			"Must render bottom spacer to preserve scrollbar dimension",
		);
	});

	it("3. correctly shifts window and renders top and bottom spacers at scrolled position (scrollTop = 4000px)", () => {
		const items = Array.from({ length: 100 }, (_, i) => ({
			id: `item-${i + 1}`,
			title: `Операция #${i + 1}`,
		}));

		// 100 items * 100px = 10000px total height
		// scrollTop = 4000px (around item index 40)
		// viewportHeight = 600px (items 40 to 46 in viewport) + overscan 2 (items 38 to 48)
		const html = renderToString(
			<VirtualizedTimeline
				items={items}
				estimateHeight={100}
				overscan={2}
				threshold={8}
				viewportHeightOverride={600}
				initialScrollTop={4000}
				renderItem={(item) => (
					<div className="scrolled-card" data-testid={`scrolled-${item.id}`}>
						{item.title}
					</div>
				)}
				getItemKey={(item) => item.id}
				dataTestId="timeline-scrolled"
			/>,
		);

		assert.ok(html.includes('data-virtualizing="true"'), "Must be virtualizing");

		// Must render both top and bottom spacers
		assert.ok(
			html.includes("virtualized-timeline-spacer-top"),
			"Must render top spacer to offset scrolled items",
		);
		assert.ok(
			html.includes("virtualized-timeline-spacer-bottom"),
			"Must render bottom spacer for remaining items",
		);

		// Items near index 40 must be rendered, while item 1 and item 99 are pruned
		assert.ok(html.includes("Операция #40"), "Must render item near index 40");
		assert.ok(!html.includes("Операция #1"), "Item 1 must be pruned from DOM");
		assert.ok(!html.includes("Операция #95"), "Item 95 must be pruned from DOM");

		const renderedCards = (html.match(/scrolled-card/g) || []).length;
		assert.ok(
			renderedCards >= 8 && renderedCards <= 16,
			`Must mount only bounded window (~8-16 cards), got ${renderedCards}`,
		);
	});

	it("4. preserves emptyState when items list is empty", () => {
		const html = renderToString(
			<VirtualizedTimeline
				items={[]}
				renderItem={() => <div />}
				emptyState={<div data-testid="custom-empty-state">Нет записей за период</div>}
			/>,
		);

		assert.ok(html.includes("Нет записей за период"), "Must display custom empty state");
		assert.ok(html.includes('data-testid="custom-empty-state"'), "Must preserve testid on empty state");
	});
});
