/**
 * copilotDictationHandler.ts — Специализированный обработчик клинической диктовки
 * и свободного текста врача для Копайлота DENTE.
 * Мандаты 8b (декомпозиция), 8e (автономия), 8wy (честный продакшн).
 */

import { parseDentalVoiceSpeech, type DentalVoiceIntent } from "../../services/voice/dentalGrammarParser";
import { useVisitStore, type VisitToothUiState } from "../../store/visitStore";
import { toVisitToothUiState } from "../visit/toothSync/toothStateConverters";
import { loadStoredTeethData, saveStoredTeethData } from "../odontogram/odontogramStorage";
import type { ToothState } from "../odontogram/ToothChart";

export interface DictationProcessingResult {
	intent: DentalVoiceIntent;
	fallbackText: string;
	fallbackProposalTooth: number;
}

export function handleClinicalSpeechOrText(
	query: string,
	patientId?: string | null | undefined,
	activeTooth?: number | null | undefined,
): DictationProcessingResult {
	const intent = parseDentalVoiceSpeech(query);
	const targetNumbers =
		intent.teethUpdates.length > 0
			? intent.teethUpdates.map((u) => u.toothNumber)
			: intent.detectedTeeth;

	const isFullSanitation = /санирован|вся\s+формул|вся\s+полость|все\s+зубы\s+норм/i.test(query);
	if (isFullSanitation && targetNumbers.length === 0) {
		const ADULT_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48];
		const nextVisitStates: Record<string, VisitToothUiState> = {};
		for (const tNum of ADULT_TEETH) {
			const code = String(tNum);
			nextVisitStates[code] = "idle";
			useVisitStore.getState().setVisitToothRecord(code, {
				toothNumber: tNum,
				state: "idle",
				diagnosis: "Полость рта санирована (Z01.2)",
				diagnosisIcd10: "Z01.2",
				treatmentPlan: "Интактный зуб, норма",
			});
		}
		useVisitStore.getState().setVisitToothStateByCode((prev) => ({ ...prev, ...nextVisitStates }));

		if (patientId) {
			const nowIso = new Date().toISOString();
			const sanitizedTeeth = ADULT_TEETH.map((tNum) => ({
				toothNumber: tNum,
				state: "Healthy" as ToothState,
				updatedAt: nowIso,
			}));
			saveStoredTeethData(patientId, sanitizedTeeth, true);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-odontogram-update", {
						detail: { patientId, states: sanitizedTeeth, teeth: sanitizedTeeth },
					}),
				);
			}
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						tooth: 11,
						toothNumber: 11,
						state: "idle",
						diagnosis: "Полость рта санирована, зубы интактны (Z01.2)",
						diagnosisIcd10: "Z01.2",
						treatmentPlan: "Профилактический осмотр. Полость рта санирована, патологий не выявлено. Контрольный осмотр через 6 месяцев.",
					},
				}),
			);
		}

		return {
			intent,
			fallbackText: "Вся полость рта санирована. Все 32 зуба зафиксированы как интактные (норма). Дневник приёма обновлен.",
			fallbackProposalTooth: 11,
		};
	}

	if (
		targetNumbers.length > 0 ||
		intent.teethUpdates.length > 0 ||
		intent.procedures804n.length > 0 ||
		intent.anesthesia
	) {
		const nextVisitStates: Record<string, VisitToothUiState> = {};

		for (const tNum of targetNumbers) {
			const u = intent.teethUpdates.find((item) => item.toothNumber === tNum);
			const canonicalState = u ? u.state : ("Caries" as ToothState);
			const uiState = toVisitToothUiState(canonicalState);
			const code = String(tNum);
			nextVisitStates[code] = uiState;
			useVisitStore.getState().setVisitToothRecord(code, {
				toothNumber: tNum,
				state: uiState,
				diagnosis: u?.icd10Title || "Кариес дентина (K02.1)",
				diagnosisIcd10: u?.icd10Code || "K02.1",
				treatmentPlan: u?.subType
					? `Лечение: ${u.subType}`
					: "Препарирование полости, пломбирование нанокомпозитом",
			});
		}

		if (Object.keys(nextVisitStates).length > 0) {
			useVisitStore
				.getState()
				.setVisitToothStateByCode((prev) => ({ ...prev, ...nextVisitStates }));
		}

		// Сохраняем в одонтограмму пациента
		if (patientId) {
			const currentTeeth = loadStoredTeethData(patientId) || [];
			const updatedTeeth = [...currentTeeth];
			const nowIso = new Date().toISOString();

			for (const tNum of targetNumbers) {
				const u = intent.teethUpdates.find((tu) => tu.toothNumber === tNum);
				const st = u ? u.state : ("Caries" as ToothState);
				const idx = updatedTeeth.findIndex((t) => t.toothNumber === tNum);
				if (idx >= 0 && updatedTeeth[idx]) {
					updatedTeeth[idx] = {
						...updatedTeeth[idx],
						toothNumber: tNum,
						state: st,
						surfaces: u?.surfaces || updatedTeeth[idx].surfaces,
						updatedAt: nowIso,
					};
				} else {
					updatedTeeth.push({
						toothNumber: tNum,
						state: st,
						surfaces: u?.surfaces,
						updatedAt: nowIso,
					});
				}
			}
			saveStoredTeethData(patientId, updatedTeeth, true);

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-odontogram-update", {
						detail: { patientId, states: updatedTeeth, teeth: updatedTeeth },
					}),
				);
			}
		}

		// Диспатчим SOAP протокол и услуги в смету
		if (typeof window !== "undefined") {
			for (const tNum of targetNumbers) {
				const u = intent.teethUpdates.find((tu) => tu.toothNumber === tNum);
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							tooth: tNum,
							toothNumber: tNum,
							state: u?.state || "caries",
							diagnosis: u?.icd10Title || "Кариес дентина (K02.1)",
							diagnosisIcd10: u?.icd10Code || "K02.1",
							treatmentPlan: intent.summary || "Лечение по стандартам СтАР",
							soapNotes: intent.soapNotes,
							anesthesia: intent.anesthesia,
						},
					}),
				);
			}
			if (targetNumbers.length === 0) {
				const fallbackTooth = typeof activeTooth === "number" ? activeTooth : 36;
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							tooth: fallbackTooth,
							toothNumber: fallbackTooth,
							state: intent.teethUpdates[0]?.state || "caries",
							diagnosis: intent.teethUpdates[0]?.icd10Title || "Кариес дентина (K02.1)",
							diagnosisIcd10: intent.teethUpdates[0]?.icd10Code || "K02.1",
							treatmentPlan: intent.summary || "Лечение по стандартам СтАР",
							soapNotes: intent.soapNotes,
							anesthesia: intent.anesthesia,
						},
					}),
				);
			}

			const firstTooth = targetNumbers[0] || (typeof activeTooth === "number" ? activeTooth : 36);
			const billableServices = [];
			if (intent.procedures804n && intent.procedures804n.length > 0) {
				for (const p of intent.procedures804n) {
					billableServices.push({
						code: p.code804n,
						code804n: p.code804n,
						name: p.name,
						title: p.name,
						price: p.priceRub || 1500,
						priceRub: p.priceRub || 1500,
						toothNumber: p.toothNumber || firstTooth,
						toothCode: String(p.toothNumber || firstTooth),
					});
				}
			}
			if (intent.anesthesia) {
				billableServices.push({
					code: intent.anesthesia.code804n || "A11.07.012",
					name: `Анестезия: ${intent.anesthesia.displayName}`,
					title: `Анестезия: ${intent.anesthesia.displayName}`,
					price: 900,
					priceRub: 900,
					toothNumber: firstTooth,
					toothCode: String(firstTooth),
				});
			}
			if (billableServices.length > 0) {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							patientId: patientId || undefined,
							services: billableServices,
							items: billableServices,
						},
					}),
				);
			}
		}
	}

	const targetSummaryTeeth =
		targetNumbers.length > 0 ? targetNumbers.join(", ") : (activeTooth || 36);
	const fallbackText =
		targetNumbers.length > 0
			? `Клиническая диктовка принята (${query}). Зафиксированы зубы: ${targetSummaryTeeth}. Сформирован проект дневника приёма SOAP и расчет сметы по протоколам СтАР.`
			: `Клинический протокол для зуба ${activeTooth || 36}: проведена оценка статуса, сформирован проект протокола приёма и сметы по стандартам СтАР.`;
	const fallbackProposalTooth =
		targetNumbers[0] || Number(activeTooth || 36);

	return {
		intent,
		fallbackText,
		fallbackProposalTooth,
	};
}
