import { useCallback, useEffect, useState } from "react";
import type React from "react";
import type { DiaryState } from "./diaryLogicTypes";
import {
	appendAnesthesiaToSoap,
	CLINICAL_FAST_PRESETS,
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
	type MergeStrategy,
	mergeSoapDiaryState,
	type OdontogramFindingInput,
} from "../../../lib/clinicalProtocols043";
import {
	CLINICAL_SOAP_PRESETS,
	CANONICAL_SOAP_TEMPLATES,
	DOCTOR_AUTOPILOT_PRESETS_MAP,
	apply1ClickClinicalAutopilot,
	type Template,
} from "../clinicalSoapPresets";
import { showToast } from "../../GlobalToast";

export interface UseVisitDiaryToothLinkingParams {
	readonly diaryRef: React.MutableRefObject<DiaryState>;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly isLocked: boolean;
	readonly isRevising: boolean;
	readonly setIsRevising: React.Dispatch<React.SetStateAction<boolean>>;
	readonly beginRevise: () => void;
	readonly setReviseSnapshot: React.Dispatch<React.SetStateAction<DiaryState | null>>;
	readonly setReviseTraySnapshot: React.Dispatch<React.SetStateAction<string | null>>;
	readonly trayBarcodeRef: React.MutableRefObject<string | null>;
	readonly setRevisionReason: React.Dispatch<React.SetStateAction<string>>;
	readonly setIcdSearch: React.Dispatch<React.SetStateAction<string>>;
	readonly scheduleDebouncedSave: () => void;
}

export function useVisitDiaryToothLinking({
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
}: UseVisitDiaryToothLinkingParams) {
	// ── Non-destructive Odontogram Findings & Template Application
	const applyOdontogramFinding = useCallback(
		(finding: OdontogramFindingInput, mode: MergeStrategy = "smart_append") => {
			if (isLocked && !isRevising) {
				showToast("Дневник подписан — изменения заблокированы.", "info");
				return;
			}
			const soapProtocol = generateSoapFromOdontogramFinding(finding);
			setDiary((prev) =>
				mergeSoapDiaryState(prev, soapProtocol, { strategy: mode }),
			);
			if (soapProtocol.diagnosisIcd10) {
				const icd = soapProtocol.diagnosisIcd10;
				setIcdSearch((c) => (c.trim() ? c : icd));
			}
			showToast(
				`Протокол для зуба ${finding.toothNumber} добавлен в дневник приёма`,
				"success",
				4000,
			);
		},
		[isLocked, isRevising, setDiary, setIcdSearch],
	);

	const applySoapProtocol = useCallback(
		(incoming: Partial<DiaryState>, mode: MergeStrategy = "smart_append") => {
			if (isLocked && !isRevising) {
				showToast("Дневник подписан — изменения заблокированы.", "info");
				return;
			}
			setDiary((prev) =>
				mergeSoapDiaryState(prev, incoming, { strategy: mode }),
			);
			if (incoming.diagnosisIcd10) {
				const icd = incoming.diagnosisIcd10;
				setIcdSearch((c) => (c.trim() ? c : icd));
			}
		},
		[isLocked, isRevising, setDiary, setIcdSearch],
	);

	// ── Populate from Odontogram
	const populateFromOdontogram = useCallback(
		(
			states: readonly {
				toothNumber: number;
				state: string;
				surfaces?: readonly string[] | null;
				notes?: string;
			}[],
		) => {
			if (isLocked && !isRevising) {
				showToast("Дневник подписан — изменения заблокированы.", "info");
				return;
			}
			const generated = generateSoapFromOdontogramStates(states);
			setDiary((prev) =>
				mergeSoapDiaryState(prev, generated, { strategy: "smart_append" }),
			);
			if (generated.diagnosisIcd10) {
				const icd = generated.diagnosisIcd10;
				setIcdSearch((c) => (c.trim() ? c : icd));
			}
			scheduleDebouncedSave();
			showToast("Дневник приёма заполнен из зубной формулы", "success", 4000);
		},
		[isLocked, isRevising, scheduleDebouncedSave, setDiary, setIcdSearch],
	);

	// ── Non-intrusive SOAP suggestions banner state (Autopilot without screen takeover)
	const [pendingSoapSuggestion, setPendingSoapSuggestion] = useState<{
		id: string;
		title: string;
		source: string;
		soap: Partial<DiaryState>;
		finding?: OdontogramFindingInput | undefined;
		mode?: MergeStrategy | undefined;
	} | null>(null);

	const applyPendingSoapSuggestion = useCallback(() => {
		if (!pendingSoapSuggestion) return;
		if (isLocked && !isRevising) {
			showToast("Дневник подписан — изменения заблокированы.", "info");
			return;
		}
		const { soap, mode = "smart_append", title } = pendingSoapSuggestion;
		setDiary((prev) => mergeSoapDiaryState(prev, soap, { strategy: mode }));
		if (soap.diagnosisIcd10) {
			const icd = soap.diagnosisIcd10;
			setIcdSearch((c) => (c.trim() ? c : icd));
		}
		setPendingSoapSuggestion(null);
		scheduleDebouncedSave();
		showToast(`Применен протокол СтАР: «${title}»`, "success", 4000);
	}, [pendingSoapSuggestion, isLocked, isRevising, scheduleDebouncedSave, setDiary, setIcdSearch]);

	const dismissPendingSoapSuggestion = useCallback(() => {
		setPendingSoapSuggestion(null);
	}, []);

	// ── Global 1-Click Fast-Track Protocol Dispatch Listener (Non-intrusive by default)
	useEffect(() => {
		const handleGlobalSoapEvent = (e: Event) => {
			const customEvt = e as CustomEvent<{
				soap?: Partial<DiaryState>;
				finding?: OdontogramFindingInput;
				mode?: MergeStrategy;
				immediate?: boolean;
			}>;
			if (!customEvt.detail) return;
			const { soap, finding, mode = "smart_append", immediate = false } = customEvt.detail;

			if (isLocked && !isRevising) {
				setIsRevising(true);
				setReviseSnapshot({ ...diaryRef.current });
				setReviseTraySnapshot(trayBarcodeRef.current);
				setRevisionReason("Исправленному верить (синхронизация одонтограммы)");
				showToast(
					"Дневник визита открыт для внесения исправлений (протокол одонтограммы применён)",
					"warning",
					4000,
				);
			}

			const targetSoap = soap || (finding ? generateSoapFromOdontogramFinding(finding) : undefined);
			if (!targetSoap) return;

			const title = finding
				? `Зуб ${finding.toothNumber} (${targetSoap.diagnosisIcd10 || "СтАР"})`
				: targetSoap.diagnosisIcd10 || "Клинический протокол СтАР";
			const source = finding ? `Зубная формула (Зуб ${finding.toothNumber})` : "Клинический автопилот";

			if (immediate) {
				setDiary((prev) => mergeSoapDiaryState(prev, targetSoap, { strategy: mode }));
				if (targetSoap.diagnosisIcd10) {
					const icd = targetSoap.diagnosisIcd10;
					setIcdSearch((c) => (c.trim() ? c : icd));
				}
				scheduleDebouncedSave();
				showToast(
					`Протокол для ${finding ? `зуба #${finding.toothNumber}` : "приема"} внесен в дневник приёма`,
					"success",
					4000,
				);
			} else {
				setPendingSoapSuggestion({
					id: `sugg-${Date.now()}`,
					title,
					source,
					soap: targetSoap as Partial<DiaryState>,
					...(finding ? { finding } : {}),
					...(mode ? { mode } : {}),
				});
			}
		};

		window.addEventListener("dente-apply-soap-protocol", handleGlobalSoapEvent);
		return () => {
			window.removeEventListener(
				"dente-apply-soap-protocol",
				handleGlobalSoapEvent,
			);
		};
	}, [isLocked, isRevising, scheduleDebouncedSave, diaryRef, setIsRevising, setReviseSnapshot, setReviseTraySnapshot, trayBarcodeRef, setRevisionReason, setDiary, setIcdSearch]);

	// ── Anesthesia Quick Logger
	const applyAnesthesiaPreset = useCallback(
		(anestheticText: string) => {
			if (isLocked && !isRevising) {
				setIsRevising(true);
				setReviseSnapshot({ ...diaryRef.current });
				setReviseTraySnapshot(trayBarcodeRef.current);
				setRevisionReason("Исправленному верить (добавление анестезии)");
				showToast(
					"Дневник визита открыт для внесения исправлений (анестезия внесена)",
					"warning",
					4000,
				);
			}
			setDiary((prev) => appendAnesthesiaToSoap(prev, anestheticText));
			scheduleDebouncedSave();
			showToast("Запись об анестезии внесена в план лечения", "success", 3000);
		},
		[isLocked, isRevising, scheduleDebouncedSave, diaryRef, setIsRevising, setReviseSnapshot, setReviseTraySnapshot, trayBarcodeRef, setRevisionReason, setDiary],
	);

	// ── Fast Clinical Presets & 1-Click Protocol Autopilot
	const applyClinicalPreset = useCallback(
		(
			presetId: string,
			options?: {
				toothNumber?: number | null;
				surfaces?: string;
				mode?: "clean_replace" | "smart_append";
			},
		) => {
			if (isLocked && !isRevising) {
				setIsRevising(true);
				setReviseSnapshot({ ...diaryRef.current });
				setReviseTraySnapshot(trayBarcodeRef.current);
				setRevisionReason("Исправленному верить (применение клинического протокола)");
				showToast(
					"Дневник визита открыт для внесения исправлений (протокол применён)",
					"warning",
					4000,
				);
			}

			if (DOCTOR_AUTOPILOT_PRESETS_MAP[presetId]) {
				const autoRes = apply1ClickClinicalAutopilot(presetId, {
					toothNumber: options?.toothNumber,
					surfaces: options?.surfaces,
					currentDiary: diaryRef.current,
					mode: options?.mode ?? "smart_append",
				});
				setDiary(autoRes.diary);
				if (autoRes.preset.icd10) {
					setIcdSearch(autoRes.preset.icd10);
				}
				scheduleDebouncedSave();
				showToast(
					`1-клик автопилот «${autoRes.preset.shortBadge}» применён`,
					"success",
					4000,
				);
				return autoRes;
			}

			const fastFound = CLINICAL_FAST_PRESETS.find((p) => p.id === presetId);
			if (fastFound) {
				const target = fastFound;
				const incomingPayload: Partial<DiaryState> = {};
				if (target.anamnesis) incomingPayload.anamnesis = target.anamnesis;
				if (target.statusLocalis) incomingPayload.statusLocalis = target.statusLocalis;
				if (target.treatmentDescription) incomingPayload.treatmentDescription = target.treatmentDescription;
				if (target.defaultIcd10) incomingPayload.diagnosisIcd10 = target.defaultIcd10;
				if (target.complications) {
					incomingPayload.complications = target.complications;
				}
				if (target.comorbidities) {
					incomingPayload.comorbidities = target.comorbidities;
				}

				setDiary((prev) =>
					mergeSoapDiaryState(
						prev,
						incomingPayload,
						{ strategy: options?.mode === "clean_replace" ? "replace" : "smart_append" },
					),
				);
				if (target.defaultIcd10) {
					setIcdSearch(target.defaultIcd10);
				}
				scheduleDebouncedSave();
				showToast(
					`Клинический шаблон «${target.label}» применён`,
					"success",
					4000,
				);
				return;
			}

			const soapFound = CLINICAL_SOAP_PRESETS.find((p) => p.id === presetId);
			if (soapFound) {
				const fullAnamnesis = [soapFound.complaint, soapFound.anamnesis]
					.filter(Boolean)
					.join("\n");
				let treatmentWithRecs = soapFound.treatmentDescription;
				if (soapFound.recommendations) {
					treatmentWithRecs += `\n\nРекомендации:\n${soapFound.recommendations}`;
				}
				const incomingPayload: Partial<DiaryState> = {};
				if (fullAnamnesis) incomingPayload.anamnesis = fullAnamnesis;
				if (soapFound.statusLocalis) incomingPayload.statusLocalis = soapFound.statusLocalis;
				if (soapFound.icd10) incomingPayload.diagnosisIcd10 = soapFound.icd10;
				if (treatmentWithRecs) incomingPayload.treatmentDescription = treatmentWithRecs;

				setDiary((prev) =>
					mergeSoapDiaryState(
						prev,
						incomingPayload,
						{ strategy: options?.mode === "clean_replace" ? "replace" : "smart_append" },
					),
				);
				if (soapFound.icd10) {
					setIcdSearch(soapFound.icd10);
				}
				scheduleDebouncedSave();
				showToast(
					`Клинический протокол «${soapFound.title}» применён`,
					"success",
					4000,
				);
				return;
			}

			const canonicalMatch =
				(CANONICAL_SOAP_TEMPLATES as Record<string, Template | undefined>)[presetId] ||
				Object.values(CANONICAL_SOAP_TEMPLATES).find((t) => t.id === presetId);
			if (canonicalMatch) {
				const incomingPayload: Partial<DiaryState> = {};
				if (canonicalMatch.prefilledAnamnesis) {
					incomingPayload.anamnesis = canonicalMatch.prefilledAnamnesis;
				}
				if (canonicalMatch.prefilledObjective) {
					incomingPayload.statusLocalis = canonicalMatch.prefilledObjective;
				}
				if (canonicalMatch.prefilledTreatment) {
					incomingPayload.treatmentDescription = canonicalMatch.prefilledTreatment;
				}
				if (canonicalMatch.defaultIcd10) {
					incomingPayload.diagnosisIcd10 = canonicalMatch.defaultIcd10;
				}
				setDiary((prev) =>
					mergeSoapDiaryState(
						prev,
						incomingPayload,
						{ strategy: options?.mode === "clean_replace" ? "replace" : "smart_append" },
					),
				);
				if (canonicalMatch.defaultIcd10) {
					setIcdSearch(canonicalMatch.defaultIcd10);
				}
				scheduleDebouncedSave();
				showToast(
					`Клинический протокол «${canonicalMatch.title}» применён`,
					"success",
					4000,
				);
			}
		},
		[isLocked, isRevising, scheduleDebouncedSave, diaryRef, setIsRevising, setReviseSnapshot, setReviseTraySnapshot, trayBarcodeRef, setRevisionReason, setDiary, setIcdSearch],
	);

	const apply1ClickAutopilot = useCallback(
		(
			presetId: string,
			options?: {
				toothNumber?: number | null;
				surfaces?: string;
				mode?: "clean_replace" | "smart_append";
			},
		) => {
			if (isLocked && !isRevising) {
				setIsRevising(true);
				setReviseSnapshot({ ...diaryRef.current });
				setReviseTraySnapshot(trayBarcodeRef.current);
				setRevisionReason("Исправленному верить (1-клик автопилот)");
				showToast(
					"Дневник визита открыт для внесения исправлений (1-клик автопилот применён)",
					"warning",
					4000,
				);
			}
			const result = apply1ClickClinicalAutopilot(presetId, {
				toothNumber: options?.toothNumber,
				surfaces: options?.surfaces,
				currentDiary: diaryRef.current,
				mode: options?.mode ?? "clean_replace",
			});
			setDiary(result.diary);
			if (result.preset.icd10) {
				setIcdSearch(result.preset.icd10);
			}
			scheduleDebouncedSave();
			showToast(
				`1-клик автопилот «${result.preset.shortBadge}» применён`,
				"success",
				4000,
			);
			return result;
		},
		[isLocked, isRevising, scheduleDebouncedSave, diaryRef, setIsRevising, setReviseSnapshot, setReviseTraySnapshot, trayBarcodeRef, setRevisionReason, setDiary, setIcdSearch],
	);

	/**
	 * 1-клик заполнение физиологической нормой по умолчанию (Мандат 8e п. 3).
	 * Врач правит только патологию!
	 * Если дневник закрыт, автоматически активирует режим ревизии («Исправленному верить»).
	 */
	const applySomaticNorm = useCallback(() => {
		if (isLocked && !isRevising) {
			beginRevise();
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
			"Физиологическая норма соматического статуса и осмотра внесена в дневник (1 клик)",
			"success",
			4000,
		);
	}, [isLocked, isRevising, beginRevise, scheduleDebouncedSave, setDiary]);

	return {
		applyOdontogramFinding,
		applySoapProtocol,
		populateFromOdontogram,
		pendingSoapSuggestion,
		applyPendingSoapSuggestion,
		dismissPendingSoapSuggestion,
		applyAnesthesiaPreset,
		applyClinicalPreset,
		apply1ClickAutopilot,
		applySomaticNorm,
	};
}
