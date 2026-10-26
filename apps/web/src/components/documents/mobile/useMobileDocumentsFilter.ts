import { useMemo, useState } from "react";
import type { DocumentKind, GeneratedDocument } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../utils/demoModeEngine";
import { DEMO_SHOWCASE_DOCUMENTS, MOBILE_CATEGORIES } from "./mobileDocumentsConstants";
import type { MobileCategoryTab } from "./mobileDocumentsTypes";

export function useMobileDocumentsFilter(
	documents: GeneratedDocument[],
	documentLabels?: Record<DocumentKind, string>,
) {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<MobileCategoryTab>("all");
	const [activeStatus, setActiveStatus] = useState<"all" | "draft" | "signed">("all");

	const effectiveDocuments = useMemo(() => {
		if (documents && documents.length > 0) return documents;
		if (isDemoShowcaseMode()) return DEMO_SHOWCASE_DOCUMENTS;
		return [];
	}, [documents]);

	const filteredDocs = useMemo(() => {
		let list = effectiveDocuments;

		if (activeCategory !== "all") {
			const catObj = MOBILE_CATEGORIES.find((c) => c.id === activeCategory);
			if (catObj?.kinds) {
				const kindSet = new Set(catObj.kinds);
				list = list.filter((d) => kindSet.has(d.kind));
			}
		}

		if (activeStatus === "draft") {
			list = list.filter((d) => d.status === "draft");
		} else if (activeStatus === "signed") {
			list = list.filter((d) => d.status === "issued");
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter((d) => {
				const title = d.title?.toLowerCase() ?? "";
				const kind = d.kind?.toLowerCase() ?? "";
				const label = (documentLabels?.[d.kind] ?? "").toLowerCase();
				return title.includes(q) || kind.includes(q) || label.includes(q);
			});
		}

		return list;
	}, [effectiveDocuments, activeCategory, activeStatus, searchQuery, documentLabels]);

	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = { all: effectiveDocuments.length };
		for (const cat of MOBILE_CATEGORIES) {
			if (cat.id === "all") continue;
			if (cat.kinds) {
				const set = new Set(cat.kinds);
				counts[cat.id] = effectiveDocuments.filter((d) => set.has(d.kind)).length;
			} else {
				counts[cat.id] = 0;
			}
		}
		return counts;
	}, [effectiveDocuments]);

	return {
		searchQuery,
		setSearchQuery,
		activeCategory,
		setActiveCategory,
		activeStatus,
		setActiveStatus,
		effectiveDocuments,
		filteredDocs,
		categoryCounts,
	};
}
