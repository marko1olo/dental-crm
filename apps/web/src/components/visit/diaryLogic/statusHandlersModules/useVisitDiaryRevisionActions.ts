import { useCallback, useState } from "react";
import type React from "react";
import { operatorReadableErrorDetail } from "../../../../AppHelpers";
import { requestFailureCause } from "../../../../lib/panelStateText";
import { logger } from "../../../../utils/logger";
import { showToast } from "../../../GlobalToast";
import type { DiaryRevisionRow, DiaryState } from "../diaryLogicTypes";
import { jsonObjectOrNull } from "../diaryLogicTypes";
import { resolveDoctorNameAndSpecialty } from "./useVisitDiaryDoctorInfoBuilder";

export interface UseVisitDiaryRevisionActionsParams {
	diary: DiaryState;
	setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	diaryId: string | null;
	isLocked: boolean;
	trayBarcode: string | null;
	setTrayBarcode: (val: string | null) => void;
	authRef: React.MutableRefObject<any>;
	activeDoctor: any;
	setDiaryHash: React.Dispatch<React.SetStateAction<string | null>>;
	setHasCryptoSignature: React.Dispatch<React.SetStateAction<boolean>>;
	setRevisionCount: React.Dispatch<React.SetStateAction<number>>;
	setDiaryRevisions: React.Dispatch<React.SetStateAction<DiaryRevisionRow[]>>;
	setLastSavedAt: React.Dispatch<React.SetStateAction<Date | null>>;
	setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useVisitDiaryRevisionActions({
	diary, setDiary, diaryId, isLocked, trayBarcode, setTrayBarcode,
	authRef, activeDoctor, setDiaryHash, setHasCryptoSignature,
	setRevisionCount, setDiaryRevisions, setLastSavedAt, setIsLocked,
}: UseVisitDiaryRevisionActionsParams) {
	const [isRevising, setIsRevising] = useState(false);
	const [revisionReason, setRevisionReason] = useState("");
	const [isRevisingBusy, setIsRevisingBusy] = useState(false);
	const [reviseSnapshot, setReviseSnapshot] = useState<DiaryState | null>(null);
	const [reviseTraySnapshot, setReviseTraySnapshot] = useState<string | null>(null);

	const beginRevise = useCallback(() => {
		if (!isLocked || !diaryId) {
			showToast("Исправлять можно только уже подписанный дневник. Сначала сохраните и подпишите запись.", "info", 10000);
			return;
		}
		setReviseSnapshot({ ...diary });
		setReviseTraySnapshot(trayBarcode);
		setIsRevising(true);
		setRevisionReason("Исправленному верить");
	}, [diary, diaryId, isLocked, trayBarcode]);

	const cancelRevise = useCallback(() => {
		if (reviseSnapshot) setDiary(reviseSnapshot);
		setTrayBarcode(reviseTraySnapshot);
		setReviseSnapshot(null);
		setReviseTraySnapshot(null);
		setIsRevising(false);
		setRevisionReason("");
	}, [reviseSnapshot, reviseTraySnapshot, setDiary, setTrayBarcode]);

	const doRevise = useCallback(async () => {
		if (!diaryId) { showToast("Дневник ещё не сохранён на сервере — исправлять нечего.", "error", 12000); return; }
		if (!isLocked) { showToast("Дневник не подписан — просто отредактируйте и сохраните черновик.", "info", 8000); return; }
		const reason = revisionReason.trim() || "Исправленному верить";
		setIsRevisingBusy(true);
		try {
			const headers = authRef.current?.denteClinicalMutationHeaders?.({ "Content-Type": "application/json" }) ?? { "Content-Type": "application/json" };
			const res = await fetch(`/api/diaries/${diaryId}/revise`, {
				method: "POST", headers,
				body: JSON.stringify({ ...diary, instrumentTrayBarcode: trayBarcode ?? "", revisionReason: reason }),
			});
			const rawBody = await res.text();
			const json = jsonObjectOrNull(rawBody);
			if (res.ok) {
				if (typeof json?.hash === "string") setDiaryHash(json.hash);
				setHasCryptoSignature(json?.cryptoSignatureAttached === true);
				if (typeof json?.revisionCount === "number") setRevisionCount(json.revisionCount);
				else setRevisionCount((n: number) => n + 1);
				if (reviseSnapshot) {
					const { name } = resolveDoctorNameAndSpecialty(activeDoctor);
					const localRow: DiaryRevisionRow = {
						id: `local-${Date.now()}`, revisedAt: new Date().toISOString(), revisionReason: revisionReason.trim() || null,
						previousAnamnesis: reviseSnapshot.anamnesis, previousStatusLocalis: reviseSnapshot.statusLocalis,
						previousDiagnosisIcd10: reviseSnapshot.diagnosisIcd10, previousDiagnosisTooth: reviseSnapshot.diagnosisTooth,
						previousTreatmentDescription: reviseSnapshot.treatmentDescription, previousComplications: reviseSnapshot.complications,
						previousComorbidities: reviseSnapshot.comorbidities, previousInstrumentTrayBarcode: reviseTraySnapshot,
						revisedByUserId: null, revisedByFullName: name,
					};
					setDiaryRevisions((prev) => [localRow, ...prev]);
				}
				setIsRevising(false);
				setRevisionReason("");
				setReviseSnapshot(null);
				setReviseTraySnapshot(null);
				setLastSavedAt(new Date());
				setIsLocked(true);
				showToast(`Правка сохранена. Прежний текст остался в истории (ревизий: ${typeof json?.revisionCount === "number" ? json.revisionCount : "…"}).`, "success", 10000);
				return;
			}
			logger.error(`[diary revise] ${res.status} ${rawBody.slice(0, 300)}`);
			const detail = operatorReadableErrorDetail(typeof json?.message === "string" ? json.message : null);
			showToast(detail ?? (res.status === 403 ? "Исправить подписанный дневник может лечащий врач или администратор клиники." : `Правка не сохранена: ${requestFailureCause(res.status)}.`), "error", 14000);
		} catch (error) {
			logger.error("[diary revise] запрос не выполнен", error);
			showToast(`Правка не сохранена: ${requestFailureCause(null)}. Набранный текст остался на экране.`, "error", 12000);
		} finally { setIsRevisingBusy(false); }
	}, [activeDoctor, diary, diaryId, isLocked, revisionReason, reviseSnapshot, reviseTraySnapshot, trayBarcode, authRef, setDiaryHash, setHasCryptoSignature, setRevisionCount, setDiaryRevisions, setLastSavedAt, setIsLocked]);

	return { isRevising, setIsRevising, revisionReason, setRevisionReason, isRevisingBusy, setReviseSnapshot, setReviseTraySnapshot, beginRevise, cancelRevise, doRevise };
}
