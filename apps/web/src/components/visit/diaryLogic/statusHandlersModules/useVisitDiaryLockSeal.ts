import type React from "react";
import { operatorReadableErrorDetail } from "../../../../AppHelpers";
import { requestFailureCause } from "../../../../lib/panelStateText";
import { safeLocalStorageRemoveItem } from "../../../../lib/safeLocalStorage";
import { logger } from "../../../../utils/logger";
import { showToast } from "../../../GlobalToast";
import type { DiaryLoadState } from "../diaryLogicTypes";
import { jsonObjectOrNull } from "../diaryLogicTypes";
import { resolveDoctorNameAndSpecialty } from "./useVisitDiaryDoctorInfoBuilder";

export interface UseVisitDiaryLockSealParams {
	activeDoctor: any;
	loadState: DiaryLoadState;
	diaryId: string | null;
	isLocked: boolean;
	trayBarcode: string | null;
	authRef: React.MutableRefObject<any>;
	localDiaryStorageKey: string;
	setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
	setLockedAt: React.Dispatch<React.SetStateAction<string | null>>;
	setDiaryHash: React.Dispatch<React.SetStateAction<string | null>>;
	setHasCryptoSignature: React.Dispatch<React.SetStateAction<boolean>>;
	setDiaryDoctorFullName: React.Dispatch<React.SetStateAction<string | null>>;
	setDiaryDoctorSpecialty: React.Dispatch<React.SetStateAction<string | null>>;
	doSave: (silent?: boolean) => Promise<{ id: string; hash: string | null } | null>;
	linkSterilizationTray: (hash?: string | null) => Promise<{ ok: boolean; hash?: string | null } | { ok: false }>;
}

export function useVisitDiaryLockSeal({
	activeDoctor, loadState, diaryId, isLocked, trayBarcode, authRef,
	localDiaryStorageKey, setIsLocked, setLockedAt, setDiaryHash,
	setHasCryptoSignature, setDiaryDoctorFullName, setDiaryDoctorSpecialty,
	doSave, linkSterilizationTray,
}: UseVisitDiaryLockSealParams) {
	const doLock = async (certThumbprint: string, pkcs7Signature: string, alreadySavedId?: string | null) => {
		void certThumbprint;
		if (!activeDoctor) { showToast("Сначала выберите врача для приема!", "error"); return; }
		if (loadState.phase !== "ready" && loadState.phase !== "empty") {
			showToast(loadState.phase === "loading" ? "Дневник приёма ещё читается с сервера — подождите пару секунд и повторите подписание." : "Дневник не синхронизирован. Проверьте подключение.", "warning", 5000);
			return;
		}

		let savedDiaryId: string | null = alreadySavedId ?? null;
		if (!savedDiaryId) {
			const savedDraft = await doSave(true);
			savedDiaryId = savedDraft?.id ?? null;
		}
		if (!alreadySavedId && trayBarcode && !isLocked) {
			const linked = await linkSterilizationTray(null);
			if (!linked.ok) return;
		}

		const lockTargetId = savedDiaryId ?? diaryId;
		if (!lockTargetId) {
			showToast("Дневник ещё не сохранён на сервере, поэтому подписывать нечего. Нажмите «Сохранить черновик».", "error", 14000);
			return;
		}

		try {
			const headers = authRef.current?.denteClinicalMutationHeaders?.({ "Content-Type": "application/json" }) ?? { "Content-Type": "application/json" };
			const res = await fetch(`/api/diaries/${lockTargetId}/lock`, { method: "POST", headers, body: JSON.stringify({ pkcs7Signature }) });
			const rawBody = await res.text();
			const json = jsonObjectOrNull(rawBody);

			if (res.ok) {
				setIsLocked(true);
				setLockedAt(typeof json?.lockedAt === "string" && json.lockedAt ? json.lockedAt : new Date().toISOString());
				setDiaryHash(typeof json?.hash === "string" ? json.hash : null);
				setHasCryptoSignature(json?.cryptoSignatureAttached === true || Boolean(typeof pkcs7Signature === "string" && pkcs7Signature.length > 0));
				if (!json?.reattached && activeDoctor) {
					const { name, specialty } = resolveDoctorNameAndSpecialty(activeDoctor);
					if (name) setDiaryDoctorFullName(name);
					if (specialty) setDiaryDoctorSpecialty(specialty);
				}
				try { safeLocalStorageRemoveItem(localDiaryStorageKey); } catch {}
				showToast(json?.reattached ? "Оттиск УКЭП прикреплён к отредактированному дневнику." : "Дневник успешно подписан (ЭЦП врача).", "success");
			} else if (res.status === 409) {
				setIsLocked(true);
				try { safeLocalStorageRemoveItem(localDiaryStorageKey); } catch {}
				if (typeof json?.hash === "string") setDiaryHash(json.hash);
				if (typeof json?.lockedAt === "string" && json.lockedAt) setLockedAt(json.lockedAt);
				if (typeof json?.cryptoSignatureAttached === "boolean") setHasCryptoSignature(json.cryptoSignatureAttached);
				showToast(typeof json?.message === "string" && json.message ? json.message : "Дневник уже был подписан ранее.", "info", 12000);
			} else {
				logger.error(`[diary lock] ${res.status} ${rawBody.slice(0, 300)}`);
				const detail = operatorReadableErrorDetail(typeof json?.message === "string" ? json.message : null);
				showToast(detail ?? `Дневник не подписан: ${requestFailureCause(res.status)}.`, "error", 12000);
			}
		} catch (error) {
			logger.error("[diary lock] запрос не выполнен", error);
			showToast(`Дневник не подписан: ${requestFailureCause(null)}. Набранный текст остался на экране.`, "error", 12000);
		}
	};

	return { doLock };
}
