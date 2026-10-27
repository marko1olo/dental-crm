import { useCallback } from "react";
import { showToast } from "../../../GlobalToast";
import { generateSha256 } from "../../../consents/consentIntegrityHash";
import { CLINICAL_CONSENTS_LIST, type ConsentRecordState } from "../visitConsentTypes";
import type { ConsentScopeMismatchResult } from "../../../consents/consentSummaryHelper";
import type { ConsentTemplateKey } from "../../../consents/consentTemplates";

interface UseConsentAddendumParams {
	patientId: string;
	consentRecords: Record<string, ConsentRecordState>;
	consentScopeMismatch: ConsentScopeMismatchResult;
	doctorName?: string | undefined;
	saveConsentRecords: (next: Record<string, ConsentRecordState>) => void;
	persistConsentToBackend: (key: ConsentTemplateKey, title: string, rec: ConsentRecordState) => Promise<void>;
	handlePrintSingleFilled: (key: ConsentTemplateKey) => void;
	handlePrintTodayPackage: () => void;
}

export function useConsentAddendumActions({
	patientId, consentRecords, consentScopeMismatch, doctorName,
	saveConsentRecords, persistConsentToBackend, handlePrintSingleFilled, handlePrintTodayPackage,
}: UseConsentAddendumParams) {
	const handleFormAddendumConsent = useCallback(() => {
		if (consentScopeMismatch.uncoveredTemplateKeys.length === 0) {
			showToast("Все процедуры текущего визита уже покрыты соглашением", "info");
			return;
		}
		const nowStr = `${new Date().toLocaleDateString("ru-RU")}, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
		const next = { ...consentRecords };
		for (const tplKey of consentScopeMismatch.uncoveredTemplateKeys) {
			const conf = CLINICAL_CONSENTS_LIST.find((c) => c.key === tplKey);
			const title = conf?.title || tplKey;
			const rec: ConsentRecordState = {
				isSigned: true, signedAt: nowStr, method: "paper", doctorName: doctorName || "Врач-стоматолог",
				notes: "Дополнительное информированное согласие на добавленные процедуры подписано на бумаге",
				integrityHash: generateSha256(`ADDENDUM_${tplKey}_${patientId}_${nowStr}`),
			};
			next[tplKey] = rec;
			void persistConsentToBackend(tplKey, title, rec);
		}
		saveConsentRecords(next);
		if (consentScopeMismatch.uncoveredTemplateKeys.length === 1 && consentScopeMismatch.uncoveredTemplateKeys[0]) {
			handlePrintSingleFilled(consentScopeMismatch.uncoveredTemplateKeys[0]);
		} else {
			handlePrintTodayPackage();
		}
		showToast("Сформировано и отправлено на печать доп. согласие на новые процедуры", "success");
	}, [consentScopeMismatch, consentRecords, doctorName, patientId, persistConsentToBackend, saveConsentRecords, handlePrintSingleFilled, handlePrintTodayPackage]);

	const handleMarkAddendumSigned = useCallback(() => {
		if (consentScopeMismatch.uncoveredTemplateKeys.length === 0) {
			showToast("Все процедуры текущего визита уже покрыты соглашением", "info");
			return;
		}
		const nowStr = `${new Date().toLocaleDateString("ru-RU")}, ${new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
		const next = { ...consentRecords };
		for (const tplKey of consentScopeMismatch.uncoveredTemplateKeys) {
			const conf = CLINICAL_CONSENTS_LIST.find((c) => c.key === tplKey);
			const title = conf?.title || tplKey;
			const rec: ConsentRecordState = {
				isSigned: true, signedAt: nowStr, method: "paper", doctorName: doctorName || "Врач-стоматолог",
				notes: "Дополнительное информированное согласие на добавленные процедуры подписано на бумаге",
				integrityHash: generateSha256(`ADDENDUM_${tplKey}_${patientId}_${nowStr}`),
			};
			next[tplKey] = rec;
			void persistConsentToBackend(tplKey, title, rec);
		}
		saveConsentRecords(next);
		showToast("Дополнительное согласие на новые процедуры отмечено подписанным", "success");
	}, [consentScopeMismatch, consentRecords, doctorName, patientId, persistConsentToBackend, saveConsentRecords]);

	return { handleFormAddendumConsent, handleMarkAddendumSigned };
}
