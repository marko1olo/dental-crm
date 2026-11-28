import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DentalLabStudioPrintTab } from "../printBlankModules/DentalLabStudioPrintTab";
import { SEED_LAB_ORDERS, getMaterialMeta } from "../dentalLabCatalogData";
import { CANONICAL_5_CLINICAL_LAB_STATUSES } from "../dentalLabOrderEngine";

describe("dentalLabZeroMock — Print Blank & Zero Emojis", () => {
	it("рендерит клинический бланк заказ-наряда в лабораторию с зубами FDI и материалом без эмодзи", () => {
		const order = SEED_LAB_ORDERS[0];
		assert.ok(order, "SEED_LAB_ORDERS[0] must exist");
		const mat = getMaterialMeta(order.materialId);
		const html = renderToString(
			<DentalLabStudioPrintTab
				currentPrintOrder={order}
				printMaterial={mat}
				onBackToRegistry={() => {}}
			/>,
		);

		assert.ok(html.includes("Клинический заказ-наряд в лабораторию"));
		assert.ok(html.includes(String(order.orderNumber)));
		assert.ok(html.includes(order.patientName));
		assert.ok(html.includes(order.doctorName));
		assert.ok(html.includes('data-testid="lab-order-printable-blank"'));
		assert.ok(html.includes('data-testid="print-blank-submit-btn"'));
		assert.ok(html.includes("Печать бланка"));

		const emojiRegex = /\p{Extended_Pictographic}/u;
		assert.equal(emojiRegex.test(html.replace(/[✓✕]/g, "")), false);
	});

	it("метки канонических стадий ЗТЛ содержат строго 0 эмодзи", () => {
		const emojiRegex = /\p{Extended_Pictographic}/u;
		for (const stage of CANONICAL_5_CLINICAL_LAB_STATUSES) {
			assert.equal(emojiRegex.test(stage.labelRu), false);
			assert.equal(emojiRegex.test(stage.shortLabel), false);
		}
	});
});
