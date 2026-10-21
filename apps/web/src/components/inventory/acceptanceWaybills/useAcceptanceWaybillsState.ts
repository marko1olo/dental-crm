import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders.js";
import { showToast } from "../../GlobalToast.js";
import {
	type AcceptanceSupplier,
	type AcceptanceWaybillDocument,
	type AcceptanceWaybillItem,
	CANONICAL_DENTAL_MATERIAL_TEMPLATES,
	CANONICAL_DENTAL_SUPPLIERS,
	type DentalMaterialTemplate,
	type VatRate,
	calculateWaybillTotals,
	createSampleDentalWaybill,
	createWaybillItem,
	exportWaybillToCsv,
	formatRubCurrency,
	generateTorg12Html,
	reconcileOverdraftOnReceipt,
	sortWaybillItemsByFefo,
	validateWaybillDraft,
} from "../acceptanceWaybillsEngine.js";

export interface UseAcceptanceWaybillsStateProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly initialWaybill?: AcceptanceWaybillDocument | undefined;
	readonly onWaybillPosted?: ((waybill: AcceptanceWaybillDocument) => void | Promise<void>) | undefined;
	readonly inventoryItems?: readonly {
		readonly id: string;
		readonly name: string;
		readonly stockQuantity: number;
		readonly unitCostRub?: string | undefined;
		readonly unit?: string | undefined;
	}[] | undefined;
	readonly getHeaders?: ((extra?: Record<string, string>) => Record<string, string>) | undefined;
}

export function useAcceptanceWaybillsState({
	isOpen,
	onClose,
	organizationId,
	initialWaybill,
	onWaybillPosted,
	inventoryItems = [],
	getHeaders,
}: UseAcceptanceWaybillsStateProps) {
	const [waybill, setWaybill] = useState<AcceptanceWaybillDocument>(() =>
		initialWaybill || createSampleDentalWaybill(),
	);
	const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
		() => initialWaybill?.supplier.id || CANONICAL_DENTAL_SUPPLIERS[0]!.id,
	);
	const [isPosting, setIsPosting] = useState<boolean>(false);
	const inFlightRef = useRef(false);

	useEffect(() => {
		if (isOpen) {
			const initial = initialWaybill || createSampleDentalWaybill();
			setWaybill(initial);
			setSelectedSupplierId(initial.supplier.id);
		}
	}, [isOpen, initialWaybill]);

	const overdraftItemIds = useMemo(() => {
		const map = new Map<string, number>();
		for (const it of inventoryItems) {
			if (it.stockQuantity < 0) {
				map.set(it.name.toLowerCase().trim(), it.stockQuantity);
			}
		}
		return map;
	}, [inventoryItems]);

	const handleSupplierChange = useCallback((supplierId: string) => {
		setSelectedSupplierId(supplierId);
		const found = CANONICAL_DENTAL_SUPPLIERS.find((s) => s.id === supplierId);
		if (found) {
			setWaybill((prev) => ({
				...prev,
				supplier: found,
			}));
		}
	}, []);

	const handleLoadSample = useCallback(() => {
		const sample = createSampleDentalWaybill();
		setWaybill(sample);
		setSelectedSupplierId(sample.supplier.id);
		showToast("Загружен образец накладной Стомторг (Септанест, Филтек, ОптиБонд)", "info");
	}, []);

	const handleAddFromTemplate = useCallback((template: DentalMaterialTemplate) => {
		const expDate = new Date();
		expDate.setMonth(expDate.getMonth() + (template.shelfLifeMonths || 12));
		const expStr = expDate.toISOString().split("T")[0]!;
		const newItem = createWaybillItem({
			name: template.name,
			unit: template.unit,
			quantity: 1,
			unitPriceKopecks: template.defaultUnitPriceKopecks,
			vatRate: template.vatRate,
			category: template.category,
			batchNumber: `${template.defaultBatchPrefix}-${Date.now().toString().slice(-4)}`,
			expirationDate: expStr,
			sku: template.sku,
			barcode: template.barcode,
		});
		setWaybill((prev) => {
			const nextItems = [...prev.items, newItem];
			return {
				...prev,
				items: nextItems,
				totals: calculateWaybillTotals(nextItems),
			};
		});
		showToast(`Добавлена позиция: ${template.name}`, "info");
	}, []);

	const handleAddEmptyItem = useCallback(() => {
		const expDate = new Date();
		expDate.setFullYear(expDate.getFullYear() + 2);
		const empty = createWaybillItem({
			name: "Новый материал",
			unit: "уп",
			quantity: 1,
			unitPriceKopecks: 10000,
			vatRate: 0,
			category: "disposables",
			batchNumber: `LOT-${Date.now().toString().slice(-4)}`,
			expirationDate: expDate.toISOString().split("T")[0]!,
		});
		setWaybill((prev) => {
			const nextItems = [...prev.items, empty];
			return {
				...prev,
				items: nextItems,
				totals: calculateWaybillTotals(nextItems),
			};
		});
	}, []);

	const handleUpdateItem = useCallback((index: number, patch: Partial<AcceptanceWaybillItem>) => {
		setWaybill((prev) => {
			const nextItems = prev.items.map((it, idx) => {
				if (idx !== index) return it;
				const updated = { ...it, ...patch };
				const lineTotal = updated.quantity * updated.unitPriceKopecks;
				const vatTotal = Math.round((lineTotal * updated.vatRate) / 100);
				return {
					...updated,
					lineTotalKopecks: lineTotal,
					vatKopecks: vatTotal,
				};
			});
			return {
				...prev,
				items: nextItems,
				totals: calculateWaybillTotals(nextItems),
			};
		});
	}, []);

	const handleRemoveItem = useCallback((index: number) => {
		setWaybill((prev) => {
			const nextItems = prev.items.filter((_, idx) => idx !== index);
			return {
				...prev,
				items: nextItems,
				totals: calculateWaybillTotals(nextItems),
			};
		});
	}, []);

	const handleSortFefo = useCallback(() => {
		setWaybill((prev) => {
			const sorted = sortWaybillItemsByFefo(prev.items);
			return {
				...prev,
				items: sorted,
			};
		});
		showToast("Позиции отсортированы по правилу FEFO (сначала сгорающие)", "info");
	}, []);

	const handlePrintTorg12 = useCallback(() => {
		const html = generateTorg12Html(waybill);
		const win = window.open("", "_blank");
		if (win) {
			win.document.open();
			win.document.write(html);
			win.document.close();
			win.focus();
			win.print();
		}
	}, [waybill]);

	const handleExportCsv = useCallback(() => {
		const csv = exportWaybillToCsv(waybill);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `ТОРГ12_Накладная_${waybill.waybillNumber || "б_н"}.csv`;
		link.click();
		URL.revokeObjectURL(url);
		showToast("Накладная успешно выгружена в формате CSV (Excel UTF-8)", "success");
	}, [waybill]);

	const handlePostWaybill = useCallback(async () => {
		const validation = validateWaybillDraft(waybill);
		if (!validation.isValid) {
			showToast(`Ошибка валидации: ${validation.errors.join("; ")}`, "error");
			return;
		}

		if (inFlightRef.current) return;
		inFlightRef.current = true;
		setIsPosting(true);

		try {
			if (organizationId) {
				const headers = getHeaders ? getHeaders({ "Content-Type": "application/json" }) : getDenteAuthHeaders({ "Content-Type": "application/json" });
				for (const item of waybill.items) {
					const matchingItem = inventoryItems.find((inv) => inv.name.toLowerCase().trim() === item.name.toLowerCase().trim());
					if (matchingItem) {
						await fetch(`/api/inventory/${organizationId}/${matchingItem.id}/stock`, {
							method: "PATCH",
							headers,
							body: JSON.stringify({
								adjustment: item.quantity,
								reason: `Оприходование накладной №${waybill.waybillNumber} (${waybill.supplier.name})`,
								lotNumber: item.batchNumber,
								expirationDate: item.expirationDate,
								allowOverdraft: true,
							}),
						});
					}
				}
			}

			const postedDoc: AcceptanceWaybillDocument = {
				...waybill,
				status: "posted",
				postedAt: new Date().toISOString(),
				postedBy: "Авторизованный пользователь",
			};

			if (onWaybillPosted) {
				await onWaybillPosted(postedDoc);
			}

			showToast(
				`Накладная №${waybill.waybillNumber} проведена! Оприходовано ${waybill.totals.totalPositions} позиций (${formatRubCurrency(waybill.totals.totalCostKopecks)})`,
				"success",
			);
			onClose();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось провести накладную";
			showToast(msg, "error");
		} finally {
			inFlightRef.current = false;
			setIsPosting(false);
		}
	}, [waybill, organizationId, inventoryItems, getHeaders, onWaybillPosted, onClose]);

	return {
		waybill,
		setWaybill,
		selectedSupplierId,
		isPosting,
		overdraftItemIds,
		handleSupplierChange,
		handleLoadSample,
		handleAddFromTemplate,
		handleAddEmptyItem,
		handleUpdateItem,
		handleRemoveItem,
		handleSortFefo,
		handlePrintTorg12,
		handleExportCsv,
		handlePostWaybill,
	};
}
