import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	executeShiftCloseClassBWasteDisposal,
	formatShiftCloseClassBWasteActHtml,
} from "../autoBomDeductionEngine.js";

const EMOJI_REGEX = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

describe("BOM Deduction: Shift Close Class B Disposal", () => {
	it("формирует регламентный акт без эмодзи с пломбой и единоличным подтверждением", async () => {
		let postedPayload: unknown = null;
		const mockFetch = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
			postedPayload = JSON.parse((init?.body as string) || "{}");
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		};

		let capturedToast = "";
		const result = await executeShiftCloseClassBWasteDisposal({
			accumulatedCarpulesCount: 12,
			accumulatedNeedlesCount: 12,
			accumulatedSharpsCount: 2,
			contaminatedItemsCount: 15,
			responsibleStaffName: "Иванова М. С.",
			responsibleStaffPosition: "Старшая медсестра",
			clinicName: "Стоматология «DENTE»",
			fetchFn: mockFetch as unknown as typeof fetch,
			onToast: (msg) => {
				capturedToast = msg;
			},
		});

		assert.equal(result.success, true);
		assert.equal(result.totalCarpulesCount, 12);
		assert.equal(result.totalSharpsCount, 14);
		assert.equal(result.singlePersonApproval, true);
		assert.ok(result.sealNumber.startsWith("ПЛ-Б-"));
		assert.ok(result.barcode.startsWith("WASTE-CLASS_B-DENT-"));
		assert.ok(capturedToast.includes("отходов Класса Б"));

		assert.ok(result.actHtml.includes("АКТ НАКОПЛЕНИЯ И ПЕРЕДАЧИ МЕДИЦИНСКИХ ОТХОДОВ КЛАССА Б"));
		assert.ok(result.actHtml.includes("СанПиН 2.1.3684-21"));
		assert.ok(result.actHtml.includes("без комиссии из 3 человек"));
		assert.ok(!EMOJI_REGEX.test(result.actHtml));

		assert.ok(postedPayload !== null);
		const payload = postedPayload as Record<string, unknown>;
		assert.equal(payload.wasteClass, "class_B");
		assert.equal(payload.responsibleStaffName, "Иванова М. С.");
	});

	it("formatShiftCloseClassBWasteActHtml генерирует строгий документ без эмодзи", () => {
		const html = formatShiftCloseClassBWasteActHtml(
			"АКТ-ОТХОД-001",
			"2026-09-25",
			"ПЛ-Б-2026-01234",
			"WASTE-CLASS_B-DENT-20260925-1234",
			10,
			10,
			0,
			0.35,
			0.15,
			0.2,
			"Петрова А. В.",
			"Медицинская сестра",
		);
		assert.ok(html.includes("ПЛ-Б-2026-01234"));
		assert.ok(!EMOJI_REGEX.test(html));
	});
});
