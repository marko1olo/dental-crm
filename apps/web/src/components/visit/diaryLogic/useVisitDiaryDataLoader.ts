import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import type {
	DiaryLoadState,
	DiaryRevisionRow,
	DiaryState,
} from "./diaryLogicTypes";
import {
	EMPTY_DIARY,
	UUID_REGEX,
	asDiaryRevisionRow,
	jsonObjectOrNull,
	soapPrefillFromVisitNote,
	visitNoteFromSoapDiary,
} from "./diaryLogicTypes";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";

export interface UseVisitDiaryDataLoaderParams {
	readonly visitId: string;
	readonly setRawDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly diaryRef: React.MutableRefObject<DiaryState>;
	readonly isCurrentActiveVisit: boolean;
	readonly activeVisit: any;
	readonly authRef: React.MutableRefObject<any>;
	readonly setIcdSearch: React.Dispatch<React.SetStateAction<string>>;
	readonly setShowPreview: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setDiaryId: React.Dispatch<React.SetStateAction<string | null>>;
	readonly setLockedAt: React.Dispatch<React.SetStateAction<string | null>>;
	readonly setDiaryHash: React.Dispatch<React.SetStateAction<string | null>>;
	readonly setHasCryptoSignature: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setTrayBarcode: React.Dispatch<React.SetStateAction<string | null>>;
	readonly setIsRevising: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setRevisionReason: React.Dispatch<React.SetStateAction<string>>;
	readonly setIsRevisingBusy: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setReviseSnapshot: React.Dispatch<React.SetStateAction<DiaryState | null>>;
	readonly setReviseTraySnapshot: React.Dispatch<React.SetStateAction<string | null>>;
	readonly doSaveRef: React.MutableRefObject<
		(silent?: boolean) => Promise<{ id: string; hash: string | null } | null>
	>;
}

export function useVisitDiaryDataLoader({
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
	setTrayBarcode,
	setIsRevising,
	setRevisionReason,
	setIsRevisingBusy,
	setReviseSnapshot,
	setReviseTraySnapshot,
	doSaveRef,
}: UseVisitDiaryDataLoaderParams) {
	const [diaryDoctorFullName, setDiaryDoctorFullName] = useState<string | null>(null);
	const [diaryDoctorSpecialty, setDiaryDoctorSpecialty] = useState<string | null>(null);
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [revisionCount, setRevisionCount] = useState(0);
	const [diaryRevisions, setDiaryRevisions] = useState<DiaryRevisionRow[]>([]);
	const [loadState, setLoadState] = useState<DiaryLoadState>({
		phase: "loading",
	});
	const [_reloadToken, setReloadToken] = useState(0);
	const hasHydratedFromStoreRef = useRef<string | null>(null);

	// ── Cleanup & load on visitId change
	useEffect(() => {
		let alive = true;

		setRawDiary(EMPTY_DIARY);
		hasHydratedFromStoreRef.current = null;
		setIcdSearch("");
		setShowPreview(false);
		setIsLocked(false);
		setDiaryId(null);
		setLockedAt(null);
		setDiaryHash(null);
		setHasCryptoSignature(false);
		setLastSavedAt(null);
		setRevisionCount(0);
		setDiaryRevisions([]);
		setTrayBarcode(null);
		setIsRevising(false);
		setRevisionReason("");
		setIsRevisingBusy(false);
		setReviseSnapshot(null);
		setReviseTraySnapshot(null);
		setLoadState({ phase: "loading" });
		setDiaryDoctorFullName(null);
		setDiaryDoctorSpecialty(null);

		const reportLoadFailure = (status: number | null, shouldToast = true) => {
			if (!alive) return;
			setLoadState({ phase: "failed", status });
			if (shouldToast) {
				showToast(
					"Дневник не синхронизирован. Проверьте подключение и нажмите «Обновить». Черновик сохранён локально.",
					"warning",
					5000,
				);
			}
		};

		const loadDiary = async () => {
			if (
				!visitId ||
				!UUID_REGEX.test(visitId) ||
				visitId === "new" ||
				visitId === "draft" ||
				visitId === "preview"
			) {
				setDiaryDoctorFullName(null);
				setDiaryDoctorSpecialty(null);
				setLoadState({ phase: "empty" });
				return;
			}

			const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
			if (isOffline) {
				setDiaryDoctorFullName(null);
				setDiaryDoctorSpecialty(null);
				setLoadState({ phase: "empty" });
				return;
			}

			let status: number | null = null;
			const headerSource = authRef.current;
			try {
				const response = await fetch(`/api/diaries/visit/${visitId}`, {
					headers:
						headerSource &&
						typeof headerSource.denteClinicalReadHeaders === "function"
							? headerSource.denteClinicalReadHeaders()
							: {},
				});
				status = response.status;
				const rawBody = await response.text();

				if (status === 404) {
					if (!alive) return;
					setDiaryDoctorFullName(null);
					setDiaryDoctorSpecialty(null);
					setLoadState({ phase: "empty" });

					const storeState = useVisitStore.getState();
					const formFromStore = storeState.visitNoteForm ?? {};
					const prefill = soapPrefillFromVisitNote(formFromStore);
					if (Object.keys(prefill).length > 0) {
						hasHydratedFromStoreRef.current = visitId;
						setRawDiary((prev) => ({ ...prev, ...prefill }));
						if (prefill.diagnosisIcd10) {
							setIcdSearch((c) => (c.trim() ? c : (prefill.diagnosisIcd10 ?? c)));
						}
					}
					return;
				}

				const isHtmlResponse =
					rawBody.trim().startsWith("<") || rawBody.includes("<!DOCTYPE html");
				if (isHtmlResponse) {
					if (!alive) return;
					logger.warn(
						`[diary load] API бэкенда недоступен (получен HTML). Режим локального черновика.`,
					);
					setDiaryDoctorFullName(null);
					setDiaryDoctorSpecialty(null);
					setLoadState({ phase: "empty" });
					return;
				}

				if (!response.ok) {
					logger.error(`[diary load] ${status} ${rawBody.slice(0, 300)}`);
					reportLoadFailure(status, _reloadToken > 0);
					return;
				}

				const payload = jsonObjectOrNull(rawBody);
				if (!payload) {
					logger.error(`[diary load] ${status}: тело ответа не разобрано`);
					reportLoadFailure(status, _reloadToken > 0);
					return;
				}
				if (!alive) return;
				const diaryRow = payload.diary;
				if (!diaryRow || typeof diaryRow !== "object") {
					setDiaryDoctorFullName(null);
					setDiaryDoctorSpecialty(null);
					setLoadState({ phase: "empty" });

					const storeState = useVisitStore.getState();
					const formFromStore = storeState.visitNoteForm ?? {};
					const prefill = soapPrefillFromVisitNote(formFromStore);
					if (Object.keys(prefill).length > 0) {
						hasHydratedFromStoreRef.current = visitId;
						setRawDiary((prev) => ({ ...prev, ...prefill }));
						if (prefill.diagnosisIcd10) {
							setIcdSearch((c) => (c.trim() ? c : (prefill.diagnosisIcd10 ?? c)));
						}
					}
					return;
				}
				const d = diaryRow as Record<string, any>;
				const loadedDiary: DiaryState = {
					anamnesis: d.anamnesis ?? "",
					statusLocalis: d.statusLocalis ?? "",
					diagnosisIcd10: d.diagnosisIcd10 ?? "",
					diagnosisTooth: d.diagnosisTooth ?? "",
					treatmentDescription: d.treatmentDescription ?? "",
					complications: d.complications ?? "",
					comorbidities: d.comorbidities ?? "",
				};
				setRawDiary(loadedDiary);

				const storeState = useVisitStore.getState();
				const currentStoreForm = storeState.visitNoteForm ?? {};
				const hasStoreContent = Object.values(currentStoreForm).some(
					(v) => typeof v === "string" && v.trim().length > 0,
				);
				const hasLoadedContent = Boolean(
					loadedDiary.anamnesis.trim() ||
						loadedDiary.statusLocalis.trim() ||
						loadedDiary.treatmentDescription.trim() ||
						loadedDiary.diagnosisIcd10.trim(),
				);
				if (
					hasLoadedContent &&
					(!hasStoreContent || !storeState.visitDraftUserEditedRef?.current)
				) {
					const convertedFromLoaded = visitNoteFromSoapDiary(
						loadedDiary,
						currentStoreForm,
					);
					storeState.setVisitNoteForm((prev) => ({
						...prev,
						...convertedFromLoaded,
					}));
				}
				setTrayBarcode(
					typeof d.instrumentTrayBarcode === "string" && d.instrumentTrayBarcode
						? d.instrumentTrayBarcode
						: null,
				);
				setIsLocked(d.isLocked ?? false);
				setDiaryId(d.id ?? null);
				setLockedAt(d.lockedAt ?? null);
				setDiaryHash(d.diaryHash ?? null);
				setHasCryptoSignature(
					typeof d.cryptoSignaturePkcs7 === "string" &&
						d.cryptoSignaturePkcs7.length > 0,
				);
				setDiaryDoctorFullName(
					typeof d.doctorFullName === "string" && d.doctorFullName.trim()
						? d.doctorFullName.trim()
						: null,
				);
				setDiaryDoctorSpecialty(
					typeof d.doctorSpecialty === "string" && d.doctorSpecialty.trim()
						? d.doctorSpecialty.trim()
						: null,
				);
				if (d.diagnosisIcd10) setIcdSearch(d.diagnosisIcd10);
				setLoadState({ phase: "ready" });
				if (typeof d.id === "string" && d.id) {
					try {
						const revisionsResponse = await fetch(
							`/api/diaries/${d.id}/revisions`,
							{
								headers:
									headerSource &&
									typeof headerSource.denteClinicalReadHeaders === "function"
										? headerSource.denteClinicalReadHeaders()
										: {},
							},
						);
						const revisionsBody = await revisionsResponse.text();
						if (!revisionsResponse.ok) {
							logger.error(
								`[diary revisions] ${revisionsResponse.status} ${revisionsBody.slice(0, 200)}`,
							);
							return;
						}
						const revisionsPayload = jsonObjectOrNull(revisionsBody);
						const revisions = revisionsPayload?.revisions;
						if (alive && Array.isArray(revisions)) {
							const rows = revisions
								.map(asDiaryRevisionRow)
								.filter((r): r is DiaryRevisionRow => r != null);
							setDiaryRevisions(rows);
							setRevisionCount(rows.length);
						}
					} catch (revisionsError) {
						logger.warn(
							"[diary revisions] запрос ревизий не выполнен",
							revisionsError,
						);
					}
				}
			} catch (error) {
				logger.warn("[diary load] запрос не выполнен (офлайн или сеть недоступна)", error);
				if (!alive) return;
				const isOfflineNow = typeof navigator !== "undefined" && !navigator.onLine;
				if (isOfflineNow) {
					setDiaryDoctorFullName(null);
					setDiaryDoctorSpecialty(null);
					setLoadState({ phase: "empty" });
				} else {
					reportLoadFailure(status, _reloadToken > 0);
				}
			}
		};

		void loadDiary();

		return () => {
			alive = false;
			if (doSaveRef.current) {
				void doSaveRef.current(true);
			}
		};
	}, [
		visitId,
		_reloadToken,
		setRawDiary,
		setIcdSearch,
		setShowPreview,
		setIsLocked,
		setDiaryId,
		setLockedAt,
		setDiaryHash,
		setHasCryptoSignature,
		setTrayBarcode,
		setIsRevising,
		setRevisionReason,
		setIsRevisingBusy,
		setReviseSnapshot,
		setReviseTraySnapshot,
		authRef,
		doSaveRef,
	]);

	const reloadDiary = useCallback(() => {
		setReloadToken((token) => token + 1);
	}, []);

	// DEF-03: Single hydration from store when empty
	useEffect(() => {
		if (loadState.phase !== "empty") return;
		if (hasHydratedFromStoreRef.current === visitId) return;
		if (!isCurrentActiveVisit) return;

		const isDiaryEmpty = !Object.values(diaryRef.current).some(
			(v) => typeof v === "string" && v.trim().length > 0,
		);
		if (!isDiaryEmpty) {
			hasHydratedFromStoreRef.current = visitId;
			return;
		}

		const storeState = useVisitStore.getState();
		const formFromStore = storeState.visitNoteForm ?? {};
		const visitRow =
			activeVisit && typeof activeVisit === "object"
				? (activeVisit as Record<string, unknown>)
				: null;
		const pick = (
			key:
				| "complaint"
				| "anamnesis"
				| "objectiveStatus"
				| "diagnosis"
				| "treatmentPlan",
		) => {
			const fromForm = formFromStore[key];
			if (typeof fromForm === "string" && fromForm.trim()) return fromForm;
			const fromVisit = visitRow?.[key];
			return typeof fromVisit === "string" ? fromVisit : "";
		};

		const effectiveForm = {
			complaint: pick("complaint"),
			anamnesis: pick("anamnesis"),
			objectiveStatus: pick("objectiveStatus"),
			diagnosis: pick("diagnosis"),
			treatmentPlan: pick("treatmentPlan"),
		};

		const prefill = soapPrefillFromVisitNote(effectiveForm);
		if (Object.keys(prefill).length === 0) return;

		hasHydratedFromStoreRef.current = visitId;
		setRawDiary((prev) => {
			let changed = false;
			const next: DiaryState = { ...prev };
			(Object.keys(prefill) as Array<keyof DiaryState>).forEach((key) => {
				const incoming = prefill[key];
				if (typeof incoming !== "string" || !incoming) return;
				if ((prev[key] ?? "").trim()) return;
				next[key] = incoming;
				changed = true;
			});
			return changed ? next : prev;
		});

		if (prefill.diagnosisIcd10) {
			setIcdSearch((current) =>
				current.trim() ? current : (prefill.diagnosisIcd10 ?? current),
			);
		}
	}, [loadState.phase, visitId, isCurrentActiveVisit, activeVisit, diaryRef, setRawDiary, setIcdSearch]);

	return {
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
		hasHydratedFromStoreRef,
	};
}
