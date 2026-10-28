import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

describe("Warehouse Suite: Anti-Jargon & Zero Emojis", () => {
	const filesToInspect = [
		"WarehouseStockAlertsBar.tsx",
		"WarehouseOverviewTab.tsx",
		"WarehouseWaybillsTab.tsx",
		"WarehouseInventoryTab.tsx",
		"WarehouseBatchTrackingModal.tsx",
		"WarehouseCatalogView.tsx",
		"ConsumablesDeductionModal.tsx",
		"AutoBomDeductionBanner.tsx",
	];

	it("компоненты не содержат мультяшных эмодзи и запрещенного дев-жаргона", () => {
		for (const file of filesToInspect) {
			const baseDir = fs.existsSync(path.join(process.cwd(), "src/components/inventory"))
				? path.join(process.cwd(), "src/components/inventory")
				: path.join(process.cwd(), "apps/web/src/components/inventory");
			const fullPath = path.join(baseDir, file);
			const content = fs.readFileSync(fullPath, "utf-8");

			const emojiMatch = content.match(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
			assert.equal(emojiMatch, null, `Файл ${file} не должен содержать эмодзи`);

			assert.ok(
				!content.includes("1-клик") && !content.includes("1-Click"),
				`Файл ${file} не должен содержать жаргон «1-клик»`,
			);
			assert.ok(
				!content.includes("овербукинг") && !content.includes("overbooking"),
				`Файл ${file} не должен содержать жаргон «овербукинг»`,
			);
		}
	});
});
