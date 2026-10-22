import {
	generateDiscrepancyAct,
	generateTorg13Html,
	generateTorg2Html,
	type WarehouseDiscrepancyAct,
	type WarehouseTransferDocument,
} from "./warehouseTransferEngine.js";

export function printTorg13Document(doc: WarehouseTransferDocument): void {
	const html = generateTorg13Html(doc);
	const printWin = window.open("", "_blank");
	if (printWin) {
		printWin.document.write(html);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 250);
	}
}

export function printTorg2Document(
	doc: WarehouseTransferDocument,
	onDiscrepancyActGenerated?: ((act: WarehouseDiscrepancyAct) => void) | undefined,
): void {
	const soloCommission = [{
		name: doc.receivedByFullName || doc.dispatchedByFullName || "Дежурная медсестра / Завскладом",
		position: doc.receivedByPosition || doc.dispatchedByPosition || "Материально ответственное лицо",
	}];
	const act = generateDiscrepancyAct(doc, soloCommission);
	if (onDiscrepancyActGenerated) onDiscrepancyActGenerated(act);
	const html = generateTorg2Html(act);
	const printWin = window.open("", "_blank");
	if (printWin) {
		printWin.document.write(html);
		printWin.document.close();
		printWin.focus();
		setTimeout(() => printWin.print(), 250);
	}
}
