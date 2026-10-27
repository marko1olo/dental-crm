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
import { sendWaybillToApi } from "./waybillApiSender.js";

export function useAcceptanceWaybillsApiPoster({
	waybill, organizationId, inventoryItems, getHeaders, onWaybillPosted, onClose, setIsPosting,
}: {
	waybill: AcceptanceWaybillDocument;
	organizationId?: string | undefined;
	inventoryItems: readonly {
		readonly id: string;
		readonly name: string;
		readonly stockQuantity: number | string;
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
			const headers = getHeaders
				? getHeaders({ "Content-Type": "application/json" })
				: getDenteAuthHeaders({ "Content-Type": "application/json" });

			if (organizationId) {
				await sendWaybillToApi(waybill, organizationId, inventoryItems, headers);
			}

			const postedDoc: AcceptanceWaybillDocument = {
				...waybill,
				status: "posted",
				postedAt: new Date().toISOString(),
				postedBy: "Авторизованный пользователь",
			};

			if (onWaybillPosted) await onWaybillPosted(postedDoc);

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
