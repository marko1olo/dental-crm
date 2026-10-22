import type { SterilizationLogRecord } from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import {
	generateThermalStickerHtml,
	type KraftPackageRecord,
} from "./kraft/kraftPackageEngine.js";

export function handlePrintSinglePouch(log: SterilizationLogRecord): void {
	const printWin = window.open("", "_blank", "width=500,height=400");
	if (!printWin) {
		showToast("Разрешите всплывающие окна для печати этикетки", "error");
		return;
	}

	const expFormatted = log.expiresAt
		? new Date(log.expiresAt).toISOString().slice(0, 10)
		: new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10);
	const packDate = new Date(log.timestamp).toISOString().slice(0, 10);
	const barcodeVal = log.barcode || `STER-${log.id.slice(0, 8).toUpperCase()}`;

	const rec: KraftPackageRecord = {
		id: `kp-${log.id}`,
		batchId: `CYC-${log.cycleNumber}`,
		serialNumber: 1,
		packageType:
			log.packagingType === "laminated_heat_sealed"
				? "paper_plastic_pouch"
				: "paper_self_seal_single",
		packageSize: "size_100x200",
		toolSetId: "set_therapeutic_tray",
		toolSetNameRu: (log.itemsDescription || "Стоматологический набор").slice(0, 32),
		itemsListRu: [log.itemsDescription || "Инструментальный набор"],
		packDate,
		expDate: expFormatted,
		daysLifespan: 50,
		daysRemaining: 50,
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
		barcode128: barcodeVal,
		barcodeDataMatrixPayload: `${barcodeVal}|${log.deviceName || "АК-01"}|CYC${log.cycleNumber}|${packDate}|${expFormatted}|${log.operatorName || "ЦСО"}`,
		isBreached: false,
		notes: log.notes || "",
		createdAt: new Date(log.timestamp).toISOString(),
	};

	const stickerHtml = generateThermalStickerHtml(rec, {
		size: "58x40",
		clinicName: "Стоматологическая клиника «DENTE»",
	});

	printWin.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="UTF-8">
			<title>Термоэтикетка стерилизации: ${barcodeVal}</title>
			<style>
				@page { size: 58mm 40mm; margin: 0; }
				body { margin: 0; padding: 0; background: #fff; display: flex; justify-content: center; align-items: center; }
			</style>
		</head>
		<body>
			${stickerHtml}
			<script>window.print(); setTimeout(() => window.close(), 600);</script>
		</body>
		</html>
	`);
	printWin.document.close();
}
