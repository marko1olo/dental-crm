/**
 * packages/shared/src/clinical/__tests__/dentalFormulaSurfacesIsolation.test.ts
 *
 * Tests for ToothSurfaceKey, SURFACE_BIT_MASKS, resolveBlackRestorationService (804n),
 * and buildCompositeIcd10Code (MODVLC canonical order).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	SURFACE_BIT_MASKS,
	encodeSurfacesToBitMask,
	decodeSurfacesFromBitMask,
	resolveBlackRestorationService,
	buildCompositeIcd10Code,
	mergeToothSurfaceStates,
	type ToothSurfaceKey,
	type ToothSurfaceStateMap,
} from "../dentalFormulaSurfaces.js";

describe("dentalFormulaSurfaces — Surface Isolation & Black 804n Resolution", () => {
	it("1. encodes and decodes bit masks in canonical MODVLC order", () => {
		// Individual bits
		assert.equal(SURFACE_BIT_MASKS.M, 1);
		assert.equal(SURFACE_BIT_MASKS.O, 2);
		assert.equal(SURFACE_BIT_MASKS.D, 4);
		assert.equal(SURFACE_BIT_MASKS.V, 8);
		assert.equal(SURFACE_BIT_MASKS.L, 16);
		assert.equal(SURFACE_BIT_MASKS.C, 32);

		// Compound MOD: 1 + 2 + 4 = 7
		const modMask = encodeSurfacesToBitMask(["M", "O", "D"]);
		assert.equal(modMask, 7);
		assert.deepEqual(decodeSurfacesFromBitMask(7), ["M", "O", "D"]);

		// Compound VLC: 8 + 16 + 32 = 56
		const vlcMask = encodeSurfacesToBitMask(["C", "V", "L"]);
		assert.equal(vlcMask, 56);
		assert.deepEqual(decodeSurfacesFromBitMask(56), ["V", "L", "C"]);

		// Full 6 surfaces
		const allMask = encodeSurfacesToBitMask(["C", "L", "V", "D", "O", "M"]);
		assert.equal(allMask, 63);
		assert.deepEqual(decodeSurfacesFromBitMask(63), ["M", "O", "D", "V", "L", "C"]);

		// Empty
		assert.equal(encodeSurfacesToBitMask([]), 0);
		assert.deepEqual(decodeSurfacesFromBitMask(0), []);
	});

	it("2. resolves Black Restoration services under Order 804n nomenclature", () => {
		// Class I: Occlusal only -> A16.07.002.001 (450 000 kopecks)
		const classI = resolveBlackRestorationService(["O"]);
		assert.equal(classI.code804n, "A16.07.002.001");
		assert.equal(classI.priceKopecks, 450_000);
		assert.equal(classI.blackClass, "I");
		assert.equal(classI.involvesContactSurfaces, false);

		// Class V: Cervical only -> A16.07.002.001 (450 000 kopecks)
		const classV = resolveBlackRestorationService(["C"]);
		assert.equal(classV.code804n, "A16.07.002.001");
		assert.equal(classV.priceKopecks, 450_000);
		assert.equal(classV.blackClass, "V");
		assert.equal(classV.involvesContactSurfaces, false);

		// Class V: Vestibular only -> A16.07.002.001 (450 000 kopecks)
		const classVvest = resolveBlackRestorationService(["V"]);
		assert.equal(classVvest.code804n, "A16.07.002.001");
		assert.equal(classVvest.priceKopecks, 450_000);
		assert.equal(classVvest.blackClass, "V");

		// Class II: Mesial + Occlusal -> A16.07.002.002 (550 000 kopecks)
		const classIIm = resolveBlackRestorationService(["M", "O"]);
		assert.equal(classIIm.code804n, "A16.07.002.002");
		assert.equal(classIIm.priceKopecks, 550_000);
		assert.equal(classIIm.blackClass, "II");
		assert.equal(classIIm.involvesContactSurfaces, true);

		// Class II: Distal + Occlusal -> A16.07.002.002 (550 000 kopecks)
		const classIId = resolveBlackRestorationService(["D", "O"]);
		assert.equal(classIId.code804n, "A16.07.002.002");
		assert.equal(classIId.priceKopecks, 550_000);
		assert.equal(classIId.blackClass, "II");
		assert.equal(classIId.involvesContactSurfaces, true);

		// Class II: MOD (Mesial + Occlusal + Distal) -> A16.07.002.002 (550 000 kopecks)
		const classIImod = resolveBlackRestorationService(["M", "O", "D"]);
		assert.equal(classIImod.code804n, "A16.07.002.002");
		assert.equal(classIImod.priceKopecks, 550_000);
		assert.equal(classIImod.blackClass, "II");
		assert.equal(classIImod.involvesContactSurfaces, true);

		// Class III/IV: Mesial contact only -> A16.07.002.002 (550 000 kopecks)
		const classIII = resolveBlackRestorationService(["M"]);
		assert.equal(classIII.code804n, "A16.07.002.002");
		assert.equal(classIII.priceKopecks, 550_000);
		assert.equal(classIII.blackClass, "III");
		assert.equal(classIII.involvesContactSurfaces, true);
	});

	it("3. builds composite ICD-10 code with canonical M, O, D, V, L, C ordering", () => {
		// Scrambled input ["O", "D", "M"] -> sorted to "MOD"
		assert.equal(buildCompositeIcd10Code("K02.1", ["O", "D", "M"]), "K02.1/MOD");

		// Single surface
		assert.equal(buildCompositeIcd10Code("K02.1", ["O"]), "K02.1/O");

		// Cervical and vestibular
		assert.equal(buildCompositeIcd10Code("K02.1", ["C", "V"]), "K02.1/VC");

		// Empty surfaces returns base ICD
		assert.equal(buildCompositeIcd10Code("K02.1", []), "K02.1");
		assert.equal(buildCompositeIcd10Code("K02.1", null), "K02.1");
		assert.equal(buildCompositeIcd10Code("K02.1", undefined), "K02.1");

		// Russian notation inputs converted to canonical MOD
		assert.equal(buildCompositeIcd10Code("K02.1", ["ОККЛ", "МЕДИАЛ"]), "K02.1/MO");
	});

	it("4. merges surface states preserving existing restorations alongside new pathologies", () => {
		const existingState: ToothSurfaceStateMap = {
			M: "filling",
			D: "filling",
		};

		const incomingState: ToothSurfaceStateMap = {
			O: "caries",
		};

		const merged = mergeToothSurfaceStates(existingState, incomingState);
		assert.equal(merged.M, "filling", "Mesial filling must NOT be erased");
		assert.equal(merged.D, "filling", "Distal filling must NOT be erased");
		assert.equal(merged.O, "caries", "Occlusal caries must be registered");
	});
});
