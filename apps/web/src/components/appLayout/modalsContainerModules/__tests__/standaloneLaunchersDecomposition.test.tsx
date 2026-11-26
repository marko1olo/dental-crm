/**
 * Single-Shell Route Resolution & Studio Overlay Host SSOT Invariant Test.
 * Мандаты 8b (Sweet Spot), 8e (Автономия врача), 8aq (Монтирование в UI), 8wy (Изоляция демо/прод).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	matchesDeepLink,
	evaluateLaunchersRegistry,
	type DeepLinkUrlContext,
	type LauncherRegistryEntry,
} from "../standalone/deepLinkMatcher";
import { resolveClinicRoute } from "../../../../router/routeResolver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modulesDir = path.resolve(__dirname, "..");

describe("Standalone Launchers Decomposition & Routing SSOT Suite", () => {
	it("1.1. Фасад StandaloneLaunchers.tsx не превышает 120 строк", () => {
		const facadePath = path.join(modulesDir, "StandaloneLaunchers.tsx");
		assert.ok(fs.existsSync(facadePath), "StandaloneLaunchers.tsx must exist");

		const content = fs.readFileSync(facadePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(lines <= 120, `StandaloneLaunchers.tsx must be <= 120 lines, actual: ${lines}`);
		assert.ok(content.includes("renderStandaloneLaunchers"), "Must export renderStandaloneLaunchers");
	});

	it("1.2. Субмодули реестров и matcher находятся в целевом Sweet Spot диапазоне", () => {
		const clinicalPath = path.join(modulesDir, "standalone/clinicalLaunchersRegistry.tsx");
		const adminPath = path.join(modulesDir, "standalone/administrativeLaunchersRegistry.tsx");
		const matcherPath = path.join(modulesDir, "standalone/deepLinkMatcher.ts");

		assert.ok(fs.existsSync(clinicalPath), "clinicalLaunchersRegistry.tsx must exist");
		assert.ok(fs.existsSync(adminPath), "administrativeLaunchersRegistry.tsx must exist");
		assert.ok(fs.existsSync(matcherPath), "deepLinkMatcher.ts must exist");
	});

	it("2.1. matchesDeepLink корректно сопоставляет точные хеши и хеш-префиксы", () => {
		const loyaltyContext: DeepLinkUrlContext = {
			search: "",
			hash: "#loyalty",
			pathname: "/",
			searchParams: new URLSearchParams(),
		};
		assert.equal(
			matchesDeepLink({ exactHashes: ["#loyalty", "#bonuses"], hashPrefixes: ["#loyalty?", "#loyalty/"] }, loyaltyContext),
			true,
		);
	});

	it("3.1. routeResolver + WorkspaceStudioOverlayHost поддерживают все клинические и бизнес студии", () => {
		const cases: Array<[string, string, string]> = [
			["", "#odontogram?patientId=p1", "odontogram_fullscreen"],
			["", "#endo?patientId=p1", "endo"],
			["", "#orthopedics?patientId=p1", "orthopedics"],
			["", "#ortho?patientId=p1", "orthodontics"],
			["", "#surgery?patientId=p1", "surgery"],
			["", "#hygiene?patientId=p1", "hygiene"],
			["", "#consents?patientId=p1", "consents"],
			["", "#loyalty", "loyalty"],
			["", "#dms", "dms"],
			["", "#telephony", "telephony"],
			["", "#cashbox", "cashbox"],
			["", "#sanpin", "sanpin"],
			["", "#copilot", "copilot"],
			["", "#patient-card?patientId=p1", "patient_card"],
		];
		for (const [s, h, expectedKind] of cases) {
			const res = resolveClinicRoute(s, h);
			assert.equal(res.studio?.kind, expectedKind, `Expected ${expectedKind} for ${s} ${h}`);
		}
	});

	it("3.3. evaluateLaunchersRegistry возвращает компонент при совпадении критериев", () => {
		const testRegistry: readonly LauncherRegistryEntry<Record<string, never>>[] = [
			{
				id: "dummy-test",
				title: "Тестовый стенд",
				criteria: { exactHashes: ["#test-stand"] },
				render: () => null,
			},
		];
		const testContext: DeepLinkUrlContext = {
			search: "",
			hash: "#test-stand",
			pathname: "/",
			searchParams: new URLSearchParams(),
		};
		assert.equal(evaluateLaunchersRegistry(testRegistry, {}, testContext), null);
	});
});
