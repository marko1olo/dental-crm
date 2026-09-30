import { useCallback, useRef, useState } from "react";
import type React from "react";
import type {
	DiaryLoadState,
	DiaryRevisionRow,
	DiaryState,
} from "./diaryLogicTypes";
import {
	UUID_REGEX,
	jsonObjectOrNull,
} from "./diaryLogicTypes";
import { operatorReadableErrorDetail } from "../../../AppHelpers";
import {
	actionFailureToast,
	requestFailureCause,
} from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { safeLocalStorageRemoveItem } from "../../../lib/safeLocalStorage";
import { useVisitDiaryTrayHandlers } from "./useVisitDiaryTrayHandlers";

export interface UseVisitDiaryStatusHandlersParams {
	readonly visitId: string;
	readonly patientId: string;
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly diaryRef: React.MutableRefObject<DiaryState>;
	readonly activeDoctor: any;
	readonly authRef: React.MutableRefObject<any>;
	readonly loadState: DiaryLoadState;
	readonly setLoadState: React.Dispatch<React.SetStateAction<DiaryLoadState>>;
	readonly diaryId: string | null;
	readonly setDiaryId: React.Dispatch<React.SetStateAction<string | null>>;
	readonly isLocked: boolean;
	readonly setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
	readonly lockedAt: string | null;
	readonly setLockedAt: React.Dispatch<React.SetStateAction<string | null>>;
	readonly diaryHash: string | null;
	readonly setDiaryHash: React.Dispatch<React.SetStateAction<string | null>>;
	readonly hasCryptoSignature: boolean;
	readonly setHasCryptoSignature: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setDiaryDoctorFullName: React.Dispatch<React.SetStateAction<string | null>>;
	readonly setDiaryDoctorSpecialty: React.Dispatch<React.SetStateAction<string | null>>;
	readonly setLastSavedAt: React.Dispatch<React.SetStateAction<Date | null>>;
	readonly setRevisionCount: React.Dispatch<React.SetStateAction<number>>;
	readonly setDiaryRevisions: React.Dispatch<React.SetStateAction<DiaryRevisionRow[]>>;
	readonly localDiaryStorageKey: string;
}

export function useVisitDiaryStatusHandlers({
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
	localDiaryStorageKey,
}: UseVisitDiaryStatusHandlersParams) {
	const [isSaving, setIsSaving] = useState(false);
	const [isRevising, setIsRevising] = useState(false);
	const [revisionReason, setRevisionReason] = useState("");
	const [isRevisingBusy, setIsRevisingBusy] = useState(false);
	const [reviseSnapshot, setReviseSnapshot] = useState<DiaryState | null>(null);
	const [reviseTraySnapshot, setReviseTraySnapshot] = useState<string | null>(null);

	const autosaveFailureReportedRef = useRef(false);

	const {
		trayBarcode,
		setTrayBarcode,
		trayBarcodeRef,
		linkSterilizationTray,
		clearTrayBarcode,
		assignTrayBarcode,
	} = useVisitDiaryTrayHandlers({
		visitId,
		patientId,
		diary,
		setDiary,
		activeDoctor,
		authRef,
		isLocked,
		isRevising,
		loadState,
		setLoadState,
		setDiaryId,
		setDiaryHash,
		setLastSavedAt,
		setIsSaving,
		diaryHash,
	});

	// ── Save
	const doSave = useCallback(
		async (
			silent = false,
		): Promise<{ id: string; hash: string | null } | null> => {
			if (isLocked) {
				return diaryId ? { id: diaryId, hash: diaryHash } : null;
			}

			if (!activeDoctor) {
				if (!silent) showToast("Выберите врача для приема", "error");
				return null;
			}

			if (
				!visitId ||
				!UUID_REGEX.test(visitId) ||
				!patientId ||
				!UUID_REGEX.test(patientId)
			) {
				if (!silent) {
					showToast(
						"Приём ещё не открыт в расписании. Откройте приём из расписания, чтобы сохранить дневник.",
						"warning",
					);
				}
				return null;
			}

			const hasDiaryContent = Boolean(
				diary.anamnesis?.trim() ||
					diary.statusLocalis?.trim() ||
					diary.diagnosisIcd10?.trim() ||
					diary.diagnosisTooth?.trim() ||
					diary.treatmentDescription?.trim() ||
					diary.complications?.trim() ||
					diary.comorbidities?.trim() ||
					trayBarcode?.trim(),
			);
			if (silent && loadState.phase === "empty" && !hasDiaryContent) {
				return null;
			}

			if (loadState.phase === "loading") {
				if (!silent) {
					showToast(
						"Дневник приёма ещё читается с сервера. Подождите пару секунд и сохраните снова — набранный текст останется на экране.",
						"info",
						8000,
					);
				}
				return null;
			}
			if (loadState.phase === "failed") {
				if (!silent) {
					showToast(
						"Дневник не синхронизирован. Проверьте подключение и нажмите «Обновить». Черновик сохранён локально.",
						"warning",
						5000,
					);
				}
				return null;
			}
			setIsSaving(true);
			try {
				const headerSource = authRef.current;
				const res = await fetch("/api/diaries", {
					method: "POST",
					headers:
						headerSource &&
						typeof headerSource.denteClinicalMutationHeaders === "function"
							? headerSource.denteClinicalMutationHeaders({
									"Content-Type": "application/json",
								})
							: { "Content-Type": "application/json" },
					body: JSON.stringify({
						visitId,
						patientId,
						status: "draft",
						instrumentTrayBarcode: trayBarcode ?? "",
						anamnesis: diary.anamnesis,
						statusLocalis: diary.statusLocalis,
						diagnosisIcd10: diary.diagnosisIcd10,
						diagnosisTooth: diary.diagnosisTooth,
						treatmentDescription: diary.treatmentDescription,
						complications: diary.complications,
						comorbidities: diary.comorbidities,
					}),
				});
				const rawBody = await res.text();
				if (!res.ok) {
					logger.error(`[diary save] ${res.status} ${rawBody.slice(0, 300)}`);
					const payload = jsonObjectOrNull(rawBody);
					const serverDetail = operatorReadableErrorDetail(
						typeof payload?.message === "string"
							? payload.message
							: typeof payload?.error === "string"
								? payload.error
								: null,
					);
					const message = `${
						serverDetail ??
						actionFailureToast("Черновик дневника не сохранён", res.status)
					} Набранный текст остался на экране.`;
					if (!silent) {
						showToast(message, "error", 10000);
					} else if (!autosaveFailureReportedRef.current) {
						autosaveFailureReportedRef.current = true;
						showToast(
							`${message} Автосохранение не работает — сохраняйте вручную и не закрывайте приём, пока не появится отметка времени.`,
							"error",
							14000,
						);
					}
					return null;
				}
				const data = jsonObjectOrNull(rawBody);
				const savedId = typeof data?.id === "string" ? data.id : undefined;
				if (savedId) setDiaryId(savedId);
				if (typeof data?.hash === "string" && data.hash) {
					setDiaryHash(data.hash);
				}
				if (loadState.phase === "empty") {
					setLoadState({ phase: "ready" });
				}

				autosaveFailureReportedRef.current = false;
				setLastSavedAt(new Date());
				if (!silent) showToast("Черновик сохранен", "success");
				const resolvedId = savedId ?? diaryId;
				if (!resolvedId) return null;
				const resolvedHash =
					typeof data?.hash === "string" && data.hash ? data.hash : diaryHash;
				return { id: resolvedId, hash: resolvedHash };
			} catch (err) {
				logger.error("[diary save] запрос не выполнен", err);
				const message = `${actionFailureToast("Черновик дневника не сохранён", null)} Набранный текст остался на экране.`;
				if (!silent) {
					showToast(message, "error", 10000);
				} else if (!autosaveFailureReportedRef.current) {
					autosaveFailureReportedRef.current = true;
					showToast(message, "error", 14000);
				}
				return null;
			} finally {
				setIsSaving(false);
			}
		},
		[
			activeDoctor,
			diary,
			diaryHash,
			diaryId,
			isLocked,
			loadState,
			patientId,
			trayBarcode,
			visitId,
			authRef,
			setDiaryId,
			setDiaryHash,
			setLoadState,
			setLastSavedAt,
		],
	);

	const ensureDraftSavedForSigning = async (): Promise<{
		id: string;
		hash: string | null;
	} | null> => {
		const saved = await doSave(true);
		if (!saved?.id) return null;
		const linked = await linkSterilizationTray(saved.hash);
		if (!linked.ok) return null;
		return { id: saved.id, hash: linked.hash ?? saved.hash };
	};

	// ── Lock (Sign & Seal)
	const doLock = async (
		certThumbprint: string,
		pkcs7Signature: string,
		alreadySavedId?: string | null,
	) => {
		void certThumbprint;
		if (!activeDoctor) {
			showToast("Сначала выберите врача для приема!", "error");
			return;
		}
		if (loadState.phase !== "ready" && loadState.phase !== "empty") {
			showToast(
				loadState.phase === "loading"
					? "Дневник приёма ещё читается с сервера — подождите пару секунд и повторите подписание."
					: "Дневник не синхронизирован. Проверьте подключение и нажмите «Обновить» перед подписанием.",
				"warning",
				5000,
			);
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
			showToast(
				"Дневник ещё не сохранён на сервере, поэтому подписывать нечего. Нажмите «Сохранить черновик», дождитесь отметки времени сохранения и повторите подписание.",
				"error",
				14000,
			);
			return;
		}
		try {
			const headerSource = authRef.current;
			const res = await fetch(`/api/diaries/${lockTargetId}/lock`, {
				method: "POST",
				headers:
					headerSource &&
					typeof headerSource.denteClinicalMutationHeaders === "function"
						? headerSource.denteClinicalMutationHeaders({
								"Content-Type": "application/json",
							})
						: { "Content-Type": "application/json" },
				body: JSON.stringify({ pkcs7Signature }),
			});
			const rawBody = await res.text();
			const json = jsonObjectOrNull(rawBody);
			if (res.ok) {
				setIsLocked(true);
				setLockedAt(
					typeof json?.lockedAt === "string" && json.lockedAt
						? json.lockedAt
						: new Date().toISOString(),
				);
				setDiaryHash(typeof json?.hash === "string" ? json.hash : null);
				if (json?.cryptoSignatureAttached === true) {
					setHasCryptoSignature(true);
				} else if (
					typeof pkcs7Signature === "string" &&
					pkcs7Signature.length > 0
				) {
					setHasCryptoSignature(true);
				} else if (json?.cryptoSignatureAttached === false) {
					setHasCryptoSignature(false);
				}

				if (!json?.reattached && activeDoctor) {
					const fromFull =
						typeof activeDoctor.fullName === "string"
							? activeDoctor.fullName.trim()
							: "";
					const fromParts = [
						activeDoctor.lastName,
						activeDoctor.firstName,
						activeDoctor.middleName,
					]
						.map((x) => (typeof x === "string" ? x.trim() : ""))
						.filter(Boolean)
						.join(" ");
					const name = fromFull || fromParts;
					if (name) setDiaryDoctorFullName(name);

					const rawSpecs = Array.isArray(activeDoctor.specialties)
						? activeDoctor.specialties
						: [];
					const codes = rawSpecs
						.map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
						.filter(Boolean);
					const meaningful = codes.filter((c: string) => c !== "universal");
					const list = meaningful.length > 0 ? meaningful : codes;
					const labelMap: Record<string, string> = {
						therapist: "терапия",
						orthopedist: "ортопедия",
						surgeon: "хирургия",
						orthodontist: "ортодонтия",
						periodontist: "пародонтология",
						hygienist: "гигиена",
						pediatric: "детская",
						implantologist: "имплантация",
						radiologist: "рентген",
						universal: "универсально",
					};
					const spec = list
						.map((c: string) => labelMap[c] ?? c)
						.join(", ")
						.trim();
					if (spec) setDiaryDoctorSpecialty(spec);
				}
				try {
					safeLocalStorageRemoveItem(localDiaryStorageKey);
				} catch {
					// ignore
				}
				showToast(
					json?.reattached
						? "Оттиск УКЭП прикреплён к отредактированному дневнику."
						: "Дневник подписан и заблокирован (ЭЦП врача).",
					"success",
				);
			} else if (res.status === 409) {
				setIsLocked(true);
				try {
					safeLocalStorageRemoveItem(localDiaryStorageKey);
				} catch {
					// ignore
				}
				if (typeof json?.hash === "string") setDiaryHash(json.hash);
				if (typeof json?.lockedAt === "string" && json.lockedAt) {
					setLockedAt(json.lockedAt);
				}
				if (typeof json?.cryptoSignatureAttached === "boolean") {
					setHasCryptoSignature(json.cryptoSignatureAttached);
				}
				showToast(
					typeof json?.message === "string" && json.message
						? json.message
						: "Дневник уже был подписан ранее.",
					"info",
					12000,
				);
			} else {
				logger.error(`[diary lock] ${res.status} ${rawBody.slice(0, 300)}`);
				const detail = operatorReadableErrorDetail(
					typeof json?.message === "string" ? json.message : null,
				);
				showToast(
					detail ?? `Дневник не подписан: ${requestFailureCause(res.status)}.`,
					"error",
					12000,
				);
			}
		} catch (error) {
			logger.error("[diary lock] запрос не выполнен", error);
			showToast(
				`Дневник не подписан: ${requestFailureCause(null)}. Набранный текст остался на экране.`,
				"error",
				12000,
			);
		}
	};

	// ── Revisions
	const beginRevise = useCallback(() => {
		if (!isLocked || !diaryId) {
			showToast(
				"Исправлять можно только уже подписанный дневник. Сначала сохраните и подпишите запись.",
				"info",
				10000,
			);
			return;
		}
		setReviseSnapshot({ ...diary });
		setReviseTraySnapshot(trayBarcode);
		setIsRevising(true);
		setRevisionReason("Исправленному верить");
	}, [diary, diaryId, isLocked, trayBarcode]);

	const cancelRevise = useCallback(() => {
		if (reviseSnapshot) {
			setDiary(reviseSnapshot);
		}
		setTrayBarcode(reviseTraySnapshot);
		setReviseSnapshot(null);
		setReviseTraySnapshot(null);
		setIsRevising(false);
		setRevisionReason("");
	}, [reviseSnapshot, reviseTraySnapshot, setDiary, setTrayBarcode]);

	const doRevise = useCallback(async () => {
		if (!diaryId) {
			showToast(
				"Дневник ещё не сохранён на сервере — исправлять нечего. Обновите страницу.",
				"error",
				12000,
			);
			return;
		}
		if (!isLocked) {
			showToast(
				"Дневник не подписан — просто отредактируйте и сохраните черновик.",
				"info",
				8000,
			);
			return;
		}
		const reason = revisionReason.trim() || "Исправленному верить";
		setIsRevisingBusy(true);
		try {
			const headerSource = authRef.current;
			const res = await fetch(`/api/diaries/${diaryId}/revise`, {
				method: "POST",
				headers:
					headerSource &&
					typeof headerSource.denteClinicalMutationHeaders === "function"
						? headerSource.denteClinicalMutationHeaders({
								"Content-Type": "application/json",
							})
						: { "Content-Type": "application/json" },
				body: JSON.stringify({
					anamnesis: diary.anamnesis,
					statusLocalis: diary.statusLocalis,
					diagnosisIcd10: diary.diagnosisIcd10,
					diagnosisTooth: diary.diagnosisTooth,
					treatmentDescription: diary.treatmentDescription,
					complications: diary.complications,
					comorbidities: diary.comorbidities,
					instrumentTrayBarcode: trayBarcode ?? "",
					revisionReason: reason,
				}),
			});
			const rawBody = await res.text();
			const json = jsonObjectOrNull(rawBody);
			if (res.ok) {
				if (typeof json?.hash === "string") setDiaryHash(json.hash);
				if (json?.cryptoSignatureAttached === true) {
					setHasCryptoSignature(true);
				} else {
					setHasCryptoSignature(false);
				}
				if (typeof json?.revisionCount === "number") {
					setRevisionCount(json.revisionCount);
				} else {
					setRevisionCount((n) => n + 1);
				}
				if (reviseSnapshot) {
					const localRow: DiaryRevisionRow = {
						id: `local-${Date.now()}`,
						revisedAt: new Date().toISOString(),
						revisionReason: revisionReason.trim() || null,
						previousAnamnesis: reviseSnapshot.anamnesis,
						previousStatusLocalis: reviseSnapshot.statusLocalis,
						previousDiagnosisIcd10: reviseSnapshot.diagnosisIcd10,
						previousDiagnosisTooth: reviseSnapshot.diagnosisTooth,
						previousTreatmentDescription: reviseSnapshot.treatmentDescription,
						previousComplications: reviseSnapshot.complications,
						previousComorbidities: reviseSnapshot.comorbidities,
						previousInstrumentTrayBarcode: reviseTraySnapshot,
						revisedByUserId: null,
						revisedByFullName: (() => {
							const ad = activeDoctor;
							if (!ad) return null;
							const fromFull =
								typeof ad.fullName === "string" ? ad.fullName.trim() : "";
							if (fromFull) return fromFull;
							const parts = [ad.lastName, ad.firstName, ad.middleName]
								.map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
								.filter(Boolean)
								.join(" ");
							return parts || null;
						})(),
					};
					setDiaryRevisions((prev) => [localRow, ...prev]);
				}
				setIsRevising(false);
				setRevisionReason("");
				setReviseSnapshot(null);
				setReviseTraySnapshot(null);
				setLastSavedAt(new Date());
				setIsLocked(true);
				showToast(
					`Правка сохранена. Прежний текст остался в истории (ревизий: ${
						typeof json?.revisionCount === "number" ? json.revisionCount : "…"
					}).`,
					"success",
					10000,
				);
				return;
			}
			logger.error(`[diary revise] ${res.status} ${rawBody.slice(0, 300)}`);
			const detail = operatorReadableErrorDetail(
				typeof json?.message === "string" ? json.message : null,
			);
			showToast(
				detail ??
					(res.status === 403
						? "Исправить подписанный дневник может лечащий врач или администратор клиники. Набранный текст сохранён в черновике."
						: `Правка не сохранена: ${requestFailureCause(res.status)}. Набранный текст остался на экране.`),
				"error",
				14000,
			);
		} catch (error) {
			logger.error("[diary revise] запрос не выполнен", error);
			showToast(
				`Правка не сохранена: ${requestFailureCause(null)}. Набранный текст остался на экране.`,
				"error",
				12000,
			);
		} finally {
			setIsRevisingBusy(false);
		}
	}, [
		activeDoctor,
		diary,
		diaryId,
		isLocked,
		revisionReason,
		reviseSnapshot,
		reviseTraySnapshot,
		trayBarcode,
		authRef,
		setDiaryHash,
		setHasCryptoSignature,
		setRevisionCount,
		setDiaryRevisions,
		setLastSavedAt,
		setIsLocked,
	]);

	return {
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
		linkSterilizationTray,
		ensureDraftSavedForSigning,
		doLock,
		beginRevise,
		cancelRevise,
		doRevise,
		clearTrayBarcode,
		assignTrayBarcode,
	};
}
