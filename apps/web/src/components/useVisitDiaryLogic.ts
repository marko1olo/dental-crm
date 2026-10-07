import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { panelStateText } from "../lib/panelStateText";
import { useVisitStore } from "../store/visitStore";
import { realVisitFieldId } from "./visit/visitIdentity";

// Re-export all types and pure converters for 100% backwards compatibility
export * from "./visit/diaryLogic/diaryLogicTypes";

import {
	type DiaryState,
	EMPTY_DIARY,
	DIARY_SUBJECT,
	visitNoteFromSoapDiary,
} from "./visit/diaryLogic/diaryLogicTypes";
import { useVisitDiaryDataLoader } from "./visit/diaryLogic/useVisitDiaryDataLoader";
import { useVisitDiaryDraftAutosave } from "./visit/diaryLogic/useVisitDiaryDraftAutosave";
import { useVisitDiaryStatusHandlers } from "./visit/diaryLogic/useVisitDiaryStatusHandlers";
import { useVisitDiaryToothLinking } from "./visit/diaryLogic/useVisitDiaryToothLinking";
import { showToast } from "./GlobalToast";

export function useVisitDiaryLogic(visitId: string, patientId: string) {
	const appLogic = useAppLogicContext();
	// Mandate 8e: Doctor autonomy — resolve effective doctor so saving/signing is never blocked by unselected doctor in schedule
	const activeDoctor =
		appLogic?.activeDoctor ??
		(appLogic?.auth?.currentUser
			? {
					id: appLogic.auth.currentUser.id || "doc-auto",
					fullName:
						appLogic.auth.currentUser.name ||
						appLogic.auth.currentUser.fullName ||
						"Лечащий врач",
					specialties: ["Стоматолог-терапевт"],
				}
			: null) ??
		(Array.isArray(appLogic?.dashboard?.doctors) &&
		appLogic.dashboard.doctors.length > 0
			? (appLogic.dashboard.doctors[0] as unknown as {
					id: string;
					fullName: string;
					specialties?: string[];
				})
			: null) ?? {
			id: "doc-auto",
			fullName: "Лечащий врач",
			specialties: ["Стоматолог-терапевт"],
		};

	const [rawDiary, setRawDiary] = useState<DiaryState>(EMPTY_DIARY);
	const diary = rawDiary;
	const diaryRef = useRef(diary);
	diaryRef.current = diary;

	const activeVisit = appLogic?.dashboard?.activeVisit ?? null;
	const openVisitId =
		activeVisit && typeof activeVisit === "object" && "id" in activeVisit
			? (activeVisit as { id?: unknown }).id
			: undefined;
	const isCurrentActiveVisit =
		!openVisitId ||
		typeof openVisitId !== "string" ||
		openVisitId === visitId ||
		realVisitFieldId(openVisitId) === visitId;

	// DEF-03 (Мандат 8s, 8t): Синхронизация дневника в useVisitStore при реальных изменениях
	const syncDiaryToStore = useCallback(
		(nextDiary: DiaryState) => {
			if (!isCurrentActiveVisit) return;
			const hasDiaryContent = Boolean(
				nextDiary.anamnesis.trim() ||
					nextDiary.statusLocalis.trim() ||
					nextDiary.diagnosisIcd10.trim() ||
					nextDiary.diagnosisTooth.trim() ||
					nextDiary.treatmentDescription.trim(),
			);
			if (!hasDiaryContent) return;

			const storeState = useVisitStore.getState();
			const currentStoreForm = storeState.visitNoteForm ?? {};
			const converted = visitNoteFromSoapDiary(nextDiary, currentStoreForm);
			storeState.setVisitNoteForm((prev) => ({
				...prev,
				...converted,
			}));
			if (storeState.visitDraftUserEditedRef) {
				storeState.visitDraftUserEditedRef.current = true;
			}
		},
		[isCurrentActiveVisit],
	);

	// Безопасный сеттер diary: обновляет локальный state и store при реальных действиях
	const setDiary: React.Dispatch<React.SetStateAction<DiaryState>> = useCallback(
		(action: React.SetStateAction<DiaryState>) => {
			const prev = diaryRef.current;
			const next = typeof action === "function" ? action(prev) : action;
			diaryRef.current = next;
			setRawDiary(next);
			syncDiaryToStore(next);
		},
		[syncDiaryToStore],
	);

	const updateField = useCallback(
		(field: keyof DiaryState, value: string) => {
			setDiary((prev) => ({
				...prev,
				[field]: value,
			}));
		},
		[setDiary],
	);

	const [diaryId, setDiaryId] = useState<string | null>(null);
	const [isLocked, setIsLocked] = useState(false);
	const [lockedAt, setLockedAt] = useState<string | null>(null);
	const [diaryHash, setDiaryHash] = useState<string | null>(null);
	const [hasCryptoSignature, setHasCryptoSignature] = useState(false);
	const [showIcdDropdown, setShowIcdDropdown] = useState(false);
	const [icdSearch, setIcdSearch] = useState("");
	const [showPreview, setShowPreview] = useState(false);
	const icdRef = useRef<HTMLDivElement>(null);
	const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const auth = appLogic?.auth;
	const authRef = useRef(auth);
	authRef.current = auth;

	const doSaveRef = useRef<
		(silent?: boolean) => Promise<{ id: string; hash: string | null } | null>
	>(async () => null);

	// 1. Data Loader & Server Fetching Hook
	const {
		diaryDoctorFullName,
		setDiaryDoctorFullName,
		diaryDoctorSpecialty,
		setDiaryDoctorSpecialty,
		lastSavedAt,
		setLastSavedAt,
		revisionCount,
		setRevisionCount,
		diaryRevisions,
		setDiaryRevisions,
		loadState,
		setLoadState,
		reloadDiary,
	} = useVisitDiaryDataLoader({
		visitId,
		setRawDiary,
		diaryRef,
		isCurrentActiveVisit,
		activeVisit,
		authRef,
		setIcdSearch,
		setShowPreview,
		setIsLocked,
		setDiaryId,
		setLockedAt,
		setDiaryHash,
		setHasCryptoSignature,
		setTrayBarcode: () => {}, // delegated to status handlers
		setIsRevising: () => {},
		setRevisionReason: () => {},
		setIsRevisingBusy: () => {},
		setReviseSnapshot: () => {},
		setReviseTraySnapshot: () => {},
		doSaveRef,
	});

	// 2. Status, Lock, Revisions & Tray Barcode Handlers Hook
	const {
		isSaving,
		trayBarcode,
		setTrayBarcode,
		trayBarcodeRef,
		isRevising,
		setIsRevising,
		revisionReason,
		setRevisionReason,
		isRevisingBusy,
		setReviseSnapshot,
		setReviseTraySnapshot,
		doSave,
		ensureDraftSavedForSigning,
		doLock,
		beginRevise,
		cancelRevise,
		doRevise,
		clearTrayBarcode,
		assignTrayBarcode,
	} = useVisitDiaryStatusHandlers({
		visitId,
		patientId,
		diary,
		setDiary,
		diaryRef,
		activeDoctor,
		authRef,
		loadState,
		setLoadState,
		diaryId,
		setDiaryId,
		isLocked,
		setIsLocked,
		lockedAt,
		setLockedAt,
		diaryHash,
		setDiaryHash,
		hasCryptoSignature,
		setHasCryptoSignature,
		setDiaryDoctorFullName,
		setDiaryDoctorSpecialty,
		setLastSavedAt,
		setRevisionCount,
		setDiaryRevisions,
		localDiaryStorageKey: `dente_diary_draft_${visitId}`,
	});

	doSaveRef.current = doSave;

	// 3. Draft Autosave & Offline Persistence Hook
	const {
		isDraftRecovered,
		recoveredDraftTime,
		localDraftSavedAt,
		scheduleDebouncedSave,
		clearDraft,
	} = useVisitDiaryDraftAutosave({
		visitId,
		diary,
		setDiary,
		isLocked,
		isRevising,
		loadStatePhase: loadState.phase,
		setIcdSearch,
		doSaveRef,
	});

	// 4. Odontogram, Protocols & Tooth Linking Hook
	const {
		applyOdontogramFinding,
		applySoapProtocol,
		populateFromOdontogram,
		pendingSoapSuggestion,
		applyPendingSoapSuggestion,
		dismissPendingSoapSuggestion,
		applyAnesthesiaPreset,
		applyClinicalPreset,
		apply1ClickAutopilot,
		applySomaticNorm: toothLinkingApplySomaticNorm,
	} = useVisitDiaryToothLinking({
		diaryRef,
		setDiary,
		isLocked,
		isRevising,
		setIsRevising,
		beginRevise,
		setReviseSnapshot,
		setReviseTraySnapshot,
		trayBarcodeRef,
		setRevisionReason,
		setIcdSearch,
		scheduleDebouncedSave,
	});

	// Background 30s autosave loop
	useEffect(() => {
		if (autosaveRef.current) clearInterval(autosaveRef.current);
		if (isLocked || isRevising) return;
		autosaveRef.current = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			void doSaveRef.current?.(true);
		}, 30000);
		return () => {
			if (autosaveRef.current) clearInterval(autosaveRef.current);
		};
	}, [isLocked, isRevising]);

	// Click outside ICD dropdown
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (icdRef.current && !icdRef.current.contains(e.target as Node)) {
				setShowIcdDropdown(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// Textarea auto-resize
	useEffect(() => {
		const autoResize = (el: HTMLTextAreaElement) => {
			el.style.height = "auto";
			el.style.height = `${el.scrollHeight}px`;
		};
		document
			.querySelectorAll<HTMLTextAreaElement>(".auto-resize-ta")
			.forEach(autoResize);
	}, []);

	/**
	 * 1-клик заполнение физиологической нормой по умолчанию (Мандат 8e п. 3).
	 * Врач правит только патологию!
	 * Если дневник закрыт, автоматически активирует режим ревизии («Исправленному верить»).
	 */
	const applySomaticNorm = useCallback(() => {
		if (isLocked && !isRevising) {
			setIsRevising(true);
			beginRevise();
			showToast(
				"Дневник визита открыт для внесения исправлений (протокол одонтограммы применён)",
				"warning",
				4000,
			);
		}
		setDiary((prev) => ({
			...prev,
			anamnesis: prev.anamnesis?.trim()
				? `${prev.anamnesis}\nСоматически здоров. Аллергический статус не отягощен. Физиологическая норма.`
				: "Соматически здоров. Хронические заболевания, сердечно-сосудистые патологии и аллергологический статус со слов пациента отрицает. Физиологическая норма.",
			statusLocalis: prev.statusLocalis?.trim()
				? prev.statusLocalis
				: "Слизистая оболочка полости рта бледно-розовая, влажная, без патологических изменений. Зубные ряды интактны, прикус физиологический. Регионарные лимфоузлы не увеличены.",
		}));
		scheduleDebouncedSave();
		showToast(
			"Физиологическая норма соматического статуса и осмотра внесена в дневник",
			"success",
			4000,
		);
	}, [isLocked, isRevising, beginRevise, setIsRevising, scheduleDebouncedSave, setDiary]);

	return {
		diary,
		setDiary,
		updateField,
		syncDiaryToStore,
		diaryId,
		loadState,
		loadStateText:
			loadState.phase === "ready"
				? null
				: panelStateText(
						DIARY_SUBJECT,
						loadState.phase === "failed"
							? { phase: "failed", status: loadState.status }
							: { phase: loadState.phase },
					),
		diarySubject: DIARY_SUBJECT,
		reloadDiary,
		isLocked,
		lockedAt,
		diaryHash,
		hasCryptoSignature,
		diaryDoctorFullName,
		diaryDoctorSpecialty,
		lastSavedAt,
		localDraftSavedAt,
		revisionCount,
		diaryRevisions,
		isSaving,
		isDraftRecovered,
		recoveredDraftTime,
		clearDraft,
		trayBarcode,
		setTrayBarcode,
		clearTrayBarcode,
		assignTrayBarcode,
		showIcdDropdown,
		setShowIcdDropdown,
		icdSearch,
		setIcdSearch,
		showPreview,
		setShowPreview,
		doSave,
		ensureDraftSavedForSigning,
		doLock,
		isRevising,
		revisionReason,
		setRevisionReason,
		isRevisingBusy,
		beginRevise,
		cancelRevise,
		doRevise,
		icdRef,
		applyOdontogramFinding,
		applySoapProtocol,
		pendingSoapSuggestion,
		applyPendingSoapSuggestion,
		dismissPendingSoapSuggestion,
		scheduleDebouncedSave,
		populateFromOdontogram,
		applyAnesthesiaPreset,
		applyClinicalPreset,
		apply1ClickAutopilot,
		applySomaticNorm,
	};
}
