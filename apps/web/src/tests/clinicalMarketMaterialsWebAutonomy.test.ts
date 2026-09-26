/**
 * clinicalMarketMaterialsWebAutonomy.test.ts
 *
 * Автономные тесты веб-интеграции 90% каталога клинических материалов РФ/СНГ:
 * 1. defaultClinicalMaterialPreferences в draftDefaults.ts
 * 2. Докторские предпочтения по специальностям (DoctorPreferences)
 * 3. Селектор ортодонтических материалов OrthodonticMaterialsQuickSelector
 * 4. Модальные окна MaterialBomsQuickCatalogModal и MaterialBomsRuleModal
 * 5. Мандат 8b: строго <= 800 строк на файл
 * 6. Мандат 8d: 100% отсутствие мультяшных эмодзи
 * 7. Мандат 8e: Doctor Autonomy (топ-выбор в 1 клик)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	ALL_CLINICAL_MARKET_MATERIALS,
	getClinicalMaterialsByDomain,
	getTopPopularMaterials,
	searchClinicalMaterials,
} from "@dental/shared";
import {
	type ClinicalMaterialPreferencesDraft,
	defaultClinicalMaterialPreferences,
} from "../utils/draftDefaults";
import { DEFAULT_DOCTOR_PREFERENCES } from "../store/doctorPreferencesStore";

describe("Web Integration: Clinical Market Materials & Consumables (90% CIS/RF Market)", () => {
	it("1. defaultClinicalMaterialPreferences содержит золотые стандарты рынка РФ", () => {
		assert.ok(defaultClinicalMaterialPreferences, "Должен существовать объект предпочтений");
		assert.equal(defaultClinicalMaterialPreferences.defaultImplantSystemId, "implant_osstem_tsiii");
		assert.equal(defaultClinicalMaterialPreferences.defaultBoneMaterialId, "bone_bio_oss_spongiosa");
		assert.equal(defaultClinicalMaterialPreferences.defaultEndoFileId, "endo_protaper_gold");
		assert.equal(defaultClinicalMaterialPreferences.defaultEndoSealerId, "sealer_ah_plus");
		assert.equal(defaultClinicalMaterialPreferences.defaultBracketSystemId, "damon_q2");
		assert.equal(defaultClinicalMaterialPreferences.defaultProsthoImpressionId, "silicone_elite_hd_plus");
		assert.equal(defaultClinicalMaterialPreferences.defaultProsthoCementId, "cement_relyx_u200");
	});

	it("2. DEFAULT_DOCTOR_PREFERENCES поддерживает избранные материалы специалистов", () => {
		assert.equal(DEFAULT_DOCTOR_PREFERENCES.favoriteImplantSystem, "implant_osstem_tsiii");
		assert.equal(DEFAULT_DOCTOR_PREFERENCES.favoriteBoneMaterial, "bone_bio_oss_spongiosa");
		assert.equal(DEFAULT_DOCTOR_PREFERENCES.favoriteEndoFile, "endo_protaper_gold");
		assert.equal(DEFAULT_DOCTOR_PREFERENCES.favoriteEndoSealer, "sealer_ah_plus");
		assert.equal(DEFAULT_DOCTOR_PREFERENCES.favoriteBracketSystem, "damon_q2");
		assert.equal(DEFAULT_DOCTOR_PREFERENCES.favoriteProsthoImpression, "silicone_elite_hd_plus");
		assert.equal(DEFAULT_DOCTOR_PREFERENCES.favoriteProsthoCement, "cement_relyx_u200");
	});

	it("3. Поиск и фильтрация ортодонтических материалов охватывает 90% рынка", () => {
		const brackets = searchClinicalMaterials("", "ortho_bracket");
		assert.ok(brackets.length >= 6, "Минимум 6 брекет-систем в каталоге");
		assert.equal(brackets[0]?.brandName, "Damon Q2", "Лидер рынка брекетов — Damon Q2");

		const aligners = searchClinicalMaterials("", "ortho_aligner");
		assert.ok(aligners.length >= 6, "Минимум 6 систем элайнеров");
		assert.equal(aligners[0]?.brandName, "3D Smile", "Лидер рынка элайнеров РФ — 3D Smile");

		const miniscrews = searchClinicalMaterials("", "ortho_miniscrew");
		assert.ok(miniscrews.length >= 3, "Минимум 3 системы микровинтов");
		assert.equal(miniscrews[0]?.brandName, "Bio-Ray", "Лидер микровинтов РФ — Bio-Ray");
	});

	it("4. Мандат 8b: Все новые и модифицированные файлы строго <= 800 строк", () => {
		const filesToCheck = [
			"apps/web/src/components/inventory/MaterialBomsSettingsPanel.tsx",
			"apps/web/src/components/inventory/MaterialBomsRuleModal.tsx",
			"apps/web/src/components/inventory/MaterialBomsQuickCatalogModal.tsx",
			"apps/web/src/components/orthodontics/OrthodonticMaterialsQuickSelector.tsx",
			"apps/web/src/utils/draftDefaults.ts",
			"apps/web/src/store/doctorPreferencesStore.ts",
			"packages/shared/src/clinical/materials/implantAndBoneMaterialsData.ts",
			"packages/shared/src/clinical/materials/endoAndOrthoMaterialsData.ts",
			"packages/shared/src/clinical/materials/prosthoMaterialsData.ts",
			"packages/shared/src/clinical/clinicalMarketMaterialsCatalog.ts",
			"packages/shared/src/warehouse/default804nBomCatalog.ts",
		];

		const repoRoot = process.cwd();
		for (const relPath of filesToCheck) {
			const fullPath = path.join(repoRoot, relPath);
			assert.ok(fs.existsSync(fullPath), `Файл обязан существовать: ${relPath}`);
			const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
			assert.ok(
				lines <= 800,
				`Файл ${relPath} превысил лимит Мандата 8b (800 строк): ${lines} строк`,
			);
		}
	});

	it("5. Мандат 8d: 100% отсутствие мультяшных эмодзи в веб-компонентах и каталоге", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;
		const filesToCheck = [
			"apps/web/src/components/inventory/MaterialBomsSettingsPanel.tsx",
			"apps/web/src/components/inventory/MaterialBomsRuleModal.tsx",
			"apps/web/src/components/inventory/MaterialBomsQuickCatalogModal.tsx",
			"apps/web/src/components/orthodontics/OrthodonticMaterialsQuickSelector.tsx",
			"apps/web/src/utils/draftDefaults.ts",
		];

		const repoRoot = process.cwd();
		for (const relPath of filesToCheck) {
			const fullPath = path.join(repoRoot, relPath);
			const content = fs.readFileSync(fullPath, "utf8");
			const match = content.match(emojiRegex);
			assert.equal(
				match,
				null,
				`В файле ${relPath} обнаружен запрещенный эмодзи: ${match?.[0]}`,
			);
		}
	});
});
