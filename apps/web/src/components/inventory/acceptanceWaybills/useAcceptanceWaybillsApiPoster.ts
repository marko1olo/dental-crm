import { useCallback, useRef } from "react";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders.js";
import { showToast } from "../../GlobalToast.js";
import {
	type AcceptanceWaybillDocument,
	formatRubCurrency,
	validateWaybillDraft,
} from "../acceptanceWaybillsEngine.js";
import {
	exportWaybillCsv,
	printTorg12Document,
} from "./acceptanceWaybillsPrintExport.js";

export function useAcceptanceWaybillsApiPoster({
	waybill, organizationId, inventoryItems, getHeaders, onWaybillPosted, onClose, setIsPosting,
}: {
	waybill: AcceptanceWaybillDocument;
	organizationId?: string | undefined;
	inventoryItems: readonly {
		readonly id: string;
		readonly name: string;
		readonly stockQuantity: number;
	}[];
	getHeaders?: ((extra?: Record<string, string>) => Record<string, string>) | undefined;
	onWaybillPosted?: ((waybill: AcceptanceWaybillDocument) => void | Promise<void>) | undefined;
	onClose: () => void;
	setIsPosting: (isPosting: boolean) => void;
}) {
	const inFlightRef = useRef(false);

	const handlePrintTorg12 = useCallback(() => printTorg12Document(waybill), [waybill]);
	const handleExportCsv = useCallback(() => exportWaybillCsv(waybill), [waybill]);

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
				const headers = getHeaders
					? getHeaders({ "Content-Type": "application/json" })
					: getDenteAuthHeaders({ "Content-Type": "application/json" });
				for (const item of waybill.items) {
					const matchingItem = inventoryItems.find(
						(inv) => inv.name.toLowerCase().trim() === item.name.toLowerCase().trim(),
					);
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
	}, [waybill, organizationId, inventoryItems, getHeaders, onWaybillPosted, onClose, setIsPosting]);

	return {
		handlePrintTorg12,
		handleExportCsv,
		handlePostWaybill,
	};
}
