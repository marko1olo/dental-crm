/**
 * canonicalCatalogBuilder.ts — Сборка мастер-каталога имплантатов (Мандаты 8s, 8e, 8b).
 */

import type { CanonicalImplantFixture } from "./canonicalCatalogTypes";
import { buildGroupAFixtures } from "./canonicalCatalogFixturesA";
import { buildGroupBFixtures } from "./canonicalCatalogFixturesB";

function buildMasterCatalog(): CanonicalImplantFixture[] {
	return [...buildGroupAFixtures(), ...buildGroupBFixtures()];
}

export const CANONICAL_IMPLANT_CATALOG: readonly CanonicalImplantFixture[] = Object.freeze(buildMasterCatalog());
