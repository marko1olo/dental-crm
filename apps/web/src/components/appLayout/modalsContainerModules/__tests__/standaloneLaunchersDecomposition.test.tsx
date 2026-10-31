/**
 * Standalone Launchers Decomposition & Deep Link Routing SSOT Invariant Test.
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
import { CLINICAL_LAUNCHERS_REGISTRY } from "../standalone/clinicalLaunchersRegistry";
import { ADMINISTRATIVE_LAUNCHERS_REGISTRY } from "../standalone/administrativeLaunchersRegistry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modulesDir = path.resolve(__dirname, "..");

describe("Standalone Launchers Decomposition & Routing SSOT Suite", () => {
	// =========================================================================
	// 1. МАНДАТ 8b: SWEET SPOT РАЗМЕРОВ ФАЙЛОВ И АНТИ-МОНОЛИТ
	// =========================================================================
	it("1.1. Фасад StandaloneLaunchers.tsx не превышает 120 строк", () => {
		const facadePath = path.join(modulesDir, "StandaloneLaunchers.tsx");
		assert.ok(fs.existsSync(facadePath), "StandaloneLaunchers.tsx must exist");

		const content = fs.readFileSync(facadePath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(
			lines <= 120,
			`StandaloneLaunchers.tsx must be <= 120 lines, actual: ${lines}`,
		);
		assert.ok(
			content.includes("renderStandaloneLaunchers"),
			"Must export renderStandaloneLaunchers",
		);
		assert.ok(
			content.includes("renderClinicalLaunchers"),
			"Must delegate to renderClinicalLaunchers",
		);
		assert.ok(
			content.includes("renderAdministrativeLaunchers"),
			"Must delegate to renderAdministrativeLaunchers",
		);
	});

	it("1.2. Субмодули реестров и matcher находятся в целевом Sweet Spot диапазоне", () => {
		const clinicalPath = path.join(
			modulesDir,
			"standalone/clinicalLaunchersRegistry.tsx",
		);
		const adminPath = path.join(
			modulesDir,
			"standalone/administrativeLaunchersRegistry.tsx",
		);
		const matcherPath = path.join(
			modulesDir,
			"standalone/deepLinkMatcher.ts",
		);

		assert.ok(fs.existsSync(clinicalPath), "clinicalLaunchersRegistry.tsx must exist");
		assert.ok(fs.existsSync(adminPath), "administrativeLaunchersRegistry.tsx must exist");
		assert.ok(fs.existsSync(matcherPath), "deepLinkMatcher.ts must exist");

		const clinicalLines = fs.readFileSync(clinicalPath, "utf-8").split("\n").length;
		const adminLines = fs.readFileSync(adminPath, "utf-8").split("\n").length;
		const matcherLines = fs.readFileSync(matcherPath, "utf-8").split("\n").length;

		assert.ok(
			clinicalLines <= 400,
			`clinicalLaunchersRegistry.tsx must be <= 400 lines (Sweet Spot), actual: ${clinicalLines}`,
		);
		assert.ok(
			adminLines <= 400,
			`administrativeLaunchersRegistry.tsx must be <= 400 lines (Sweet Spot), actual: ${adminLines}`,
		);
		assert.ok(
			matcherLines <= 180,
			`deepLinkMatcher.ts must be <= 180 lines, actual: ${matcherLines}`,
		);
	});

	// =========================================================================
	// 2. ДЕКЛАРАТИВНЫЙ DEEP LINK MATCHER: ГРАНИЧНЫЕ УСЛОВИЯ И ИСКЛЮЧЕНИЯ
	// =========================================================================
	it("2.1. matchesDeepLink корректно сопоставляет точные хеши и хеш-префиксы", () => {
		const loyaltyContext: DeepLinkUrlContext = {
			search: "",
			hash: "#loyalty",
			pathname: "/",
			searchParams: new URLSearchParams(),
		};
		const matched = matchesDeepLink(
			{
				exactHashes: ["#loyalty", "#bonuses"],
				hashPrefixes: ["#loyalty?", "#loyalty/"],
			},
			loyaltyContext,
		);
		assert.equal(matched, true, "Exact hash #loyalty must match");

		const loyaltyPrefixContext: DeepLinkUrlContext = {
			search: "",
			hash: "#loyalty?tab=points",
			pathname: "/",
			searchParams: new URLSearchParams(),
		};
		const matchedPrefix = matchesDeepLink(
			{
				exactHashes: ["#loyalty"],
				hashPrefixes: ["#loyalty?"],
			},
			loyaltyPrefixContext,
		);
		assert.equal(matchedPrefix, true, "Hash prefix #loyalty? must match");
	});

	it("2.2. matchesDeepLink корректно сопоставляет search-параметры и query tokens", () => {
		const searchContext: DeepLinkUrlContext = {
			search: "?loyalty=1&patient_id=p-100",
			hash: "",
			pathname: "/",
			searchParams: new URLSearchParams("loyalty=1&patient_id=p-100"),
		};
		const matched = matchesDeepLink(
			{
				searchIncludes: ["loyalty=1", "bonuses=1"],
			},
			searchContext,
		);
		assert.equal(matched, true, "Search param loyalty=1 must match");
	});

	it("2.3. Negative Guard: исключения exclude гарантированно блокируют ложные срабатывания", () => {
		const gate0Context: DeepLinkUrlContext = {
			search: "?odontogram-gate0=1",
			hash: "#odontogram-gate0",
			pathname: "/",
			searchParams: new URLSearchParams("odontogram-gate0=1"),
		};
		const odontogramRegularRule = {
			tokens: ["odontogram", "dental-chart"],
			exclude: ["odontogram-gate0"],
		};
		const matched = matchesDeepLink(odontogramRegularRule, gate0Context);
		assert.equal(
			matched,
			false,
			"Regular odontogram matcher must exclude odontogram-gate0",
		);
	});

	// =========================================================================
	// 3. МАНДАТ 8aq: ПОЛНОТА РЕЕСТРОВ И МОНТИРОВАНИЕ В СИСТЕМУ
	// =========================================================================
	it("3.1. Клинический реестр содержит все обязательные клинические лаунчеры", () => {
		const requiredIds = [
			"chairside-visit",
			"emk-complaints",
			"emr-medical-record",
			"clinical-protocols",
			"odontogram-gate0",
			"odontogram-studio",
			"visiograph-rvg",
			"endodontics-studio",
			"orthopedics-studio",
			"orthodontics-studio",
			"surgery-studio",
			"hygiene-studio",
			"consents-studio",
		];

		const actualIds = CLINICAL_LAUNCHERS_REGISTRY.map((entry) => entry.id);
		for (const id of requiredIds) {
			assert.ok(
				actualIds.includes(id),
				`Clinical registry must contain launcher '${id}'`,
			);
		}
	});

	it("3.2. Административный реестр содержит все ключевые бизнес-лаунчеры", () => {
		const requiredIds = [
			"loyalty-studio",
			"insurance-studio",
			"online-booking",
			"dental-lab",
			"telephony-studio",
			"schedule-studio",
			"treatment-plans-studio",
			"cash-register",
			"warehouse-inventory",
			"sterilization-hub",
			"sanpin-control",
			"copilot-assistant",
			"omnichannel-hub",
			"documents-catalog",
			"patients-catalog",
			"patient-card-360",
			"analytics-studio",
		];

		const actualIds = ADMINISTRATIVE_LAUNCHERS_REGISTRY.map(
			(entry) => entry.id,
		);
		for (const id of requiredIds) {
			assert.ok(
				actualIds.includes(id),
				`Administrative registry must contain launcher '${id}'`,
			);
		}
	});

	it("3.3. evaluateLaunchersRegistry возвращает компонент при совпадении критериев", () => {
		const testRegistry: readonly LauncherRegistryEntry<any>[] = [
			{
				id: "dummy-test",
				title: "Тестовый стенд",
				criteria: { exactHashes: ["#test-stand"] },
				render: () => "MATCHED_COMPONENT" as any,
			},
		];

		const testContext: DeepLinkUrlContext = {
			search: "",
			hash: "#test-stand",
			pathname: "/",
			searchParams: new URLSearchParams(),
		};

		const result = evaluateLaunchersRegistry(testRegistry, {}, testContext);
		assert.equal(result, "MATCHED_COMPONENT");

		const nonMatchingContext: DeepLinkUrlContext = {
			search: "",
			hash: "#other",
			pathname: "/",
			searchParams: new URLSearchParams(),
		};
		const noResult = evaluateLaunchersRegistry(
			testRegistry,
			{},
			nonMatchingContext,
		);
		assert.equal(noResult, null);
	});
});
