import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { getOptimizedTiming } from "../../../utils/lowSpecHddOptimizer";
import { saveChairsideVisitDraft } from "../clinicalVisitWorkflow";
import type {
	UnsavedDraftNoticeState,
	VisitSoapNoteValues,
} from "./types";

export interface UseVisitSoapDraftParams {
	visitId?: string;
	patientId?: string;
	selectedTooth: number | null;
	initialValues?: VisitSoapNoteValues;
	values: VisitSoapNoteValues;
	setValues: React.Dispatch<React.SetStateAction<VisitSoapNoteValues>>;
	onSave?: (values: VisitSoapNoteValues) => void;
	onChange?: (values: VisitSoapNoteValues) => void;
}

export function useVisitSoapDraft({
	visitId,
	patientId,
	selectedTooth,
	initialValues,
	values,
	setValues,
	onSave,
	onChange,
}: UseVisitSoapDraftParams) {
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
		"idle",
	);

	// ── Синхронный бэкап черновика в localStorage (защита от потери при смене вкладок/звонках) ──
	const soapStorageKey = useMemo(() => {
		const prefix = visitId ? `${visitId}_` : patientId ? `${patientId}_` : "";
		return `dente_soap_editor_draft_${prefix}${selectedTooth ?? "general"}`;
	}, [visitId, patientId, selectedTooth]);

	// Мандат 8e / 8c: Неблокирующий баннер обнаружения черновика («Обнаружен несохранённый черновик от 14:32 — [Восстановить] [Сбросить]»)
	const [unsavedDraftNotice, setUnsavedDraftNotice] =
		useState<UnsavedDraftNoticeState | null>(null);

	useEffect(() => {
		try {
			const saved = safeLocalStorageGetItem(soapStorageKey);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed && typeof parsed === "object") {
					const candidate: VisitSoapNoteValues = {
						complaint: parsed.complaint || "",
						anamnesis: parsed.anamnesis || "",
						objectiveStatus: parsed.objectiveStatus || "",
						diagnosis: parsed.diagnosis || "",
						treatmentPlan: parsed.treatmentPlan || "",
						recommendations: parsed.recommendations || "",
						icd10: parsed.icd10 || "",
					};

					const hasContent = Boolean(
						candidate.complaint?.trim() ||
							candidate.anamnesis?.trim() ||
							candidate.objectiveStatus?.trim() ||
							candidate.diagnosis?.trim() ||
							candidate.treatmentPlan?.trim() ||
							candidate.recommendations?.trim() ||
							candidate.icd10?.trim(),
					);

					// Проверяем, отличается ли локальный черновик от серверных initialValues
					const isDifferent =
						(candidate.complaint || "") !== (initialValues?.complaint || "") ||
						(candidate.anamnesis || "") !== (initialValues?.anamnesis || "") ||
						(candidate.objectiveStatus || "") !==
							(initialValues?.objectiveStatus || "") ||
						(candidate.diagnosis || "") !== (initialValues?.diagnosis || "") ||
						(candidate.treatmentPlan || "") !==
							(initialValues?.treatmentPlan || "") ||
						(candidate.recommendations || "") !==
							(initialValues?.recommendations || "") ||
						(candidate.icd10 || "") !== (initialValues?.icd10 || "");

					if (hasContent && isDifferent) {
						if (!initialValues?.complaint && !initialValues?.treatmentPlan) {
							setValues((prev) => ({ ...prev, ...candidate }));
						}

						const savedDate =
							parsed._savedAt || parsed.savedAt
								? new Date(parsed._savedAt || parsed.savedAt)
								: new Date();
						const timeStr = !Number.isNaN(savedDate.getTime())
							? savedDate.toLocaleTimeString("ru-RU", {
									hour: "2-digit",
									minute: "2-digit",
								})
							: "недавнего времени";

						setUnsavedDraftNotice({
							draftValues: candidate,
							timeStr,
						});
					} else {
						setUnsavedDraftNotice(null);
					}
				}
			}
		} catch {
			// ignore storage quota / parse errors
		}
	}, [soapStorageKey, initialValues, setValues]);

	// Рефы для актуальных значений при размонтировании и смене вкладок (защита от потери черновика)
	const valuesRef = useRef(values);
	valuesRef.current = values;
	const saveStatusRef = useRef(saveStatus);
	saveStatusRef.current = saveStatus;
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const onSaveRef = useRef(onSave);
	onSaveRef.current = onSave;
	const soapStorageKeyRef = useRef(soapStorageKey);
	soapStorageKeyRef.current = soapStorageKey;

	const handleRestoreDraft = useCallback(() => {
		if (!unsavedDraftNotice) return;
		const restored = unsavedDraftNotice.draftValues;
		setValues(restored);
		valuesRef.current = restored;
		setSaveStatus("saved");
		setUnsavedDraftNotice(null);
		onChangeRef.current?.(restored);
		onSaveRef.current?.(restored);
	}, [unsavedDraftNotice, setValues]);

	const handleDiscardDraft = useCallback(() => {
		try {
			safeLocalStorageRemoveItem(soapStorageKey);
			if (visitId || patientId) {
				safeLocalStorageRemoveItem(
					`dente_soap_editor_draft_${selectedTooth ?? "general"}`,
				);
			}
		} catch (err: unknown) {
			console.warn("[VisitSoapEditor] Failed to discard draft:", err);
		}
		setUnsavedDraftNotice(null);
	}, [soapStorageKey, visitId, patientId, selectedTooth]);

	// Дебаунс автосохранения (500–1000мс по Мандатам 8e, 8n)
	useEffect(() => {
		if (saveStatus !== "saving") return;
		const timing = getOptimizedTiming();
		const debounceMs = Math.max(500, Math.min(1000, timing.autosaveDebounceMs || 800));
		const timer = setTimeout(() => {
			onChangeRef.current?.(values);
			onSaveRef.current?.(values);
			try {
				const draftPayload = {
					...values,
					_savedAt: new Date().toISOString(),
					_version: 1,
				};
				safeLocalStorageSetItem(soapStorageKey, JSON.stringify(draftPayload));
				if (visitId) {
					saveChairsideVisitDraft(visitId, {
						chairId: undefined,
						patientId,
						savedAtIso: draftPayload._savedAt,
						version: 1,
						diary: {
							...values,
							toothNumber: selectedTooth ?? undefined,
						},
					});
				}
				void import("../../../utils/offlineMutationQueue")
					.then(({ saveOfflineDraft }) => {
						void saveOfflineDraft(
							soapStorageKey,
							"DIARY_043_DRAFT",
							selectedTooth ? `tooth-${selectedTooth}` : "general",
							draftPayload,
						);
					})
					.catch(() => {});
			} catch (err: unknown) {
				console.warn("[VisitSoapEditor] Failed to cache soap note values:", err);
			}
			setSaveStatus("saved");
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [values, saveStatus, soapStorageKey, selectedTooth, visitId, patientId]);

	// Регулярное непрерывное автосохранение черновика каждую минуту (1-минутный heartbeat защиты от потери данных)
	useEffect(() => {
		const intervalTimer = setInterval(() => {
			const cur = valuesRef.current;
			const hasContent = Boolean(
				cur.complaint?.trim() ||
					cur.anamnesis?.trim() ||
					cur.objectiveStatus?.trim() ||
					cur.diagnosis?.trim() ||
					cur.treatmentPlan?.trim() ||
					cur.recommendations?.trim() ||
					cur.icd10?.trim(),
			);
			if (!hasContent) return;

			try {
				const draftPayload = {
					...cur,
					_savedAt: new Date().toISOString(),
					_version: 1,
				};
				safeLocalStorageSetItem(
					soapStorageKeyRef.current,
					JSON.stringify(draftPayload),
				);
				if (visitId) {
					saveChairsideVisitDraft(visitId, {
						chairId: undefined,
						patientId,
						savedAtIso: draftPayload._savedAt,
						version: 1,
						diary: {
							...cur,
							toothNumber: selectedTooth ?? undefined,
						},
					});
				}
				void import("../../../utils/offlineMutationQueue")
					.then(({ saveOfflineDraft }) => {
						void saveOfflineDraft(
							soapStorageKeyRef.current,
							"DIARY_043_DRAFT",
							selectedTooth ? `tooth-${selectedTooth}` : "general",
							draftPayload,
						);
					})
					.catch(() => {});
				setSaveStatus("saved");
			} catch (err: unknown) {
				console.warn(
					"[VisitSoapEditor] periodic heartbeat autosave error:",
					err,
				);
			}
		}, 60000);

		return () => clearInterval(intervalTimer);
	}, [visitId, patientId, selectedTooth]);

	// Немедленный сброс несохраненного черновика строго при размонтировании, смене вкладок или скрытии страницы (Мандат 8e, 8n)
	const flushDraft = useCallback(() => {
		if (saveStatusRef.current === "saving") {
			onChangeRef.current?.(valuesRef.current);
			onSaveRef.current?.(valuesRef.current);
			try {
				const draftPayload = {
					...valuesRef.current,
					_savedAt: new Date().toISOString(),
					_version: 1,
				};
				safeLocalStorageSetItem(
					soapStorageKeyRef.current,
					JSON.stringify(draftPayload),
				);
				void import("../../../utils/offlineMutationQueue")
					.then(({ saveOfflineDraft }) => {
						void saveOfflineDraft(
							soapStorageKeyRef.current,
							"DIARY_043_DRAFT",
							selectedTooth ? `tooth-${selectedTooth}` : "general",
							draftPayload,
						);
					})
					.catch(() => {});
			} catch (err: unknown) {
				console.warn(
					"[VisitSoapEditor] Failed to cache soap note values on flush:",
					err,
				);
			}
			setSaveStatus("saved");
		}
	}, [selectedTooth]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushDraft();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("beforeunload", flushDraft);
		window.addEventListener("pagehide", flushDraft);
		window.addEventListener("blur", flushDraft);
		window.addEventListener("dente-telephony-incoming-call", flushDraft);
		window.addEventListener("dente:visit-tab-change", flushDraft);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("beforeunload", flushDraft);
			window.removeEventListener("pagehide", flushDraft);
			window.removeEventListener("blur", flushDraft);
			window.removeEventListener("dente-telephony-incoming-call", flushDraft);
			window.removeEventListener("dente:visit-tab-change", flushDraft);
			flushDraft();
		};
	}, [flushDraft]);

	const saveDraftToStorage = useCallback(
		(nextValues: VisitSoapNoteValues) => {
			try {
				safeLocalStorageSetItem(soapStorageKey, JSON.stringify(nextValues));
			} catch (err: unknown) {
				console.warn(
					"[VisitSoapEditor] Failed to cache soap note values to storage:",
					err,
				);
			}
		},
		[soapStorageKey],
	);

	return {
		saveStatus,
		setSaveStatus,
		soapStorageKey,
		unsavedDraftNotice,
		handleRestoreDraft,
		handleDiscardDraft,
		flushDraft,
		saveDraftToStorage,
		valuesRef,
		onChangeRef,
		onSaveRef,
	};
}
