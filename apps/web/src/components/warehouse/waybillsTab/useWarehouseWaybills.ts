import { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import {
	type AcceptanceSupplier,
	type AcceptanceWaybillDocument,
	type AcceptanceWaybillItem,
	CANONICAL_DENTAL_MATERIAL_TEMPLATES,
	CANONICAL_DENTAL_SUPPLIERS,
	calculateWaybillTotals,
	createDraftAcceptanceWaybill,
	createSampleDentalWaybill,
	createWaybillItem,
	exportWaybillToCsv,
	generateTorg12Html,
	reconcileOverdraftOnReceipt,
	rublesToKopecks,
} from "../../inventory/acceptanceWaybillsEngine.js";
import type { WarehouseWaybillsTabProps } from "./types.js";

export function useWarehouseWaybills({
	inventoryItems = [],
	onWaybillPosted,
	onRefreshStock,
}: WarehouseWaybillsTabProps) {
	// Список проведенных и сохраненных накладных (Мандат 8c / 8k: в боевом режиме честный пустой склад)
	const [waybillsList, setWaybillsList] = useState<AcceptanceWaybillDocument[]>(() => {
		return isDemoShowcaseMode() ? [createSampleDentalWaybill()] : [];
	});
	const [selectedWaybill, setSelectedWaybill] = useState<AcceptanceWaybillDocument | null>(() => {
		return isDemoShowcaseMode() ? createSampleDentalWaybill() : null;
	});
	const [isCreatingNew, setIsCreatingNew] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const [draftWaybill, setDraftWaybill] = useState<AcceptanceWaybillDocument>(() =>
		createDraftAcceptanceWaybill({ supplier: CANONICAL_DENTAL_SUPPLIERS[0]! }),
	);

	// Быстрое оприходование (4 параметра: Поставщик, Номер, Дата, Итоговая сумма)
	const [isExpressModalOpen, setIsExpressModalOpen] = useState(false);
	const [expressSupplierId, setExpressSupplierId] = useState(CANONICAL_DENTAL_SUPPLIERS[0]?.id || "");
	const [expressWaybillNum, setExpressWaybillNum] = useState("ПРХ-2026/10-091");
	const [expressDate, setExpressDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [expressAmountRub, setExpressAmountRub] = useState("45000");

	const handlePostExpressWaybill = async () => {
		const num = expressWaybillNum.trim() || `ПРХ-${Date.now().toString().slice(-4)}`;
		const amtRub = parseFloat(expressAmountRub) || 0;
		const supplier = CANONICAL_DENTAL_SUPPLIERS.find((s) => s.id === expressSupplierId) || CANONICAL_DENTAL_SUPPLIERS[0]!;

		const defaultItem: AcceptanceWaybillItem = createWaybillItem({
			name: "Расходные материалы стоматологические (пакет поставки)",
			sku: "EXP-PKG-01",
			unit: "упак.",
			category: "Расходные",
			quantity: 1,
			unitPriceKopecks: rublesToKopecks(amtRub),
			vatRate: 0,
			batchNumber: `LOT-${Date.now().toString().slice(-6)}`,
			expirationDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
		});

		const items = [defaultItem];
		const totals = calculateWaybillTotals(items);
		const postedDoc: AcceptanceWaybillDocument = {
			id: `wb-express-${Date.now()}`,
			waybillNumber: num,
			receiptDate: expressDate,
			supplier,
			warehouseName: "Центральный склад клиники",
			receiverFullName: "Ответственный за снабжение",
			receiverPosition: "Зав. складом",
			status: "posted",
			items,
			totals,
			postedAt: new Date().toISOString(),
		};

		// Погашение дефицита / овердрафта
		const overdraftItems = inventoryItems.filter(
			(inv) => Number(inv.stockQuantity) < 0,
		);
		let overdraftResolvedCount = 0;
		for (const d of overdraftItems) {
			const curDeficit = Number(d.stockQuantity);
			const reconciliation = reconcileOverdraftOnReceipt(curDeficit, 10);
			if (reconciliation.clearedDeficit > 0) {
				overdraftResolvedCount++;
			}
		}

		setWaybillsList((prev) => [postedDoc, ...prev]);
		setSelectedWaybill(postedDoc);
		setIsExpressModalOpen(false);

		if (onWaybillPosted) {
			await onWaybillPosted(postedDoc);
		}
		if (onRefreshStock) {
			onRefreshStock();
		}

		showToast(
			overdraftResolvedCount > 0
				? `Накладная №${postedDoc.waybillNumber} оприходована. Погашен овердрафт: ${overdraftResolvedCount} поз.`
				: `Накладная №${postedDoc.waybillNumber} успешно оприходована. Склад пополнен.`,
			"success",
		);
	};

	// Быстрое добавление позиции из стоматологических шаблонов
	const handleAddTemplateItem = (templateSku: string) => {
		const tmpl = CANONICAL_DENTAL_MATERIAL_TEMPLATES.find((t) => t.sku === templateSku);
		if (!tmpl) return;

		const newItem = createWaybillItem({
			name: tmpl.name,
			sku: tmpl.sku,
			unit: tmpl.unit,
			category: tmpl.category,
			quantity: 10,
			unitPriceKopecks: tmpl.defaultUnitPriceKopecks,
			vatRate: tmpl.vatRate,
			batchNumber: `${tmpl.defaultBatchPrefix}-${Date.now().toString().slice(-6)}`,
			expirationDate: tmpl.shelfLifeMonths
				? new Date(Date.now() + tmpl.shelfLifeMonths * 30 * 86400000)
						.toISOString()
						.slice(0, 10)
				: "2028-12-31",
			barcode: tmpl.barcode,
		});

		const nextItems = [...draftWaybill.items, newItem];
		const nextTotals = calculateWaybillTotals(nextItems);
		setDraftWaybill((prev) => ({
			...prev,
			items: nextItems,
			totals: nextTotals,
		}));
	};

	// Удаление строки из накладной
	const handleRemoveDraftItem = (itemId: string) => {
		const nextItems = draftWaybill.items.filter((it) => it.id !== itemId);
		const nextTotals = calculateWaybillTotals(nextItems);
		setDraftWaybill((prev) => ({
			...prev,
			items: nextItems,
			totals: nextTotals,
		}));
	};

	// Проведение накладной (Мандат 8n: гашение овердрафта)
	const handlePostWaybill = async (waybillToPost: AcceptanceWaybillDocument) => {
		if (waybillToPost.items.length === 0) {
			showToast("Добавьте хотя бы одну позицию в накладную", "warning");
			return;
		}

		const postedDoc: AcceptanceWaybillDocument = {
			...waybillToPost,
			status: "posted",
			postedAt: new Date().toISOString(),
		};

		// Проверка гашения мягкого овердрафта
		const overdraftItems = inventoryItems.filter(
			(inv) => Number(inv.stockQuantity) < 0,
		);
		let overdraftResolvedCount = 0;

		for (const wbItem of postedDoc.items) {
			const matchingDeficit = overdraftItems.find((d) =>
				d.name.toLowerCase().includes(wbItem.name.toLowerCase().slice(0, 15)),
			);
			if (matchingDeficit) {
				const currentDeficit = Number(matchingDeficit.stockQuantity);
				const reconciliation = reconcileOverdraftOnReceipt(
					currentDeficit,
					wbItem.quantity,
				);
				if (reconciliation.clearedDeficit > 0) {
					overdraftResolvedCount++;
				}
			}
		}

		setWaybillsList((prev) => [
			postedDoc,
			...prev.filter((w) => w.id !== postedDoc.id),
		]);
		setSelectedWaybill(postedDoc);
		setIsCreatingNew(false);

		if (onWaybillPosted) {
			await onWaybillPosted(postedDoc);
		}
		if (onRefreshStock) {
			onRefreshStock();
		}

		showToast(
			overdraftResolvedCount > 0
				? `Накладная №${postedDoc.waybillNumber} успешно проведена. Погашен овердрафт: ${overdraftResolvedCount} поз.`
				: `Накладная №${postedDoc.waybillNumber} проведена. Склад пополнен.`,
			"success",
		);
	};

	// Печать унифицированной формы ТОРГ-12
	const handlePrintTorg12 = (wb: AcceptanceWaybillDocument) => {
		const html = generateTorg12Html(wb);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	};

	// Экспорт накладной в CSV
	const handleExportCsv = (wb: AcceptanceWaybillDocument) => {
		const csvContent = exportWaybillToCsv(wb);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `torg12_${wb.waybillNumber.replace(/\//g, "_")}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast("Накладная экспортирована в CSV", "info");
	};

	const handleStartCreateNew = () => {
		setIsCreatingNew(true);
		setDraftWaybill(createDraftAcceptanceWaybill({ supplier: CANONICAL_DENTAL_SUPPLIERS[0]! }));
	};

	const filteredWaybills = useMemo(() => {
		if (!searchQuery.trim()) return waybillsList;
		const q = searchQuery.toLowerCase();
		return waybillsList.filter(
			(w) =>
				w.waybillNumber.toLowerCase().includes(q) ||
				w.supplier.name.toLowerCase().includes(q),
		);
	}, [waybillsList, searchQuery]);

	const handleChangeSupplier = (supplier: AcceptanceSupplier) => {
		setDraftWaybill((prev) => ({ ...prev, supplier }));
	};

	const handleChangeWaybillNumber = (waybillNumber: string) => {
		setDraftWaybill((prev) => ({ ...prev, waybillNumber }));
	};

	const handleChangeReceiptDate = (receiptDate: string) => {
		setDraftWaybill((prev) => ({ ...prev, receiptDate }));
	};

	return {
		waybillsList,
		setWaybillsList,
		selectedWaybill,
		setSelectedWaybill,
		isCreatingNew,
		setIsCreatingNew,
		searchQuery,
		setSearchQuery,
		draftWaybill,
		setDraftWaybill,
		isExpressModalOpen,
		setIsExpressModalOpen,
		expressSupplierId,
		setExpressSupplierId,
		expressWaybillNum,
		setExpressWaybillNum,
		expressDate,
		setExpressDate,
		expressAmountRub,
		setExpressAmountRub,
		handlePostExpressWaybill,
		handleAddTemplateItem,
		handleRemoveDraftItem,
		handlePostWaybill,
		handlePrintTorg12,
		handleExportCsv,
		handleStartCreateNew,
		filteredWaybills,
		handleChangeSupplier,
		handleChangeWaybillNumber,
		handleChangeReceiptDate,
	};
}
