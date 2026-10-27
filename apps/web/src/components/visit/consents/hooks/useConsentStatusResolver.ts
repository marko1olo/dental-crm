import { useMemo } from "react";
import { getConsentTemplate, renderConsentTemplate, type ConsentTemplateKey, type ConsentSubstitutionContext } from "../../../consents/consentTemplates";
import { CLINICAL_CONSENTS_LIST, type ConsentStatusType, type ConsentRecordState } from "../visitConsentTypes";

interface UseConsentStatusResolverParams {
	consentRecords: Record<string, ConsentRecordState>;
	requiredFlags: Partial<Record<ConsentTemplateKey, boolean>>;
	substitutionContext: ConsentSubstitutionContext;
}

export function useConsentStatusResolver({
	consentRecords,
	requiredFlags,
	substitutionContext,
}: UseConsentStatusResolverParams) {
	const itemsWithStatus = useMemo(() => {
		return CLINICAL_CONSENTS_LIST.map((item) => {
			const record = consentRecords[item.key];
			const isSigned = Boolean(record?.isSigned);
			const isReq = Boolean(requiredFlags[item.key]);

			let status: ConsentStatusType = "not_signed";
			if (isSigned) {
				status = "signed";
			} else if (isReq) {
				status = "required_today";
			}

			let renderedTemplate: ReturnType<typeof renderConsentTemplate> | null = null;
			try {
				const tpl = getConsentTemplate(item.key);
				renderedTemplate = renderConsentTemplate(tpl, substitutionContext);
			} catch {
				// template missing fallback
			}

			return {
				...item,
				status,
				record,
				renderedTemplate,
			};
		});
	}, [consentRecords, requiredFlags, substitutionContext]);

	const unsignedRequiredItems = useMemo(() => {
		return itemsWithStatus.filter((item) => item.status === "required_today");
	}, [itemsWithStatus]);

	const archiveList = useMemo(() => {
		return Object.entries(consentRecords)
			.filter(([_, rec]) => rec.isSigned)
			.map(([key, rec]) => {
				const conf = CLINICAL_CONSENTS_LIST.find((c) => c.key === key);
				return {
					key: key as ConsentTemplateKey,
					code: conf?.code || key,
					title: conf?.title || key,
					category: conf?.category || "Медицинская документация",
					statutoryBasis: conf?.statutoryBasis || "Клинический стандарт",
					record: rec,
				};
			});
	}, [consentRecords]);

	return { itemsWithStatus, unsignedRequiredItems, archiveList };
}
