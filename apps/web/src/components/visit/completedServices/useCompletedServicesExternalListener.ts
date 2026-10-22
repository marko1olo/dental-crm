import React from "react";
import { formatCompletedServiceLine } from "../completedServicesPlan";

interface ExternalListenerParams {
	readonly planText: string;
	readonly planLines: string[];
	readonly updateVisitNoteField?: ((field: string, value: unknown) => void) | undefined;
}

export function useCompletedServicesExternalListener({
	planText,
	planLines,
	updateVisitNoteField,
}: ExternalListenerParams): void {
	React.useEffect(() => {
		const handleExternal = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail || !updateVisitNoteField) return;
			const s = detail.source;
			if (
				s === "chairside_express" ||
				s === "chairside_catalog" ||
				s === "chairside_bundle" ||
				s === "chairside_checklist_all" ||
				s === "chairside_checklist_toggle" ||
				s === "chairside_tooth_tabs"
			) {
				return;
			}
			const rawList = Array.isArray(detail.services)
				? detail.services
				: Array.isArray(detail.items)
					? detail.items
					: detail.service
						? [detail.service]
						: [];
			if (rawList.length === 0) return;

			const newLines: string[] = [];
			for (const item of rawList) {
				const tooth =
					item.toothCode ??
					item.toothNumber ??
					detail.toothCode ??
					detail.toothNumber;
				const formatted = formatCompletedServiceLine({
					code804n: item.code804n || item.code || "A16.07.001",
					title: item.title || item.name || item.nameRu || "Стоматологическая услуга",
					priceRub: Number(item.priceRub ?? item.unitPriceRub ?? item.price ?? 0),
					toothCode: tooth ? String(tooth) : null,
				});
				if (!planLines.includes(formatted)) {
					newLines.push(formatted);
				}
			}
			if (newLines.length > 0) {
				const base = (planText ?? "").replace(/\s+$/, "");
				const updated = base ? `${base}\n${newLines.join("\n")}` : newLines.join("\n");
				updateVisitNoteField("treatmentPlan", updated);
			}
		};

		window.addEventListener("dente-add-services-to-invoice", handleExternal);
		return () => {
			window.removeEventListener("dente-add-services-to-invoice", handleExternal);
		};
	}, [planText, planLines, updateVisitNoteField]);
}
