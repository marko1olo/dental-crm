import { useCallback, useRef } from "react";
import type React from "react";
import { operatorReadableErrorDetail } from "../../../../AppHelpers";
import { actionFailureToast } from "../../../../lib/panelStateText";
import { logger } from "../../../../utils/logger";
import { showToast } from "../../../GlobalToast";
import type { DiaryLoadState, DiaryState } from "../diaryLogicTypes";
import { UUID_REGEX, jsonObjectOrNull } from "../diaryLogicTypes";

export interface UseVisitDiaryDraftSaveParams {
	visitId: string;
	patientId: string;
	diary: DiaryState;
	activeDoctor: any;
	authRef: React.MutableRefObject<any>;
	loadState: DiaryLoadState;
	setLoadState: React.Dispatch<React.SetStateAction<DiaryLoadState>>;
	diaryId: string | null;
	setDiaryId: React.Dispatch<React.SetStateAction<string | null>>;
	isLocked: boolean;
	diaryHash: string | null;
	setDiaryHash: React.Dispatch<React.SetStateAction<string | null>>;
	setLastSavedAt: React.Dispatch<React.SetStateAction<Date | null>>;
	setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
	trayBarcode: string | null;
	linkSterilizationTray: (hash?: string | null) => Promise<{ ok: boolean; hash?: string | null } | { ok: false }>;
}

export function useVisitDiaryDraftSave({
	visitId, patientId, diary, activeDoctor, authRef, loadState, setLoadState,
	diaryId, setDiaryId, isLocked, diaryHash, setDiaryHash, setLastSavedAt,
	setIsSaving, trayBarcode, linkSterilizationTray,
}: UseVisitDiaryDraftSaveParams) {
	const autosaveFailureReportedRef = useRef(false);

	const doSave = useCallback(async (silent = false): Promise<{ id: string; hash: string | null } | null> => {
		if (isLocked) return diaryId ? { id: diaryId, hash: diaryHash } : null;
		if (!activeDoctor) { if (!silent) showToast("Выберите врача для приема", "error"); return null; }
		if (!visitId || !UUID_REGEX.test(visitId) || !patientId || !UUID_REGEX.test(patientId)) {
			if (!silent) showToast("Приём ещё не открыт в расписании. Откройте приём из расписания, чтобы сохранить дневник.", "warning");
			return null;
		}
		const hasContent = Boolean(diary.anamnesis?.trim() || diary.statusLocalis?.trim() || diary.diagnosisIcd10?.trim() || diary.diagnosisTooth?.trim() || diary.treatmentDescription?.trim() || diary.complications?.trim() || diary.comorbidities?.trim() || trayBarcode?.trim());
		if (silent && loadState.phase === "empty" && !hasContent) return null;
		if (loadState.phase === "loading") { if (!silent) showToast("Дневник приёма ещё читается с сервера. Подождите пару секунд и сохраните снова.", "info", 8000); return null; }
		if (loadState.phase === "failed") { if (!silent) showToast("Дневник не синхронизирован. Проверьте подключение и нажмите «Обновить». Черновик сохранён локально.", "warning", 5000); return null; }

		setIsSaving(true);
		try {
			const headers = authRef.current?.denteClinicalMutationHeaders?.({ "Content-Type": "application/json" }) ?? { "Content-Type": "application/json" };
			const res = await fetch("/api/diaries", {
				method: "POST", headers,
				body: JSON.stringify({ visitId, patientId, status: "draft", instrumentTrayBarcode: trayBarcode ?? "", ...diary }),
			});
			const rawBody = await res.text();
			if (!res.ok) {
				logger.error(`[diary save] ${res.status} ${rawBody.slice(0, 300)}`);
				const p = jsonObjectOrNull(rawBody);
				const detail = operatorReadableErrorDetail(typeof p?.message === "string" ? p.message : typeof p?.error === "string" ? p.error : null);
				const msg = `${detail ?? actionFailureToast("Черновик дневника не сохранён", res.status)} Набранный текст остался на экране.`;
				if (!silent) showToast(msg, "error", 10000);
				else if (!autosaveFailureReportedRef.current) { autosaveFailureReportedRef.current = true; showToast(`${msg} Автосохранение не работает — сохраняйте вручную.`, "error", 14000); }
				return null;
			}
			const data = jsonObjectOrNull(rawBody);
			const savedId = typeof data?.id === "string" ? data.id : undefined;
			if (savedId) setDiaryId(savedId);
			if (typeof data?.hash === "string" && data.hash) setDiaryHash(data.hash);
			if (loadState.phase === "empty") setLoadState({ phase: "ready" });
			autosaveFailureReportedRef.current = false;
			setLastSavedAt(new Date());
			if (!silent) showToast("Черновик сохранен", "success");
			const resolvedId = savedId ?? diaryId;
			return resolvedId ? { id: resolvedId, hash: typeof data?.hash === "string" && data.hash ? data.hash : diaryHash } : null;
		} catch (err) {
			logger.error("[diary save] запрос не выполнен", err);
			const msg = `${actionFailureToast("Черновик дневника не сохранён", null)} Набранный текст остался на экране.`;
			if (!silent) showToast(msg, "error", 10000);
			else if (!autosaveFailureReportedRef.current) { autosaveFailureReportedRef.current = true; showToast(msg, "error", 14000); }
			return null;
		} finally { setIsSaving(false); }
	}, [activeDoctor, diary, diaryHash, diaryId, isLocked, loadState, patientId, trayBarcode, visitId, authRef, setDiaryId, setDiaryHash, setLoadState, setLastSavedAt, setIsSaving]);

	const ensureDraftSavedForSigning = async () => {
		const saved = await doSave(true);
		if (!saved?.id) return null;
		const linked = await linkSterilizationTray(saved.hash);
		return linked.ok ? { id: saved.id, hash: linked.hash ?? saved.hash } : null;
	};

	return { doSave, ensureDraftSavedForSigning };
}
