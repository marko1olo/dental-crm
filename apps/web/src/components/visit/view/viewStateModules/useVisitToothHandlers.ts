/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Odontogram & Tooth Selection Handlers Hook
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Обработчики кликов по зубам, выбора поверхностей, диагнозов и моста в EMK.
 */

import { useCallback, useEffect } from "react";
import { useVisitStore } from "../../../../store/visitStore";
import {
	mergeMultiToothDiagnoses,
	mergeMultiToothTreatmentPlan,
} from "../../../../utils/clinicalTextSanitizer";
import {
	loadStoredTeethData,
	saveStoredTeethData,
} from "../../../odontogram/odontogramStorage";
import { dispatchOdontogramSoapAndBundle } from "../../../odontogram/odontogramModuleConstants";
import type { ToothData, ToothState } from "../../../odontogram/ToothChart";
import type { VisitToothUiState } from "../../../../store/visit/types";
import type { VisitViewProps } from "../types";
import { denteClinicalMutationHeaders } from "../../../../lib/denteRequestHeaders";
import { logger } from "../../../../utils/logger";
import { toCanonicalDbToothState } from "../../../../utils/dentalFormulaFdi";
import { triggerHaptic } from "../../../../native/mobileBridge";

function createMutationIdempotencyKey(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `tooth-batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function persistToothStateBatch(
	patientId: string,
	payload: {
		toothNumbers: number[];
		state: string;
		surfaces?: string[];
		resorptionStage?: string | number | undefined;
		mobility?: number | undefined;
		mobilityDegree?: number | undefined;
	},
	contextLabel: string,
): Promise<void> {
	try {
		const res = await fetch(`/api/patients/${patientId}/tooth-states/batch`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteClinicalMutationHeaders({ "Idempotency-Key": createMutationIdempotencyKey() }),
			},
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			logger.warn(`[useVisitToothHandlers] ${contextLabel} returned HTTP ${res.status}`);
		}
	} catch (err: unknown) {
		logger.warn(`[useVisitToothHandlers] ${contextLabel} failed:`, err);
	}
}

export interface UseVisitToothHandlersParams {
	activePatient: VisitViewProps["activePatient"];
	toothStateByCode: VisitViewProps["toothStateByCode"];
	setToothState: VisitViewProps["setToothState"];
	visitNoteForm: VisitViewProps["visitNoteForm"];
	updateVisitNoteField: VisitViewProps["updateVisitNoteField"];
	activeStamp: string;
	selectedToothForMenu: { code: string; label?: string; state?: string } | null;
	setSelectedToothForMenu: (v: { code: string; label?: string; state?: string } | null) => void;
	selectedSurfaces: string[];
	setSelectedSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useVisitToothHandlers({
	activePatient,
	toothStateByCode,
	setToothState,
	visitNoteForm,
	updateVisitNoteField,
	activeStamp,
	selectedToothForMenu,
	setSelectedToothForMenu,
	selectedSurfaces,
	setSelectedSurfaces,
}: UseVisitToothHandlersParams) {
	const appendToEMKField = useCallback((field: string, text: string) => {
		if (typeof updateVisitNoteField === "function") {
			const rawValue = visitNoteForm?.[field];
			const current = typeof rawValue === "string" ? rawValue : "";
			updateVisitNoteField(field, current ? `${current}\n${text}` : text);
		}
	}, [updateVisitNoteField, visitNoteForm]);

	useEffect(() => {
		const handleInsert = (e: Event) => {
			const detail = e instanceof CustomEvent && typeof e.detail === "object" && e.detail !== null ? e.detail : null;
			const text = detail && "text" in detail && typeof detail.text === "string" ? detail.text : "";
			if (text) {
				appendToEMKField("recommendations", text);
			}
		};
		window.addEventListener("dente:insert-prescription-to-diary", handleInsert);
		return () =>
			window.removeEventListener("dente:insert-prescription-to-diary", handleInsert);
	}, [appendToEMKField]);

	const handleToothClick = useCallback((code: string, currentState: string) => {
		triggerHaptic("light");
		const num = Number(code) || null;
		useVisitStore.getState().setActiveToothNumber(num);
		if (activeStamp && activeStamp !== "idle") {
			setToothState(code, activeStamp);
			if (activePatient?.id && num && Number.isFinite(num)) {
				const canonicalState = toCanonicalDbToothState(activeStamp);
				const existingTeeth = loadStoredTeethData(activePatient.id) ?? [];
				const cachedTooth = existingTeeth.find((t) => t.toothNumber === num);
				void persistToothStateBatch(
					activePatient.id,
					{
						toothNumbers: [num],
						state: canonicalState,
						...(cachedTooth?.rootResorptionStage !== undefined
							? { resorptionStage: cachedTooth.rootResorptionStage }
							: cachedTooth?.rootResorption !== undefined
								? { resorptionStage: cachedTooth.rootResorption }
								: {}),
						...(cachedTooth?.mobility !== undefined
							? { mobility: cachedTooth.mobility, mobilityDegree: cachedTooth.mobility }
							: {}),
					},
					"Stamp batch sync",
				);
			}
		} else {
			setSelectedToothForMenu({ code, state: currentState });
		}
	}, [activeStamp, setToothState, setSelectedToothForMenu, activePatient]);

	useEffect(() => {
		const handleToothStateUpdate = (e: Event) => {
			if (!(e instanceof CustomEvent) || typeof e.detail !== "object" || e.detail === null) return;
			const detail: Record<string, unknown> = e.detail;
			const toothNumber = detail.toothNumber;
			const state = detail.state;
			if ((typeof toothNumber === "string" || typeof toothNumber === "number") && typeof state === "string" && typeof setToothState === "function") {
				setToothState(String(toothNumber), state);
			}
		};
		const handleOpenToothClinicalModal = (e: Event) => {
			if (!(e instanceof CustomEvent) || typeof e.detail !== "object" || e.detail === null) return;
			const detail: Record<string, unknown> = e.detail;
			const rawCode = detail.code ?? detail.toothNumber;
			const code = typeof rawCode === "string" || typeof rawCode === "number" ? String(rawCode) : "";
			if (code) {
				const num = Number(code) || null;
				useVisitStore.getState().setActiveToothNumber(num);
				const stateStr = typeof detail.state === "string" ? detail.state : undefined;
				setSelectedToothForMenu({
					code,
					state: stateStr || toothStateByCode?.[code] || "Healthy",
				});
			}
		};
		window.addEventListener("dente-update-tooth-state", handleToothStateUpdate);
		window.addEventListener("dente-open-tooth-clinical-modal", handleOpenToothClinicalModal);
		return () => {
			window.removeEventListener("dente-update-tooth-state", handleToothStateUpdate);
			window.removeEventListener("dente-open-tooth-clinical-modal", handleOpenToothClinicalModal);
		};
	}, [setToothState, toothStateByCode, setSelectedToothForMenu]);

	const handleToothDiagnosisSelect = useCallback((state: string, text?: string, field?: string) => {
		triggerHaptic("selection");
		if (selectedToothForMenu?.code) {
			const toothNum = Number.parseInt(selectedToothForMenu.code, 10);
			const cavityStr = selectedSurfaces.length > 0 ? selectedSurfaces.join("") : undefined;
			useVisitStore.getState().pushVisitSnapshot(`Зуб ${selectedToothForMenu.code}: ${state}`);
			setToothState(selectedToothForMenu.code, state as ToothState);

			useVisitStore.getState().setVisitToothRecord(selectedToothForMenu.code, {
				toothNumber: toothNum,
				state: state as VisitToothUiState,
				surfaces: selectedSurfaces,
				...(cavityStr ? { cavity: cavityStr } : {}),
				...(field === "diagnosis" && text ? { diagnosis: text } : {}),
			});

			if (activePatient?.id && Number.isFinite(toothNum)) {
				const existingTeeth = loadStoredTeethData(activePatient.id) ?? [];
				const updatedTeeth: ToothData[] = [...existingTeeth];
				const idx = updatedTeeth.findIndex((t) => t.toothNumber === toothNum);
				const nowIso = new Date().toISOString();
				const surfacesProp = selectedSurfaces.length > 0 ? { surfaces: selectedSurfaces } : {};
				if (idx >= 0 && updatedTeeth[idx]) {
					updatedTeeth[idx] = { ...updatedTeeth[idx], toothNumber: toothNum, state: state as ToothState, ...surfacesProp, updatedAt: nowIso };
				} else {
					updatedTeeth.push({ toothNumber: toothNum, state: state as ToothState, ...surfacesProp, updatedAt: nowIso });
				}
				saveStoredTeethData(activePatient.id, updatedTeeth, true);

				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-odontogram-update", {
							detail: { patientId: activePatient.id, states: updatedTeeth, teeth: updatedTeeth },
						}),
					);
				}

				dispatchOdontogramSoapAndBundle({
					targets: [toothNum],
					state: state as ToothState,
					findings: [{ toothNumber: toothNum, state: state as ToothState, ...surfacesProp }],
					patientId: activePatient.id,
				});

				// Async background persist to PostgreSQL with surfaces MODPV
				const canonicalState = toCanonicalDbToothState(state);
				const targetTooth = idx >= 0 ? updatedTeeth[idx] : undefined;
				void persistToothStateBatch(
					activePatient.id,
					{
						toothNumbers: [toothNum],
						state: canonicalState,
						...(selectedSurfaces.length > 0 ? { surfaces: selectedSurfaces } : {}),
						...(targetTooth?.rootResorptionStage !== undefined
							? { resorptionStage: targetTooth.rootResorptionStage }
							: targetTooth?.rootResorption !== undefined
								? { resorptionStage: targetTooth.rootResorption }
								: {}),
						...(targetTooth?.mobility !== undefined
							? { mobility: targetTooth.mobility, mobilityDegree: targetTooth.mobility }
							: {}),
					},
					"Background tooth-state batch sync",
				);
			}

			if (text && field) {
				if (field === "diagnosis") {
					const nextDiag = mergeMultiToothDiagnoses(visitNoteForm?.diagnosis || "", {
						toothNumber: toothNum,
						diagnosis: text,
						cavity: cavityStr,
					});
					updateVisitNoteField("diagnosis", nextDiag);
				} else if (field === "treatmentPlan") {
					const planText = cavityStr ? `${text} (полость ${cavityStr})` : text;
					const nextPlan = mergeMultiToothTreatmentPlan(visitNoteForm?.treatmentPlan || "", {
						toothNumber: toothNum,
						content: planText,
					});
					updateVisitNoteField("treatmentPlan", nextPlan);
				} else {
					appendToEMKField(field, `Зуб ${selectedToothForMenu.code}: ${text}`);
				}
			}
		}
		setSelectedSurfaces([]);
		setSelectedToothForMenu(null);
	}, [selectedToothForMenu, selectedSurfaces, setToothState, activePatient, visitNoteForm, updateVisitNoteField, appendToEMKField, setSelectedSurfaces, setSelectedToothForMenu]);

	const handleSelectSurface = useCallback((surf: string) => {
		setSelectedSurfaces((prev) =>
			prev.includes(surf) ? prev.filter((s) => s !== surf) : [...prev, surf],
		);
	}, [setSelectedSurfaces]);

	return {
		appendToEMKField,
		handleToothClick,
		handleToothDiagnosisSelect,
		handleSelectSurface,
	};
}
