import type {
	DocumentKind,
	DocumentKindMetadata,
	DocumentSourceStatus,
	GeneratedDocument,
} from "@dental/shared";

export function documentRowLifecycleGuidance(
	document: GeneratedDocument,
	documentSourceStatusLabels?: Record<DocumentSourceStatus, string>,
	documentKindMetadataMap?: Record<DocumentKind, DocumentKindMetadata>,
): string {
	const sourceLabel =
		documentSourceStatusLabels?.[
			documentKindMetadataMap?.[document.kind]?.sourceStatus ?? "manual_only"
		] ?? "Ручной ввод";
	if (document.status === "draft") {
		return `Черновик (требует проверки). Источник: ${sourceLabel}. Паспорт покажет источник, блокеры и доступные действия.`;
	}
	if (document.status === "issued") {
		return `Выдано. Источник: ${sourceLabel}. Паспорт показывает подпись, контрольную метку, журнал выдачи. Аннулирование потребует причину и подтверждение архива.`;
	}
	if (document.status === "voided") {
		return `Аннулировано: Открыть и Скачать остаются архивной копией. Источник: ${sourceLabel}.`;
	}
	return `Аннулировано. Источник: ${sourceLabel}.`;
}

export function filterDocumentsForRegistry(params: {
	typedActiveDocuments: GeneratedDocument[];
	activeCategoryTab: string;
	intakeKinds: Set<DocumentKind>;
	clinicalKinds: Set<DocumentKind>;
	financeTaxKinds: Set<DocumentKind>;
	certificatesSanpinKinds: Set<DocumentKind>;
	registrySearchQuery: string;
	registryStatusFilter: string;
	registryEdsFilter: string;
	registryKindFilter: "all" | DocumentKind;
	documentLabels?: Record<string, string>;
}): GeneratedDocument[] {
	let list = params.typedActiveDocuments;
	if (params.activeCategoryTab === "intake") {
		list = list.filter((doc) => params.intakeKinds.has(doc.kind));
	} else if (params.activeCategoryTab === "clinical") {
		list = list.filter((doc) => params.clinicalKinds.has(doc.kind));
	} else if (params.activeCategoryTab === "finance_tax") {
		list = list.filter((doc) => params.financeTaxKinds.has(doc.kind));
	} else if (params.activeCategoryTab === "certificates_sanpin") {
		list = list.filter((doc) => params.certificatesSanpinKinds.has(doc.kind));
	}
	if (params.registrySearchQuery.trim()) {
		const query = params.registrySearchQuery.toLowerCase().trim();
		list = list.filter(
			(doc) =>
				doc.title?.toLowerCase().includes(query) ||
				doc.kind?.toLowerCase().includes(query) ||
				(params.documentLabels?.[doc.kind] ?? "").toLowerCase().includes(query),
		);
	}
	if (params.registryStatusFilter !== "all") {
		list = list.filter((doc) => doc.status === params.registryStatusFilter);
	}
	if (params.registryEdsFilter !== "all") {
		list = list.filter((doc) => {
			const isSignedEds = Boolean(doc.doctorSignedAt || (doc as any).signedAt);
			const isSignedPaper = Boolean(doc.signatureAttestation && !isSignedEds);
			if (params.registryEdsFilter === "signed_eds") return isSignedEds;
			if (params.registryEdsFilter === "signed_paper") return isSignedPaper;
			if (params.registryEdsFilter === "unsigned") return !isSignedEds && !isSignedPaper;
			return true;
		});
	}
	if (params.registryKindFilter !== "all") {
		list = list.filter((doc) => doc.kind === params.registryKindFilter);
	}
	return list;
}

export function computeAvailableRegistryKinds(
	typedActiveDocuments: GeneratedDocument[],
	documentLabels?: Record<string, string>,
): Array<{ key: DocumentKind; label: string; count: number }> {
	const counts: Record<string, number> = {};
	for (const doc of typedActiveDocuments) {
		counts[doc.kind] = (counts[doc.kind] ?? 0) + 1;
	}
	return (Object.keys(counts) as DocumentKind[]).map((kind) => ({
		key: kind,
		label: documentLabels?.[kind] ?? kind,
		count: counts[kind] ?? 0,
	}));
}

export { computeDocumentIssueMissingSteps, computeNavCategoryCounts } from "./documentRegistryCounters";
