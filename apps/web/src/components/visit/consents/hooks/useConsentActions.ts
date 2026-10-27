import { useCallback } from "react";
import { showToast } from "../../../GlobalToast";
import { generateSha256 } from "../../../consents/consentIntegrityHash";
import {
	printFilledConsentTemplate, printBlankConsentTemplate, printFilledConsentPackage,
	type ConsentTemplateKey, type ConsentPackageKey, type ConsentSubstitutionContext,
} from "../../../consents/consentTemplates";
import type { ConsentRecordState } from "../visitConsentTypes";

interface UseConsentActionsParams {
	patientId: string;
	consentRecords: Record<string, ConsentRecordState>;
	unsignedRequiredItems: any[];
	signedConsentKeys: ConsentTemplateKey[];
	requiredFlags: Partial<Record<ConsentTemplateKey, boolean>>;
	substitutionContext: ConsentSubstitutionContext;
	saveConsentRecords: (next: Record<string, ConsentRecordState>) => void;
	persistConsentToBackend: (key: ConsentTemplateKey, title: string, rec: ConsentRecordState) => Promise<void>;
	onFastPrintInformedConsent?: (() => void) | undefined;
}

export function useConsentActions({
	patientId, consentRecords, unsignedRequiredItems, signedConsentKeys,
	requiredFlags, substitutionContext, saveConsentRecords,
	persistConsentToBackend, onFastPrintInformedConsent,
}: UseConsentActionsParams) {
	const handleTogglePaperSigned = useCallback((key: ConsentTemplateKey, itemTitle: string) => {
		if (consentRecords[key]?.isSigned) {
			const next = { ...consentRecords };
			delete next[key];
			saveConsentRecords(next);
			showToast(`Отметка о согласии «${itemTitle}» снята`, "info");
		} else {
			const nowStr = `${new Date().toLocaleDateString("ru-RU")}, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
			const rec: ConsentRecordState = {
				isSigned: true, signedAt: nowStr, method: "paper", doctorName: substitutionContext.doctorName || "Врач-стоматолог",
				notes: "Оригинал подписан на бумаге и подшит в медицинскую карту", integrityHash: generateSha256(`${key}_${patientId}_${nowStr}_paper`),
			};
			const next = { ...consentRecords, [key]: rec };
			saveConsentRecords(next);
			showToast(`Согласие «${itemTitle}» отмечено как подписанное на бумаге`, "success");
			void persistConsentToBackend(key, itemTitle, rec);
		}
	}, [consentRecords, patientId, persistConsentToBackend, saveConsentRecords, substitutionContext.doctorName]);

	const handleMarkAllRequiredTodaySigned = useCallback(() => {
		if (unsignedRequiredItems.length === 0) {
			showToast("Все требуемые на сегодня согласия уже подписаны", "info");
			return;
		}
		const nowStr = `${new Date().toLocaleDateString("ru-RU")}, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
		const next = { ...consentRecords };
		for (const item of unsignedRequiredItems) {
			const rec: ConsentRecordState = {
				isSigned: true, signedAt: nowStr, method: "paper", doctorName: substitutionContext.doctorName || "Врач-стоматолог",
				notes: "Оригинал подписан на бумаге (пакет на сегодня)", integrityHash: generateSha256(`${item.key}_${patientId}_${nowStr}_paper`),
			};
			next[item.key] = rec;
			void persistConsentToBackend(item.key, item.title, rec);
		}
		saveConsentRecords(next);
		showToast(`Оформлено на бумаге: ${unsignedRequiredItems.length} согласий`, "success");
	}, [unsignedRequiredItems, consentRecords, substitutionContext.doctorName, patientId, persistConsentToBackend, saveConsentRecords]);

	const handlePrintSingleFilled = useCallback((key: ConsentTemplateKey) => {
		if (key === "CONSENT_INSPECTION_1051N" && onFastPrintInformedConsent) {
			onFastPrintInformedConsent();
			return;
		}
		const isItemSigned = Boolean(consentRecords[key]?.isSigned);
		printFilledConsentTemplate(key, substitutionContext, {
			isSigned: isItemSigned, watermarkText: isItemSigned ? "ПОДПИСАНО НА БУМАГЕ" : "ДЛЯ ОЗНАКОМЛЕНИЯ И ПОДПИСИ",
		});
		showToast("Бланк согласия на лечение отправлен на печать", "success");
	}, [consentRecords, onFastPrintInformedConsent, substitutionContext]);

	const handlePrintSingleBlank = useCallback((key: ConsentTemplateKey) => {
		printBlankConsentTemplate(key, substitutionContext);
		showToast("Чистый бланк согласия на лечение отправлен на печать", "info");
	}, [substitutionContext]);

	const handlePrintTodayPackage = useCallback(() => {
		let pkgKey: ConsentPackageKey = "PACKAGE_PRIMARY_VISIT";
		if (requiredFlags.CONSENT_SURGERY_IMPLANT) pkgKey = "PACKAGE_SURGERY";
		else if (requiredFlags.CONSENT_ORTHOPEDICS) pkgKey = "PACKAGE_ORTHOPEDICS";
		const allRequiredSigned = unsignedRequiredItems.length === 0 && signedConsentKeys.length > 0;
		printFilledConsentPackage(pkgKey, substitutionContext, {
			isSigned: allRequiredSigned, watermarkText: allRequiredSigned ? "ПОДПИСАНО НА БУМАГЕ" : "ДЛЯ ПОДПИСИ ПАЦИЕНТОМ",
		});
		showToast("Пакет согласий на сегодня сформирован и отправлен на печать", "success");
	}, [requiredFlags, substitutionContext, unsignedRequiredItems.length, signedConsentKeys.length]);

	return {
		handleTogglePaperSigned, handleMarkAllRequiredTodaySigned, handlePrintSingleFilled,
		handlePrintSingleBlank, handlePrintTodayPackage,
	};
}
