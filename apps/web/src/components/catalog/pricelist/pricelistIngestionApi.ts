import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { IngestedMappingItem } from "../../pricing/PriceListMappingDiffView";

export async function requestPricelistIngestApi(
	rawContent: string,
	sourceType: "text" | "csv",
	adminSecret?: string,
): Promise<readonly IngestedMappingItem[] | null> {
	try {
		const res = await fetch("/api/pricelist/ingest", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders(
				{ "Content-Type": "application/json" },
				adminSecret,
			),
			body: JSON.stringify({ rawContent, sourceType }),
		});
		if (res.ok) {
			const data = await res.json();
			if (
				data.success &&
				Array.isArray(data.proposals) &&
				data.proposals.length > 0
			) {
				return data.proposals;
			}
		}
	} catch {
		// Fallback to local offline parsing engine
	}
	return null;
}
