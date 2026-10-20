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
import { denteAdminSecretRequestHeaders } from "../../../../AppHelpers";
import { logger } from "../../../../utils/logger";
import { toCanonicalDbToothState } from "../../../../utils/dentalFormulaFdi";

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
			const current = ((visitNoteForm as unknown) as Record<string, string | undefined>)?.[field] || "";
			updateVisitNoteField(field, current ? `${current}\n${text}` : text);
		}
	}, [updateVisitNoteField, visitNoteForm]);

	const handleToothClick = useCallback((code: string, currentState: string) => {
		const num = Number(code) || null;
		useVisitStore.getState().setActiveToothNumber(num);
		if (activeStamp && activeStamp !== "idle") {
			setToothState(code, activeStamp);
			if (activePatient?.id && num && Number.isFinite(num)) {
				const canonicalState = toCanonicalDbToothState(activeStamp);
				fetch(`/api/patients/${activePatient.id}/tooth-states/batch`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						toothNumbers: [num],
						state: canonicalState,
					}),
				}).catch((err) => {
					logger.warn("[useVisitToothHandlers] Stamp batch sync failed:", err);
				});
			}
		} else {
			setSelectedToothForMenu({ code, state: currentState });
		}
	}, [activeStamp, setToothState, setSelectedToothForMenu, activePatient]);

	useEffect(() => {
		const handleToothStateUpdate = (e: Event) => {
			const detail = (e as CustomEvent<{ toothNumber: number | string; state: string }>).detail;
			if (detail?.toothNumber && detail?.state && typeof setToothState === "function") {
				setToothState(String(detail.toothNumber), detail.state);
			}
		};
		const handleOpenToothClinicalModal = (e: Event) => {
			const detail = (e as CustomEvent<{ toothNumber?: number | string; code?: string; state?: string }>).detail;
			if (detail) {
				const code = String(detail.code || detail.toothNumber || "");
				if (code) {
					const num = Number(code) || null;
					useVisitStore.getState().setActiveToothNumber(num);
					setSelectedToothForMenu({
						code,
						state: detail.state || (toothStateByCode as Record<string, string>)?.[code] || "Healthy",
					});
				}
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
				fetch(`/api/patients/${activePatient.id}/tooth-states/batch`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						toothNumbers: [toothNum],
						state: canonicalState,
						surfaces: selectedSurfaces.length > 0 ? selectedSurfaces : undefined,
					}),
				}).catch((err) => {
					logger.warn("[useVisitToothHandlers] Background tooth-state batch sync failed:", err);
				});
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
