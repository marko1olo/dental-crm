import type { SterilizationLogRecord } from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import {
	generateThermalStickerHtml,
	type KraftPackageRecord,
} from "./kraft/kraftPackageEngine.js";

export function handlePrintBatchPouches(log: SterilizationLogRecord, count = 10): void {
	const printWin = window.open("", "_blank", "width=600,height=500");
	if (!printWin) {
		showToast("Разрешите всплывающие окна для пакетной печати этикеток", "error");
		return;
	}

	const daysLifespan = 30;
	const packDate = new Date(log.timestamp).toISOString().slice(0, 10);
	const expDate = new Date(new Date(log.timestamp).getTime() + daysLifespan * 86400000)
		.toISOString()
		.slice(0, 10);
	const baseBarcode = log.barcode || `STER-${log.id.slice(0, 6).toUpperCase()}`;

	const stickersHtml: string[] = [];

	for (let i = 1; i <= count; i++) {
		const itemBarcode = `${baseBarcode}-${String(i).padStart(2, "0")}`;
		const rec: KraftPackageRecord = {
			id: `kp-${log.id}-${i}`,
			batchId: `CYC-${log.cycleNumber}`,
			serialNumber: i,
			packageType:
				log.packagingType === "laminated_heat_sealed"
					? "paper_plastic_pouch"
					: "paper_self_seal_single",
			packageSize: "size_100x200",
			toolSetId: "set_therapeutic_tray",
			toolSetNameRu: (log.itemsDescription || "Стоматологический набор").slice(0, 32),
			itemsListRu: [log.itemsDescription || "Инструментальный набор"],
			packDate,
			expDate,
			daysLifespan,
			daysRemaining: daysLifespan,
			status: "sterile_valid",
			autoclaveId: log.deviceName || "АК-01",
			cycleNumber: log.cycleNumber || 1,
			operatorId: log.operatorId || "NURSE-01",
			operatorName: log.operatorName || "Сотрудник клиники",
			indicatorId:
				log.indicatorType === "class6_emulating"
					? "vinar_inte_6"
					: log.indicatorType === "class5_integrating"
						? "vinar_inte_5"
						: "vinar_steritest_4",
			indicatorVerified: log.passedIndicator ?? true,
			barcode128: itemBarcode,
			barcodeDataMatrixPayload: `${itemBarcode}|${log.deviceName || "АК-01"}|CYC${log.cycleNumber}|${packDate}|${expDate}|${log.operatorName || "ЦСО"}`,
			isBreached: false,
			notes: log.notes || "",
			createdAt: new Date(log.timestamp).toISOString(),
		};

		stickersHtml.push(
			generateThermalStickerHtml(rec, {
				size: "58x40",
				clinicName: "Стоматологическая клиника «DENTE»",
			}),
		);
	}

	printWin.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="UTF-8">
			<title>Пакет этикеток стерилизации (${count} шт., СанПиН 3.3686-21 / 30 дн.)</title>
			<style>
				@page { size: 58mm 40mm; margin: 0; }
				body { margin: 0; padding: 0; background: #fff; }
				.page-break { page-break-after: always; display: block; }
			</style>
		</head>
		<body>
			${stickersHtml.map((s) => `<div>${s}</div>`).join("<div class='page-break'></div>")}
			<script>window.print(); setTimeout(() => window.close(), 1000);</script>
		</body>
		</html>
	`);
	printWin.document.close();
	showToast(
		`Сформирована пачка из ${count} термоэтикеток (срок: 30 суток по СанПиН 3.3686-21)`,
		"success",
	);
}
