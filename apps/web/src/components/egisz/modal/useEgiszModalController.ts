/**
 * useEgiszModalController.ts — Modal state and network dispatch controller for EGISZ REMD Hub.
 * Mandate 8b compliant (<= 120 lines). Mandate 8e Doctor Autonomy.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import type { RemdDocumentRecord, RemdDocumentStatus } from "../egiszJournalData";
import { buildDeferredRemdRecord, submitCdaPackageToRemd, submitFnsTaxToGateway } from "../egiszPackageSender";
import type { useEgiszRemdState } from "../useEgiszRemdState";
import type { useCryptoProSigning } from "../useCryptoProSigning";
import type { EgiszHubActiveDocType, EgiszHubModalTab } from "./modalTypes";
import { useJournalRecords } from "./useJournalRecords";

export function useEgiszModalController({
	isOpen, onClose, initialDocType = "cda_semd", initialTab,
	initialJournalFilter, initialJournalSelectedId, initialJournalRecords,
	onSentSuccess, state, crypto,
}: {
	isOpen: boolean; onClose: () => void; initialDocType?: EgiszHubActiveDocType | undefined;
	initialTab?: EgiszHubModalTab | undefined; initialJournalFilter?: RemdDocumentStatus | "all" | undefined;
	initialJournalSelectedId?: string | undefined; initialJournalRecords?: RemdDocumentRecord[] | undefined;
	onSentSuccess?: ((result: { type: string; documentId: string; timestamp: string }) => void) | undefined;
	state: ReturnType<typeof useEgiszRemdState>; crypto: ReturnType<typeof useCryptoProSigning>;
}) {
	const [activeDocType, setActiveDocType] = useState<EgiszHubActiveDocType>(initialDocType);
	const normalizedInitialTab = useMemo<EgiszHubModalTab>(() => {
		if (initialTab === "xml") return "xml_preview";
		if (initialTab === "signing") return "signature";
		return initialTab || (initialDocType === "fns_tax" ? "tax_deduction" : "clinical");
	}, [initialTab, initialDocType]);
	const [activeTab, setActiveTab] = useState<EgiszHubModalTab>(normalizedInitialTab);
	const [isSending, setIsSending] = useState<boolean>(false);
	const [signaturePreviewMode, setSignaturePreviewMode] = useState<"print" | "xml">("print");
	const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
		header: false, frmo: false, doctor: false, patient: false, diagnosis: false, dentalFormula: false, procedures: false,
	});
	const toggleSection = (key: string) => setCollapsedSections((p) => ({ ...p, [key]: !p[key] }));

	const journal = useJournalRecords(isOpen, state.clinic, initialJournalRecords, initialJournalFilter, initialJournalSelectedId);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	const handleQueueDeferred = useCallback(() => {
		const deferred = buildDeferredRemdRecord({
			docType: activeDocType, semdDocCode: state.semdDocCode, patient: state.patient,
			doctor: state.doctor, clinic: state.clinic, semdPayload: state.semdPayload,
			taxPatientName: state.taxPatientName, taxPatientSnils: state.taxPatientSnils,
		});
		journal.setRecords((p) => [deferred, ...p]);
		showToast("Документ помещен в очередь «Отложенная отправка ЕГИСЗ». Прием и расчет не заблокированы!", "success");
		if (onSentSuccess) onSentSuccess({ type: activeDocType, documentId: deferred.id, timestamp: new Date().toISOString() });
	}, [activeDocType, state, onSentSuccess, journal]);

	const handleSendToRegistry = async () => {
		if (isSending) return;
		if (!crypto.doctorSig && activeDocType === "cda_semd") {
			handleQueueDeferred();
			showToast("УКЭП не наложена. Документ отправлен в отложенную очередь для фонового подписания!", "info");
			return;
		}
		setIsSending(true);
		try {
			if (activeDocType === "cda_semd") {
				const txId = await submitCdaPackageToRemd({ semdPayload: state.semdPayload, generatedXml: state.generatedXml, doctorSig: crypto.doctorSig, moSig: crypto.moSig });
				showToast(`СЭМД успешно передан в РЭМД ЕГИСЗ (Рег. №: ${txId})`, "success");
				if (onSentSuccess) onSentSuccess({ type: activeDocType, documentId: txId, timestamp: new Date().toISOString() });
			} else {
				const txId = await submitFnsTaxToGateway({ patientId: state.fnsPayload.taxpayer?.inn || "taxpayer", visitId: state.fnsPayload.documentNumber || `FNS-${Date.now()}` });
				showToast(`Справка для налогового вычета успешно передана в шлюз (ID: ${txId})`, "success");
				if (onSentSuccess) onSentSuccess({ type: activeDocType, documentId: txId, timestamp: new Date().toISOString() });
			}
		} catch (err: unknown) {
			handleQueueDeferred();
			showToast(`Шлюз ЕГИСЗ временно недоступен (${err instanceof Error ? err.message : String(err)}). Документ сохранен в очередь.`, "warning");
		} finally {
			setIsSending(false);
		}
	};

	return {
		activeDocType, setActiveDocType, activeTab, setActiveTab, isSending,
		signaturePreviewMode, setSignaturePreviewMode, collapsedSections, toggleSection,
		records: journal.records, setRecords: journal.setRecords, isLoadingJournal: journal.isLoadingJournal,
		journalFilter: journal.journalFilter, setJournalFilter: journal.setJournalFilter,
		selectedJournalId: journal.selectedJournalId, setSelectedJournalId: journal.setSelectedJournalId,
		handleQueueDeferred, handleSendToRegistry, handleRefreshOutbox: journal.handleRefreshOutbox,
		handleBatchSendShift: () => journal.handleBatchSendShift(setIsSending),
	};
}
