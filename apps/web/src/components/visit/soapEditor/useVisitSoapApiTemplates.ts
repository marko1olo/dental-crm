import { useEffect, useMemo, useState } from "react";
import {
	type OutpatientSpecialty,
	searchAll448Templates,
	type StomxOutpatientTemplateMetadata,
} from "@dental/shared";
import { resolveProtocolFromTemplate } from "./protocolsResolver";

export function useVisitSoapApiTemplates(
	searchQuery: string,
	activeSpecialty: OutpatientSpecialty | "all",
) {
	const [apiTemplates, setApiTemplates] = useState<
		StomxOutpatientTemplateMetadata[] | null
	>(null);
	const [templatesLimit, setTemplatesLimit] = useState<number>(30);

	useEffect(() => {
		let isMounted = true;
		const fetchTemplates = async () => {
			try {
				const res = await fetch("/api/clinical/outpatient-templates?limit=500");
				if (res.ok) {
					const data = await res.json();
					if (isMounted && data?.templates && Array.isArray(data.templates) && data.templates.length > 0) {
						const formatted: StomxOutpatientTemplateMetadata[] = data.templates.map((t: any) => ({
							id: Number(t.id),
							categoryId: Number(t.categoryId),
							categoryName: t.categoryName || "Клинический протокол",
							specialty: (t.categorySpecialty as OutpatientSpecialty) || "therapy",
							name: t.name || "",
							mkbCode: t.mkbCode || "K02",
						}));
						setApiTemplates(formatted);
					}
				}
			} catch {
				// Офлайн-режим: тихий фоллбэк на локальный кэш
			}
		};
		void fetchTemplates();
		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		setTemplatesLimit(30);
	}, [searchQuery, activeSpecialty]);

	const filteredProtocols = useMemo(() => {
		const specFilter = activeSpecialty === "all" ? undefined : activeSpecialty;
		if (apiTemplates && apiTemplates.length > 0) {
			const q = searchQuery.toLowerCase().trim();
			const matched = apiTemplates.filter((t) => {
				if (specFilter && t.specialty !== specFilter) return false;
				if (!q) return true;
				return (
					t.name.toLowerCase().includes(q) ||
					t.mkbCode.toLowerCase().includes(q) ||
					t.categoryName.toLowerCase().includes(q)
				);
			});
			return matched.map(resolveProtocolFromTemplate);
		}
		const matchingTemplates = searchAll448Templates(searchQuery, specFilter);
		return matchingTemplates.map(resolveProtocolFromTemplate);
	}, [apiTemplates, searchQuery, activeSpecialty]);

	return {
		filteredProtocols,
		templatesLimit,
		setTemplatesLimit,
	};
}
