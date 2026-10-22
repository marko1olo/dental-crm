import { showToast } from "../../GlobalToast";
import { isDesktopApp } from "../../../native/desktopBridge";
import { dispatchThermalLabelPrint } from "../../../native/hardwareDispatcher";
import {
	generateA4BatchSheetHtml,
	generateThermalStickerHtml,
	type KraftPackageRecord,
} from "./kraftPackageEngine";

export async function printThermalStickers(
	packages: KraftPackageRecord[],
	selectedForPrint: Set<string>,
	previewLabelSize: "58x40" | "43x25",
) {
	const targetPacks = packages.filter(
		(p) => selectedForPrint.size === 0 || selectedForPrint.has(p.id),
	);
	if (targetPacks.length === 0) {
		showToast("Нет выбранных пакетов для печати", "warning");
		return;
	}

	const stickersHtml = targetPacks
		.map((p) => generateThermalStickerHtml(p, { size: previewLabelSize }))
		.join("\n<div style='page-break-after:always;'></div>\n");

	const fullHtml = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<title>Печать термоэтикеток стерилизации</title>
			<style>
				@page { size: ${previewLabelSize === "58x40" ? "58mm 40mm" : "43mm 25mm"}; margin: 0; }
				body { margin: 0; padding: 0; background: #fff; }
			</style>
		</head>
		<body>
			${stickersHtml}
			<script>window.onload = function() { window.print(); };</script>
		</body>
		</html>
	`;

	if (isDesktopApp()) {
		const res = await dispatchThermalLabelPrint({
			html: fullHtml,
			widthMm: previewLabelSize === "58x40" ? 58 : 43,
			heightMm: previewLabelSize === "58x40" ? 40 : 25,
			copies: targetPacks.length,
			silent: true,
		});
		if (res.success) {
			showToast(`Напечатано ${targetPacks.length} термоэтикеток (Direct Silent Print)`, "success");
			return;
		}
	}

	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		showToast("Разрешите всплывающие окна для печати", "error");
		return;
	}

	printWindow.document.write(fullHtml);
	printWindow.document.close();
}

export function printA4Sheet(packages: KraftPackageRecord[], selectedForPrint: Set<string>) {
	const targetPacks = packages.filter(
		(p) => selectedForPrint.size === 0 || selectedForPrint.has(p.id),
	);
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		showToast("Разрешите всплывающие окна для печати", "error");
		return;
	}

	const html = generateA4BatchSheetHtml(targetPacks);
	printWindow.document.write(html);
	printWindow.document.close();
	printWindow.onload = () => {
		printWindow.print();
	};
}
