/**
 * Single-Shell Route Resolution & Studio Overlay Host SSOT Invariant Test (6G Live SUT).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderStandaloneLaunchers } from "../StandaloneLaunchers";
import {
	CLINICAL_LAUNCHERS_REGISTRY,
	renderClinicalLaunchers,
} from "../standalone/clinicalLaunchersRegistry";
import {
	ADMINISTRATIVE_LAUNCHERS_REGISTRY,
	renderAdministrativeLaunchers,
} from "../standalone/administrativeLaunchersRegistry";
import {
	matchesDeepLink,
	evaluateLaunchersRegistry,
	type DeepLinkUrlContext,
	type LauncherRegistryEntry,
} from "../standalone/deepLinkMatcher";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";
import { resolveClinicRoute } from "../../../../router/routeResolver";

const stubLauncherProps: StandaloneLaunchersProps = {
	isCbctTunerOpen: false,
	setIsCbctTunerOpen: () => {},
	isCbctDirectModalOpen: false,
	setIsCbctDirectModalOpen: () => {},
	isConsentDirectModalOpen: false,
	setIsConsentDirectModalOpen: () => {},
	isCephDirectModalOpen: false,
	setIsCephDirectModalOpen: () => {},
	isEgiszRemdModalOpen: false,
	setIsEgiszRemdModalOpen: () => {},
};

describe("Standalone Launchers Decomposition & Routing SSOT Suite (6G Live SUT)", () => {
	it("1.1. Legacy StandaloneLaunchers & registries return null / empty because overlays are consolidated in WorkspaceStudioOverlayHost", () => {
		assert.strictEqual(renderStandaloneLaunchers(stubLauncherProps), null);
		assert.strictEqual(renderClinicalLaunchers(stubLauncherProps), null);
		assert.strictEqual(renderAdministrativeLaunchers(stubLauncherProps), null);
		assert.deepStrictEqual(CLINICAL_LAUNCHERS_REGISTRY, []);
		assert.deepStrictEqual(ADMINISTRATIVE_LAUNCHERS_REGISTRY, []);
	});

	it("2.1. matchesDeepLink корректно сопоставляет точные хеши, префиксы, query-параметры и отклоняет несовпадения", () => {
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
		assert.equal(
			matchesDeepLink({ exactHashes: ["#cashbox"] }, loyaltyContext),
			false,
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

	it("3.3. evaluateLaunchersRegistry invokes render for matching deep-link and skips non-matching entries", () => {
		let matchedRendered = false;
		const testRegistry: readonly LauncherRegistryEntry<Record<string, never>>[] = [
			{
				id: "other-stand",
				title: "Другой стенд",
				criteria: { exactHashes: ["#other"] },
				render: () => {
					throw new Error("Should not render non-matching entry");
				},
			},
			{
				id: "dummy-test",
				title: "Тестовый стенд",
				criteria: { exactHashes: ["#test-stand"] },
				render: () => {
					matchedRendered = true;
					return null;
				},
			},
		];
		const testContext: DeepLinkUrlContext = {
			search: "",
			hash: "#test-stand",
			pathname: "/",
			searchParams: new URLSearchParams(),
		};
		assert.equal(evaluateLaunchersRegistry(testRegistry, {}, testContext), null);
		assert.equal(matchedRendered, true);
	});
});
