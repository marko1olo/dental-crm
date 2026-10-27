import { useState, useMemo, useCallback, useEffect } from "react";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../../../lib/safeLocalStorage";
import type { ConsentRecordState, VisitConsentsTabPatient, VisitConsentsTabAppointment, VisitConsentsTabNoteForm } from "../visitConsentTypes";

export function useConsentRecordsState(
	activePatient?: VisitConsentsTabPatient | null | undefined,
	activeAppointment?: VisitConsentsTabAppointment | null | undefined,
	visitNoteForm?: VisitConsentsTabNoteForm | null | undefined,
) {
	const patientId = activePatient?.id || "default_patient";
	const storageKey = `dente_consents_state_${patientId}`;

	const [activeSubTab, setActiveSubTab] = useState<"current" | "archive">("current");
	const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
	const [activeDropdownKey, setActiveDropdownKey] = useState<string | null>(null);

	useEffect(() => {
		if (!activeDropdownKey) return;
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement | null;
			if (!target?.closest(".vct-dropdown-wrapper")) {
				setActiveDropdownKey(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [activeDropdownKey]);

	const [consentRecords, setConsentRecords] = useState<Record<string, ConsentRecordState>>(() => {
		try {
			const saved = safeLocalStorageGetItem(storageKey);
			if (saved) return JSON.parse(saved);
		} catch {
			// ignore json error
		}
		return {};
	});

	const saveConsentRecords = useCallback((nextRecords: Record<string, ConsentRecordState>) => {
		setConsentRecords(nextRecords);
		try {
			safeLocalStorageSetItem(storageKey, JSON.stringify(nextRecords));
		} catch {
			// ignore storage errors
		}
	}, [storageKey]);

	const isVisitClosed = useMemo(() => {
		return (
			activeAppointment?.status === "completed" ||
			activeAppointment?.status === "signed" ||
			activeAppointment?.status === "closed" ||
			visitNoteForm?.status === "completed" ||
			visitNoteForm?.status === "signed"
		);
	}, [activeAppointment?.status, visitNoteForm?.status]);

	const toggleCardExpand = useCallback((key: string) => {
		setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	return {
		patientId,
		storageKey,
		activeSubTab,
		setActiveSubTab,
		expandedCards,
		toggleCardExpand,
		activeDropdownKey,
		setActiveDropdownKey,
		consentRecords,
		setConsentRecords,
		saveConsentRecords,
		isVisitClosed,
	};
}
