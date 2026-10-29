import type React from "react";
import { useState } from "react";
import type { IngestedMappingItem } from "../mappingDiff";
import {
	mapProposalsToDiffItems,
	mergeApprovedDiffItems,
} from "./pricelistImportMappingHelper";
import { requestPricelistIngestApi } from "./pricelistIngestionApi";
import {
	importPricelistFromCsv,
	parseUnstructuredPriceText,
} from "./servicePricelistEngine";
import type { ServicePricelistItem } from "./servicePricelistPresets";

export function usePricelistImportState(
	items: readonly ServicePricelistItem[],
	onApplyImported: (
		updated: readonly ServicePricelistItem[],
		msg: string,
	) => void,
	adminSecret?: string,
) {
	const [importMode, setImportMode] = useState<"smart_text" | "csv">(
		"smart_text",
	);
	const [smartTextInput, setSmartTextInput] = useState("");
	const [ingestedMappingItems, setIngestedMappingItems] = useState<
		readonly IngestedMappingItem[]
	>([]);
	const [isIngestingApi, setIsIngestingApi] = useState(false);
	const [importErrors, setImportErrors] = useState<string[]>([]);

	const handleIngestPriceList = async (
		contentToParse: string,
		sourceType: "text" | "csv" = "text",
	) => {
		const text = contentToParse.trim();
		if (!text) {
			setIngestedMappingItems([]);
			return;
		}
		setIsIngestingApi(true);
		const apiProposals = await requestPricelistIngestApi(
			text,
			sourceType,
			adminSecret,
		);
		if (apiProposals) {
			setIngestedMappingItems(apiProposals);
			setIsIngestingApi(false);
			return;
		}
		const localProposals = parseUnstructuredPriceText(text);
		setIngestedMappingItems(mapProposalsToDiffItems(localProposals, items));
		setIsIngestingApi(false);
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async (ev) => {
			const content = ev.target?.result as string;
			if (
				file.name.toLowerCase().endsWith(".csv") ||
				file.type.includes("csv")
			) {
				const parseRes = importPricelistFromCsv(content);
				if (parseRes.invalidRows.length > 0)
					setImportErrors(parseRes.invalidRows.map((r) => r.error));
				if (parseRes.validItems.length > 0) {
					onApplyImported(
						[...parseRes.validItems, ...items],
						`Импортировано ${parseRes.validItems.length} услуг из CSV`,
					);
				}
			} else {
				setSmartTextInput(content);
				await handleIngestPriceList(content, "text");
			}
		};
		reader.readAsText(file, "utf-8");
	};

	const handleApplyIngestedMapping = () => {
		const approved = ingestedMappingItems.filter((i) => i.isApproved);
		if (approved.length === 0) return;
		const updated = mergeApprovedDiffItems(approved, items);
		onApplyImported(
			updated,
			`Успешно сохранено ${approved.length} услуг в каталог`,
		);
		setIngestedMappingItems([]);
	};

	return {
		importMode,
		setImportMode,
		smartTextInput,
		setSmartTextInput,
		ingestedMappingItems,
		setIngestedMappingItems,
		isIngestingApi,
		importErrors,
		handleIngestPriceList,
		handleFileUpload,
		handleApplyIngestedMapping,
	};
}
