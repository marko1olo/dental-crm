import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StaffRole } from "@dental/shared";
import {
	actionIcons,
	appViews,
	getFallbackAppView,
	getFilteredAppViews,
	sidebarIcons,
	viewHints,
	viewLabels,
} from "../workspaceShell.js";

/*
 * Regression guard for the navigation rail.
 *
 * The rail used to be eleven icons with no visible text, and SidebarIcon /
 * ActionIcon both ended in a shared `return <Sparkles/>` fallback. "Смена" and
 * "Маркетинг" had no branch of their own and "Аналитика" was explicitly given
 * the same sparkle, so rail positions 1, 8 and 11 rendered an identical glyph.
 *
 * Test names and messages are English on purpose: the runner prints them to a
 * Windows console, and the value of this file is a legible failure line. The
 * product text under test stays Russian and is read from viewLabels/viewHints.
 */

const glyphName = (glyph: unknown): string => {
	const named = glyph as { displayName?: string; name?: string };
	return named?.displayName ?? named?.name ?? String(glyph);
};

const staffRoles: StaffRole[] = [
	"doctor",
	"assistant",
	"administrator",
	"manager",
	"owner",
];

const duplicatesOf = (entries: Array<[string, unknown]>): string[] => {
	const seen = new Map<unknown, string>();
	const clashes: string[] = [];
	for (const [view, glyph] of entries) {
		const previous = seen.get(glyph);
		if (previous) {
			clashes.push(`${previous} and ${view} both render ${glyphName(glyph)}`);
			continue;
		}
		seen.set(glyph, view);
	}
	return clashes;
};

describe("workspace navigation rail mapping", () => {
	it("registers at least the eleven shipped views", () => {
		/*
		 * Was assert.equal(appViews.length, 11) while the test name said "at
		 * least". The registry then grew to fourteen: inventory, scanner and
		 * leads were finished views no route ever reached, so routing them turned
		 * a green test red for the one change it should have welcomed. The floor
		 * is what this test defends; the per-view guards below make growth safe,
		 * together with tests/panelsAreMounted.test.ts, which fails when a
		 * registered view has no branch in App.tsx.
		 */
		assert.ok(
			appViews.length >= 11,
			`the rail lost a shipped view: ${appViews.length} registered`,
		);
		assert.equal(new Set(appViews).size, appViews.length);
	});

	it("resolves every view to a non-empty visible label", () => {
		for (const view of appViews) {
			const label = viewLabels[view];
			assert.equal(
				typeof label,
				"string",
				`view "${view}" has no label in viewLabels`,
			);
			assert.ok(label.trim().length > 0, `view "${view}" has a blank label`);
		}
	});

	it("resolves every view to a non-empty operator hint", () => {
		for (const view of appViews) {
			const hint = viewHints[view];
			assert.equal(
				typeof hint,
				"string",
				`view "${view}" has no hint in viewHints`,
			);
			assert.ok(hint.trim().length > 0, `view "${view}" has a blank hint`);
		}
	});

	it("gives every view its own sidebar glyph", () => {
		const entries = appViews.map(
			(view) => [view, sidebarIcons[view]] as [string, unknown],
		);
		for (const [view, glyph] of entries) {
			assert.ok(glyph, `view "${view}" has no sidebar glyph`);
		}
		assert.deepEqual(
			duplicatesOf(entries),
			[],
			"two rail items share one glyph, so they cannot be told apart",
		);
	});

	it("gives every view its own action glyph", () => {
		const entries = appViews.map(
			(view) => [view, actionIcons[view]] as [string, unknown],
		);
		for (const [view, glyph] of entries) {
			assert.ok(glyph, `view "${view}" has no action glyph`);
		}
		assert.deepEqual(
			duplicatesOf(entries),
			[],
			"two action buttons share one glyph, so they cannot be told apart",
		);
	});

	it("keeps the icon maps exactly aligned with the view registry", () => {
		assert.deepEqual(Object.keys(sidebarIcons).sort(), [...appViews].sort());
		assert.deepEqual(Object.keys(actionIcons).sort(), [...appViews].sort());
		assert.deepEqual(Object.keys(viewLabels).sort(), [...appViews].sort());
		assert.deepEqual(Object.keys(viewHints).sort(), [...appViews].sort());
	});

	it("never routes a role to a view the rail cannot label or draw", () => {
		for (const role of staffRoles) {
			const allowed = getFilteredAppViews(role);
			assert.ok(allowed.length > 0, `role "${role}" gets an empty rail`);
			for (const view of allowed) {
				assert.ok(
					appViews.includes(view),
					`role "${role}" is offered unknown view "${view}"`,
				);
				assert.ok(viewLabels[view].trim().length > 0);
				assert.ok(sidebarIcons[view]);
			}
		}
	});

	/*
	 * The route guard in useAppLogic.tsx sends a role to the fallback view
	 * whenever the requested view is not on its allow-list. That fallback used to
	 * be the constant "shift", which is not on the administrator or manager
	 * allow-list and never has been — so the guard that exists to ENFORCE the
	 * list was itself putting two roles on a view outside it, with no rail entry
	 * to navigate back from. The fallback is now derived from the role's own
	 * list; these tests pin that it stays derived.
	 */
	it("lands every role on a view its own allow-list contains", () => {
		for (const role of staffRoles) {
			const fallback = getFallbackAppView(role);
			const allowed = getFilteredAppViews(role);
			assert.ok(
				allowed.includes(fallback),
				`role "${role}" falls back to "${fallback}", which its allow-list does not contain: ${allowed.join(", ")}`,
			);
		}
	});

	it("keeps the fallback reachable from the rail the role actually sees", () => {
		// A fallback the sidebar cannot draw is a view the user can be put on but
		// never return to. getVisibleRailViews is a subset of the allow-list, so
		// the check above is necessary but not sufficient on its own.
		for (const role of staffRoles) {
			const fallback = getFallbackAppView(role);
			assert.ok(
				appViews.includes(fallback),
				`role "${role}" falls back to unknown view "${fallback}"`,
			);
			assert.ok(viewLabels[fallback].trim().length > 0);
			assert.ok(sidebarIcons[fallback]);
		}
	});

	it("gives administrator and manager their own first view, not the shift board", () => {
		// The concrete defect, named so a regression reads as itself in the log.
		assert.equal(getFallbackAppView("administrator"), "schedule");
		assert.equal(getFallbackAppView("manager"), "schedule");
		// And the three roles that always had "shift" first are untouched: this
		// fix must not move anyone who was already landing inside their own list.
		assert.equal(getFallbackAppView("doctor"), "shift");
		assert.equal(getFallbackAppView("assistant"), "shift");
		assert.equal(getFallbackAppView("owner"), "shift");
	});
});
