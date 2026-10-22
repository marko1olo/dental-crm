import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleOneClickPackageWriteOff } from "../warehousePackageWriteOffEngine";

describe("Wave 64 (Feature 253): Package WriteOff & Soft Overdraft", () => {
	it("5. Успешно списывает пакет при достаточном остатке на складе без овердрафта", async () => {
		const availableStock: Record<string, number> = {
			art_100k_carpule: 50,
			dental_needle_30g: 100,
			cotton_rolls_sterile: 200,
			antiseptic_alcohol_wipe: 100,
		};

		let emittedToastMessage = "";
		let emittedToastType = "";

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			currentStockMap: availableStock,
			nurseName: "Смирнова А.В.",
			doctorName: "Д-р Волкова Е.С.",
			onToast: (msg, type) => {
				emittedToastMessage = msg;
				emittedToastType = type;
			},
		});

		assert.equal(result.success, true);
		assert.equal(result.packageId, "anesthesia");
		assert.equal(result.isOverdraft, false);
		assert.equal(result.overdraftCount, 0);
		assert.equal(result.overdraftItems.length, 0);
		assert.equal(result.totalItemsCount, 4);
		assert.ok(result.totalCostKopecks > 0);
		assert.ok(result.actNumber.startsWith("АКТ-СПИС-ПК-"));
		assert.equal(emittedToastType, "success");
		assert.ok(emittedToastMessage.includes("успешно списан"));
		assert.ok(emittedToastMessage.includes("без комиссии из 3 человек"));
	});

	it("6. Мягкий овердрафт (allowSoftOverdraft: true): при остатке 0 операция НЕ блокируется и выдается warning toast", async () => {
		const emptyStock: Record<string, number> = {};

		let emittedToastMessage = "";
		let emittedToastType = "";

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			currentStockMap: emptyStock,
			allowSoftOverdraft: true,
			nurseName: "Медсестра Иванова М.И.",
			doctorName: "Д-р Кузнецов М.С.",
			onToast: (msg, type) => {
				emittedToastMessage = msg;
				emittedToastType = type;
			},
		});

		assert.equal(result.success, true);
		assert.equal(result.isOverdraft, true);
		assert.equal(result.overdraftCount, 4);
		assert.equal(result.overdraftItems.length, 4);

		const carpuleOverdraft = result.overdraftItems.find((o) => o.nameRu.toLowerCase().includes("артикаин"))!;
		assert.ok(carpuleOverdraft);
		assert.equal(carpuleOverdraft.requestedQty, 1);
		assert.equal(carpuleOverdraft.availableQty, 0);
		assert.equal(carpuleOverdraft.deficitQty, 1);

		assert.equal(emittedToastType, "warning");
		assert.ok(emittedToastMessage.toLowerCase().includes("мягкий овердрафт"));
		assert.ok(emittedToastMessage.includes("Операция не заблокирована"));
		assert.ok(emittedToastMessage.includes("накладная в пути"));
	});

	it("7. Мягкий овердрафт при частичном дефиците (1 позиция из пакета в нуле)", async () => {
		const partialStock: Record<string, number> = {
			art_100k_carpule: 10,
			dental_needle_30g: 0,
			cotton_rolls_sterile: 50,
			antiseptic_alcohol_wipe: 20,
		};

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			currentStockMap: partialStock,
			allowSoftOverdraft: true,
		});

		assert.equal(result.success, true);
		assert.equal(result.isOverdraft, true);
		assert.equal(result.overdraftCount, 1);
		assert.equal(result.overdraftItems[0]!.nameRu.includes("Игла"), true);
		assert.equal(result.overdraftItems[0]!.deficitQty, 1);
		assert.equal(result.toastType, "warning");
	});
});
