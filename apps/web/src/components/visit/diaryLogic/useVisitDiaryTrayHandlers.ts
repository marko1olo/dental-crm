import { useCallback, useRef, useState } from "react";
import type React from "react";
import type { DiaryLoadState, DiaryState } from "./diaryLogicTypes";
import { jsonObjectOrNull } from "./diaryLogicTypes";
import { operatorReadableErrorDetail } from "../../../AppHelpers";
import {
	actionFailureToast,
	requestFailureCause,
} from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { parseAndValidateKraftBarcode } from "@dental/shared";
import { showToast } from "../../GlobalToast";

export interface UseVisitDiaryTrayHandlersParams {
	readonly visitId: string;
	readonly patientId: string;
	readonly diary: DiaryState;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly activeDoctor: any;
	readonly authRef: React.MutableRefObject<any>;
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly loadState: DiaryLoadState;
	readonly setLoadState: React.Dispatch<React.SetStateAction<DiaryLoadState>>;
	readonly setDiaryId: React.Dispatch<React.SetStateAction<string | null>>;
	readonly setDiaryHash: React.Dispatch<React.SetStateAction<string | null>>;
	readonly setLastSavedAt: React.Dispatch<React.SetStateAction<Date | null>>;
	readonly setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
	readonly diaryHash: string | null;
}

export function useVisitDiaryTrayHandlers({
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
}: UseVisitDiaryTrayHandlersParams) {
	const [trayBarcode, setTrayBarcode] = useState<string | null>(null);
	const trayBarcodeRef = useRef(trayBarcode);
	trayBarcodeRef.current = trayBarcode;

	const linkSterilizationTray = async (
		fallbackHash: string | null = null,
	): Promise<{ ok: true; hash: string | null } | { ok: false }> => {
		if (!trayBarcode || isLocked) {
			return { ok: true, hash: fallbackHash ?? diaryHash };
		}
		try {
			const headerSource = authRef.current;
			const linkRes = await fetch("/api/sterilization/link", {
				method: "POST",
				headers:
					headerSource &&
					typeof headerSource.denteClinicalMutationHeaders === "function"
						? headerSource.denteClinicalMutationHeaders({
								"Content-Type": "application/json",
							})
						: { "Content-Type": "application/json" },
				body: JSON.stringify({ visitId, barcode: trayBarcode }),
			});
			if (!linkRes.ok) {
				const rawBody = await linkRes.text();
				logger.warn(
					`[sterilization link non-blocking] ${linkRes.status} ${rawBody.slice(0, 300)}`,
				);
				const payload = jsonObjectOrNull(rawBody);
				const detail = operatorReadableErrorDetail(
					typeof payload?.message === "string" ? payload.message : null,
				);
				showToast(
					detail ??
						(linkRes.status === 400
							? `Лоток ${trayBarcode} не зарегистрирован в электронном журнале (бумажный журнал учёта). Лоток зафиксирован в медицинской карте без блокировки подписи.`
							: `Штрихкод лотка: ${requestFailureCause(linkRes.status)}. Подписание карты продолжено.`),
					"warning",
					8000,
				);
				return { ok: true, hash: fallbackHash ?? diaryHash };
			}
			const linkRaw = await linkRes.text();
			const linkPayload = jsonObjectOrNull(linkRaw);
			const newHash =
				typeof linkPayload?.diaryHash === "string" && linkPayload.diaryHash
					? linkPayload.diaryHash
					: null;
			if (newHash) setDiaryHash(newHash);
			return { ok: true, hash: newHash ?? fallbackHash ?? diaryHash };
		} catch (e) {
			logger.warn("[sterilization link] запрос не выполнен, продолжаем solo-подписание", e);
			showToast(
				`Штрихкод лотка зафиксирован локально: ${requestFailureCause(null)}. Подпись 043/у продолжена.`,
				"warning",
				8000,
			);
			return { ok: true, hash: fallbackHash ?? diaryHash };
		}
	};

	const clearTrayBarcode = useCallback(async () => {
		if (isLocked) {
			showToast(
				"Подписанный дневник: лоток снимается только через «Исправить».",
				"info",
				10000,
			);
			return;
		}
		if (loadState.phase === "loading" || loadState.phase === "failed") {
			showToast(
				"Сначала дождитесь загрузки записей приёма — снять лоток нельзя, пока дневник не прочитан.",
				"error",
				10000,
			);
			return;
		}
		setTrayBarcode(null);
		if (!activeDoctor) {
			showToast(
				"Лоток снят на экране. Выберите врача и сохраните черновик, чтобы записать снятие.",
				"info",
				10000,
			);
			return;
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
					instrumentTrayBarcode: "",
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
				logger.error(
					`[diary tray clear] ${res.status} ${rawBody.slice(0, 300)}`,
				);
				const payload = jsonObjectOrNull(rawBody);
				const serverDetail = operatorReadableErrorDetail(
					typeof payload?.message === "string"
						? payload.message
						: typeof payload?.error === "string"
							? payload.error
							: null,
				);
				showToast(
					`${
						serverDetail ??
						actionFailureToast("Лоток не снят с черновика", res.status)
					} На экране лоток уже снят — сохраните черновик вручную.`,
					"error",
					12000,
				);
				return;
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
			setLastSavedAt(new Date());
			showToast("Лоток снят с черновика", "success", 6000);
		} catch (err) {
			logger.error("[diary tray clear] запрос не выполнен", err);
			showToast(
				`${actionFailureToast("Лоток не снят с черновика", null)} На экране лоток уже снят — сохраните черновик вручную.`,
				"error",
				12000,
			);
		} finally {
			setIsSaving(false);
		}
	}, [activeDoctor, diary, isLocked, loadState.phase, patientId, visitId, authRef, setDiaryId, setDiaryHash, setLoadState, setLastSavedAt, setIsSaving]);

	const assignTrayBarcode = useCallback(
		async (rawCode: string, protocolTextToAppend?: string) => {
			const code = rawCode.trim();
			if (!code) {
				showToast("Введите или отсканируйте штрихкод лотка.", "info", 6000);
				return;
			}

			const parsed = parseAndValidateKraftBarcode(code);
			let nextTreatment = diary.treatmentDescription;
			const textToAppend = protocolTextToAppend || parsed.formattedProtocolRecord043;
			if (textToAppend && !nextTreatment.includes(code)) {
				nextTreatment = nextTreatment
					? `${nextTreatment}\n\n${textToAppend}`
					: textToAppend;
				setDiary((p) => ({
					...p,
					treatmentDescription: nextTreatment,
				}));
			}

			if (isRevising) {
				setTrayBarcode(code);
				showToast(
					"Лоток указан на экране. Нажмите «Сохранить правку», чтобы записать в историю.",
					"info",
					10000,
				);
				return;
			}
			if (isLocked) {
				showToast(
					"Подписанный дневник: лоток меняется только через «Исправить».",
					"info",
					10000,
				);
				return;
			}
			if (loadState.phase === "loading" || loadState.phase === "failed") {
				showToast(
					"Сначала дождитесь загрузки записей приёма — привязать лоток нельзя, пока дневник не прочитан.",
					"error",
					10000,
				);
				return;
			}
			setTrayBarcode(code);
			if (!activeDoctor) {
				showToast(
					"Лоток указан на экране. Выберите врача и сохраните черновик, чтобы записать привязку.",
					"info",
					10000,
				);
				return;
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
						instrumentTrayBarcode: code,
						anamnesis: diary.anamnesis,
						statusLocalis: diary.statusLocalis,
						diagnosisIcd10: diary.diagnosisIcd10,
						diagnosisTooth: diary.diagnosisTooth,
						treatmentDescription: nextTreatment,
						complications: diary.complications,
						comorbidities: diary.comorbidities,
					}),
				});
				const rawBody = await res.text();
				if (!res.ok) {
					logger.error(
						`[diary tray assign] ${res.status} ${rawBody.slice(0, 300)}`,
					);
					const payload = jsonObjectOrNull(rawBody);
					const serverDetail = operatorReadableErrorDetail(
						typeof payload?.message === "string"
							? payload.message
							: typeof payload?.error === "string"
								? payload.error
								: null,
					);
					showToast(
						(serverDetail ??
							actionFailureToast("Лоток не записан в черновик", res.status)) +
							" На экране лоток уже указан — сохраните черновик вручную.",
						"error",
						12000,
					);
					return;
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
				setLastSavedAt(new Date());
				showToast(
					parsed.isExpired
						? "ВНИМАНИЕ: Лоток привязан, но срок стерилизации истёк!"
						: "Лоток привязан и запись стерилизации внесена в медкарту",
					parsed.isExpired ? "error" : "success",
					7000,
				);
			} catch (err) {
				logger.error("[diary tray assign] запрос не выполнен", err);
				showToast(
					actionFailureToast("Лоток не записан в черновик", null) +
						" На экране лоток уже указан — сохраните черновик вручную.",
					"error",
					12000,
				);
			} finally {
				setIsSaving(false);
			}
		},
		[
			activeDoctor,
			diary,
			isLocked,
			isRevising,
			loadState.phase,
			patientId,
			visitId,
			authRef,
			setDiary,
			setDiaryId,
			setDiaryHash,
			setLoadState,
			setLastSavedAt,
			setIsSaving,
		],
	);

	return {
		trayBarcode,
		setTrayBarcode,
		trayBarcodeRef,
		linkSterilizationTray,
		clearTrayBarcode,
		assignTrayBarcode,
	};
}
