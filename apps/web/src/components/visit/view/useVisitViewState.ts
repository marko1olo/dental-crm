/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit View State Master Hook (Facade <= 250 Lines)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Фасадный хук состояния окна визита врача (Мандат 8e / Анти-монолит).
 * Декомпозирован на суб-модули:
 * - useVisitProtocolSync (синхронизация с бэкендом, L2 IndexedDB и Continuity Intake)
 * - useVisitFastPrintState (быстрая печать 043/у, ИДС, акта, соматические бейджи)
 * - useVisitBillingState (связка сметы визита с кассой и 54-ФЗ)
 * - useVisitToothHandlers (клик по зубам, поверхности, мост одонтограммы в ЭМК)
 * - useVisitModalsState (флаги открытия клинических диалогов)
 */

import React, { useCallback, useEffect, useState } from "react";
import { useSoftPresence } from "../../../hooks/useSoftPresence";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useIsMobile } from "../../../hooks/useIsMobile";
import type { VisitViewProps } from "./types";
import { useVisitProtocolSync } from "./viewStateModules/useVisitProtocolSync";
import { useVisitFastPrintState } from "./viewStateModules/useVisitFastPrintState";
import { useVisitBillingState } from "./viewStateModules/useVisitBillingState";
import { useVisitToothHandlers } from "./viewStateModules/useVisitToothHandlers";
import { useVisitModalsState } from "./viewStateModules/useVisitModalsState";

export function useVisitViewState(rawProps?: Partial<VisitViewProps>) {
	const appLogic = (useAppLogicContext() as Partial<VisitViewProps>) || {};
	const props = { ...appLogic, ...(rawProps || {}) } as VisitViewProps;

	const {
		activePatient,
		activeAppointment,
		activeDoctor,
		dashboard,
		transcript = "",
		setTranscript,
		hasVisitTranscriptText,
		isTranscriptPolishing,
		polishTranscript,
		updateVisitNoteField,
		visitNoteForm,
		flushPendingVisitSaves,
		toothRows = [
			["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
			["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"],
		],
		toothStateByCode = {},
		setToothState = () => {},
		draft,
		visitWarnings,
		visitPrimaryAction,
		setSelectedPatientId,
	} = props;

	const { activePeers, summaryText } = useSoftPresence({
		patientId: activePatient?.id,
		visitId: activeAppointment?.id,
	});

	const isMobile = useIsMobile(768);

	const [visitSubViewTab, setVisitSubViewTab] = useState<string>("odontogram");
	const [activeQuadrant, setActiveQuadrant] = useState<number | null>(null);
	const [activeStamp, setActiveStamp] = useState<string>("watch");
	const activeStampRef = React.useRef<string>("watch");
	const [selectedToothForMenu, setSelectedToothForMenu] = useState<{
		code: string;
		label?: string;
		state?: string;
	} | null>(null);
	const [materialCategory, setMaterialCategory] = useState<string | null>(null);
	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
	const [isSurfaceMode, setIsSurfaceMode] = useState<boolean>(false);
	const [isQueueCockpitForced, setIsQueueCockpitForced] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return (
			window.location.hash.includes("queue") ||
			window.location.hash.includes("cockpit") ||
			window.location.search.includes("cockpit=true") ||
			window.location.search.includes("queue=true")
		);
	});

	useEffect(() => {
		const handleHashOrStateChange = () => {
			if (
				window.location.hash.includes("queue") ||
				window.location.hash.includes("cockpit") ||
				window.location.search.includes("cockpit=true") ||
				window.location.search.includes("queue=true")
			) {
				setIsQueueCockpitForced(true);
			}
		};
		window.addEventListener("hashchange", handleHashOrStateChange);
		window.addEventListener("popstate", handleHashOrStateChange);
		return () => {
			window.removeEventListener("hashchange", handleHashOrStateChange);
			window.removeEventListener("popstate", handleHashOrStateChange);
		};
	}, []);

	// Модальные окна приёма
	const modalsState = useVisitModalsState({
		onOpenLabOrderModal: props.onOpenLabOrderModal,
		selectedToothForMenu,
	});

	// Синхронизация протокола и планов лечения
	const { loadedTreatmentPlan, flushAll } = useVisitProtocolSync({
		activePatient,
		activeAppointment,
		dashboard,
		updateVisitNoteField,
		flushPendingVisitSaves,
		isQueueCockpitForced,
		setSelectedPatientId,
		appLogic,
	});

	// Быстрая печать и соматические бейджи
	const fastPrintState = useVisitFastPrintState({
		activePatient,
		activeDoctor,
		activeAppointment,
		visitNoteForm,
		dashboard,
		toothStateByCode,
		selectedToothForMenu,
		updateVisitNoteField,
	});

	// Касса и услуги приёма
	const { handleFinishVisitAction, onAddServiceToTooth } = useVisitBillingState({
		activePatient,
		activeAppointment,
		activeDoctor,
		dashboard,
		visitNoteForm,
		updateVisitNoteField,
		flushPendingVisitSaves,
	});

	// Интерактивная одонтограмма
	const toothHandlers = useVisitToothHandlers({
		activePatient,
		toothStateByCode,
		setToothState,
		visitNoteForm,
		updateVisitNoteField,
		activeStamp,
		selectedToothForMenu,
		setSelectedToothForMenu,
		selectedSurfaces,
		setSelectedSurfaces,
	});

	const handleTabChange = useCallback((newTab: string) => {
		flushAll();
		setVisitSubViewTab(newTab);
		window.dispatchEvent(
			new CustomEvent("dente:visit-tab-change", { detail: { tab: newTab, source: "visit-view" } }),
		);
	}, [flushAll]);

	useEffect(() => {
		const handleExternalTabChange = (e: Event) => {
			const detail = (e as CustomEvent<{ tab?: string; source?: string }>).detail;
			if (detail?.tab && detail.source !== "visit-view") {
				flushAll();
				setVisitSubViewTab(detail.tab);
			}
		};
		window.addEventListener("dente:visit-tab-change", handleExternalTabChange);
		return () => window.removeEventListener("dente:visit-tab-change", handleExternalTabChange);
	}, [flushAll]);

	const safeVisitPrimaryAction = visitPrimaryAction || {
		label: "Сохранить приём",
		detail: "Автосохранение активно",
		onClick: flushAll,
		kind: "save",
	};

	return {
		props,
		appLogic,
		activePatient,
		activeAppointment,
		activeDoctor,
		dashboard,
		transcript,
		setTranscript,
		hasVisitTranscriptText,
		isTranscriptPolishing,
		polishTranscript,
		updateVisitNoteField,
		visitNoteForm,
		flushPendingVisitSaves,
		toothRows,
		toothStateByCode,
		setToothState,
		draft,
		visitWarnings,
		visitPrimaryAction,
		setSelectedPatientId,
		activePeers,
		summaryText,
		isMobile,
		visitSubViewTab,
		setVisitSubViewTab,
		activeQuadrant,
		setActiveQuadrant,
		activeStamp,
		setActiveStamp,
		activeStampRef,
		selectedToothForMenu,
		setSelectedToothForMenu,
		materialCategory,
		setMaterialCategory,
		selectedSurfaces,
		setSelectedSurfaces,
		isSurfaceMode,
		setIsSurfaceMode,
		isQueueCockpitForced,
		setIsQueueCockpitForced,
		...modalsState,
		loadedTreatmentPlan,
		...fastPrintState,
		flushAll,
		handleFinishVisitAction,
		handleTabChange,
		...toothHandlers,
		safeVisitPrimaryAction,
		onAddServiceToTooth,
	};
}
