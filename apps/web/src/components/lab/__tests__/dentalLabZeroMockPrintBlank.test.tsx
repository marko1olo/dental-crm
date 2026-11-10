import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DentalLabStudioPrintTab } from "../printBlankModules/DentalLabStudioPrintTab";
import { SEED_LAB_ORDERS, getMaterialMeta } from "../dentalLabCatalogData";

describe("dentalLabZeroMock — Print Blank & Emojis", () => {
	it("рендерит клинический бланк заказ-наряда в лабораторию с зубами FDI и материалом", () => {
		const order = SEED_LAB_ORDERS[0]!;
		const mat = getMaterialMeta(order.materialId);
		const html = renderToString(
			<DentalLabStudioPrintTab
				currentPrintOrder={order}
				printMaterial={mat}
				onBackToRegistry={() => {}}
			/>,
		);

		assert.ok(html.includes("Клинический заказ-наряд в лабораторию"));
		assert.ok(html.includes(order.orderNumber));
		assert.ok(html.includes(order.patientName));
		assert.ok(html.includes(order.doctorName));
		assert.ok(html.includes('data-testid="lab-order-printable-blank"'));
		assert.ok(html.includes('data-testid="print-blank-submit-btn"'));
		assert.ok(html.includes("Печать бланка"));
	});

	it("DentalLabStudioPrintTab.tsx и dentalLabOrderEngine.ts содержат строго 0 эмодзи", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const labDir = path.resolve(path.dirname(currentFile), "..");
		const files = [
			"printBlankModules/DentalLabStudioPrintTab.tsx",
			"dentalLabOrderEngine.ts",
			"labClinicalStages.ts",
		];
		const emojiRegex = /\p{Extended_Pictographic}/u;

		for (const f of files) {
			const fullPath = path.join(labDir, f);
			if (fs.existsSync(fullPath)) {
				const content = fs.readFileSync(fullPath, "utf-8");
				assert.equal(emojiRegex.test(content), false, `Файл ${f} содержит эмодзи`);
			}
		}
	});
});
