/**
 * apps/web/src/components/visit/anamnesisTab/useAnamnesisAutosave.ts
 *
 * Debounced автосохранение черновика анамнеза и синхронизация с ЭМК пациента (Мандаты 8e, 8k).
 */

import { useCallback, useEffect, useRef } from "react";
import { type AnamnesisDraftPayload, saveAnamnesisDraft } from "./anamnesisDraftStorage";

export interface SyncAnamnesisParams {
	allergiesMap: Record<string, string>;
	risksList: string[];
	antiName: string;
	bisName: string;
	pregTrim: string;
	historyList: string[];
	complaintsList: string[];
	notesText: string;
}

export function formatAnamnesisStrings(p: SyncAnamnesisParams) {
	const allergyEntries = Object.entries(p.allergiesMap).map(
		([allergen, reaction]) => `${allergen} (${reaction})`,
	);
	const formattedAllergies = allergyEntries.length > 0 ? allergyEntries.join(", ") : "Аллергии не выявлены";

	const somaticParts = [...p.risksList];
	if (p.risksList.includes("Приём антикоагулянтов") && p.antiName.trim()) somaticParts.push(`Препарат: ${p.antiName.trim()}`);
	if (p.risksList.includes("Приём бисфосфонатов") && p.bisName.trim()) somaticParts.push(`Препарат: ${p.bisName.trim()}`);
	if (p.risksList.includes("Беременность / Лактация")) {
		const labels: Record<string, string> = { trimester_1: "1-й триместр", trimester_2: "2-й триместр", trimester_3: "3-й триместр", lactation: "Период лактации" };
		somaticParts.push(labels[p.pregTrim] || "2-й триместр");
	}

	const cleanSomatic = (somaticParts.length > 0 ? somaticParts.join(", ") : "Соматически здоров. Норма").trim().replace(/\.+$/, "");
	const formattedSomatic = cleanSomatic ? `${cleanSomatic}.` : "Соматически здоров. Норма.";

	const parts: string[] = [];
	if (p.complaintsList.length > 0) parts.push(`Жалобы: ${p.complaintsList.join(", ").trim().replace(/\.+$/, "")}.`);
	parts.push(`Аллергоанамнез: ${formattedAllergies.trim().replace(/\.+$/, "")}.`);
	parts.push(`Соматический статус: ${cleanSomatic}.`);
	if (p.historyList.length > 0) parts.push(`Стоматологический анамнез: ${p.historyList.join(", ").trim().replace(/\.+$/, "")}.`);
	if (p.notesText.trim()) parts.push(`Примечания: ${p.notesText.trim().replace(/\.+$/, "")}.`);

	return { formattedAllergies, formattedSomatic, fullAnamnesisText: parts.join(" ") };
}

export function useAnamnesisAutosave(
	storageKey: string,
	currentPayload: AnamnesisDraftPayload,
	// biome-ignore lint/suspicious/noExplicitAny: AppLogic Context
	appLogic: any,
) {
	const stateRef = useRef(currentPayload);
	useEffect(() => {
		stateRef.current = currentPayload;
	}, [currentPayload]);

	const syncWithPatient = useCallback((payload: AnamnesisDraftPayload) => {
		try {
			const { formattedAllergies, formattedSomatic, fullAnamnesisText } = formatAnamnesisStrings({
				allergiesMap: payload.selectedAllergies,
				risksList: payload.selectedRisks,
				antiName: payload.anticoagulantName,
				bisName: payload.bisphosphonateName,
				pregTrim: payload.pregnancyTrimester,
				historyList: payload.selectedHistory,
				complaintsList: payload.selectedComplaints,
				notesText: payload.customNotes,
			});

			const curPat = appLogic?.activePatient;
			if (curPat) {
				curPat.allergies = formattedAllergies;
				curPat.somaticNotes = formattedSomatic;
				const allPatients = appLogic?.dashboard?.patients;
				if (Array.isArray(allPatients)) {
					const match = allPatients.find((p: any) => p.id === curPat.id);
					if (match) {
						match.allergies = formattedAllergies;
						match.somaticNotes = formattedSomatic;
					}
				}
			}

			if (appLogic?.updateVisitNoteField) {
				appLogic.updateVisitNoteField("anamnesis", fullAnamnesisText);
				if (payload.selectedComplaints.length > 0) {
					appLogic.updateVisitNoteField("complaint", payload.selectedComplaints.join(", "));
				}
			}
		} catch {
			// Silent safety
		}
	}, [appLogic]);

	useEffect(() => {
		const timer = setTimeout(() => {
			saveAnamnesisDraft(storageKey, currentPayload);
			syncWithPatient(currentPayload);
		}, 300);
		return () => clearTimeout(timer);
	}, [storageKey, currentPayload, syncWithPatient]);

	useEffect(() => {
		return () => {
			saveAnamnesisDraft(storageKey, stateRef.current);
		};
	}, [storageKey]);

	return { syncWithPatient };
}
