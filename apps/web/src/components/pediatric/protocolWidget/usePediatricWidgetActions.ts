import { useCallback } from "react";
import { generateUuidV7, type FranklRating } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import { FRANKL_EXPRESS_ITEMS, PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION } from "./constants";
import type { ClinicalCalculationResult } from "./protocolCalculation";
import { buildPhysiologicalNormClinicalNoteText } from "./protocolCalculation";
import { dispatchAddServicesToInvoice, dispatchApplySoapProtocol, updateVisitNoteStore } from "./pediatricWidgetDispatch";
import type { PediatricProtocolDefinition, VisitPediatricProtocolWidgetProps } from "./types";
import type { usePediatricWidgetState } from "./usePediatricWidgetState";

export function usePediatricWidgetActions(
	state: ReturnType<typeof usePediatricWidgetState>,
	props: VisitPediatricProtocolWidgetProps,
	clinicalCalculation: ClinicalCalculationResult,
) {
	const { onSelectSurfaces, onFranklChange, onApplyProtocolText, onAddToInvoice } = props;

	const handleSelectFrankl = useCallback((rating: FranklRating) => {
		state.setFranklRating(rating);
		onFranklChange?.(rating);
		const item = FRANKL_EXPRESS_ITEMS.find((f) => f.rating === rating);
		if (item) showToast(`Шкала Франкла: ${item.titleRu}`, "info", 2000);
	}, [onFranklChange, state]);
	const handleCycleFrankl = useCallback(() => handleSelectFrankl(state.franklRating >= 4 ? 1 : ((state.franklRating + 1) as FranklRating)), [handleSelectFrankl, state.franklRating]);

	const toggleSurface = useCallback((surf: string) => {
		state.setSelectedSurfaces((prev) => {
			const next = prev.includes(surf) ? prev.filter((s) => s !== surf) : [...prev, surf];
			const sanitized = next.length > 0 ? next : ["O"];
			onSelectSurfaces?.(sanitized);
			return sanitized;
		});
	}, [onSelectSurfaces, state]);

	const handleApplySurfacePreset = useCallback((surfs: readonly string[]) => {
		const next = [...surfs];
		state.setSelectedSurfaces(next);
		onSelectSurfaces?.(next);
	}, [onSelectSurfaces, state]);

	const handleSelectPreset = useCallback((preset: PediatricProtocolDefinition) => {
		state.setActivePresetId(preset.id);
		state.setSelectedMaterial(preset.defaultMaterial);
		if (preset.defaultSurfaces.length > 0) {
			state.setSelectedSurfaces([...preset.defaultSurfaces]);
			onSelectSurfaces?.([...preset.defaultSurfaces]);
		}
		showToast(`Протокол: «${preset.titleRu}»`, "info", 2000);
	}, [onSelectSurfaces, state]);

	const handleSignInformedConsent = useCallback(async () => {
		const updatedRep = { ...state.representative, consentSigned: true, statutoryDocument: "Законный представитель (родитель / опекун)" };
		state.setRepresentative(updatedRep);
		showToast("Согласие законного представителя подтверждено", "success", 2500);

		if (props.patientId && updatedRep.fullName.trim()) {
			try {
				const idempotencyKey = generateUuidV7();
				const res = await fetch(`/api/patients/${props.patientId}/pediatric/legal-representative`, {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
					}),
					credentials: "include",
					body: JSON.stringify({
						fullName: updatedRep.fullName.trim(),
						phone: updatedRep.phone.trim() || undefined,
						role: updatedRep.role,
						consentSigned: true,
						statutoryDocument: updatedRep.statutoryDocument,
					}),
				});
				if (!res.ok) {
					clientLogger.warn("Failed to sync legal representative to server", { status: res.status }, { module: "usePediatricWidgetActions" });
					showToast("Не удалось синхронизировать согласие представителя с сервером", "warning");
				}
			} catch (err) {
				clientLogger.warn("Failed to sync legal representative to server", err, { module: "usePediatricWidgetActions" });
				showToast("Не удалось синхронизировать согласие представителя с сервером", "warning");
			}
		}
	}, [props.patientId, state]);

	const handleInsertToClinicalNote = useCallback(() => {
		if (state.anesthesiaCalculation?.isOverdose) {
			showToast(`Внимание: доза анестетика (${state.anesthesiaCalculation.totalDoseAdministeredMg} мг) превышает МРД (${state.anesthesiaCalculation.maxAllowedTotalDoseMg} мг)!`, "warning", 5000);
		}
		const textToApply = clinicalCalculation.fullClinicalNoteText;
		onApplyProtocolText?.(textToApply);
		state.setToothFindings((prev) => ({ ...prev, [state.currentTooth]: clinicalCalculation.toothFindingState }));
		if (state.activePresetId === "extraction_primary_exfoliation") {
			state.setResorptionStages((prev) => ({ ...prev, [state.currentTooth]: 100 }));
		}
		updateVisitNoteStore(textToApply);
		dispatchApplySoapProtocol(clinicalCalculation, state.currentTooth, state.selectedSurfaces);

		if (props.patientId && state.representative.fullName.trim()) {
			try {
				const idempotencyKey = generateUuidV7();
				void fetch(`/api/patients/${props.patientId}/pediatric/legal-representative`, {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
					}),
					credentials: "include",
					body: JSON.stringify({
						fullName: state.representative.fullName.trim(),
						phone: state.representative.phone.trim() || undefined,
						role: state.representative.role,
						consentSigned: state.representative.consentSigned,
						statutoryDocument: state.representative.statutoryDocument,
					}),
				})
					.then((res) => {
						if (!res.ok) {
							clientLogger.warn("Background legal representative sync returned error", { status: res.status }, { module: "usePediatricWidgetActions" });
							showToast("Не удалось синхронизировать данные представителя с сервером", "warning");
						}
					})
					.catch((err) => {
						clientLogger.warn("Background legal representative sync warning", err, { module: "usePediatricWidgetActions" });
						showToast("Не удалось синхронизировать данные представителя с сервером", "warning");
					});
			} catch (err) {
				clientLogger.warn("Legal representative note sync error", err, { module: "usePediatricWidgetActions" });
				showToast("Не удалось синхронизировать данные представителя с сервером", "warning");
			}
		}

		showToast(`Детский протокол зуба ${state.currentTooth} внесен в медицинскую карту`, "success", 3000);
	}, [clinicalCalculation, onApplyProtocolText, props.patientId, state]);

	const handleAddServicesToInvoice = useCallback(() => {
		onAddToInvoice?.(clinicalCalculation.services);
		dispatchAddServicesToInvoice(state.currentTooth, clinicalCalculation.services);
		showToast(`Услуги добавлены в смету (${clinicalCalculation.services.map((s) => s.code).join(", ")})`, "success", 2500);
	}, [clinicalCalculation, onAddToInvoice, state.currentTooth]);

	const handleApplyPhysiologicalNorm = useCallback(() => {
		state.setFranklRating(4);
		onFranklChange?.(4);
		state.setOrthoFrenulumNormal(true); state.setOrthoNasalBreathing(true); state.setOrthoNoHarmfulHabits(true);
		const fullText = buildPhysiologicalNormClinicalNoteText();
		onApplyProtocolText?.(fullText);
		updateVisitNoteStore(fullText);
		state.setToothFindings({}); state.setResorptionStages({});
		showToast("Физиологическая норма временного прикуса внесена в карту", "success", 3500);
	}, [onApplyProtocolText, onFranklChange, state]);

	const handleApplyPhysiologicalResorptionNorm = useCallback(() => {
		state.setDentitionMode("mixed");
		state.setResorptionStages((prev) => ({ ...prev, 71: 75, 72: 50, 81: 75, 82: 50, 51: 50, 61: 50 }));
		const resorptionNote = "Смена прикуса по возрасту. Физиологическая резорбция корней (K08.8): 71, 81 (75%), 51, 61, 72, 82 (50%). Зачатки постоянных зубов без патологии.";
		onApplyProtocolText?.(resorptionNote);
		updateVisitNoteStore(resorptionNote);
		showToast("Физиологическая резорбция корней (K08.8) внесена в карту", "success", 3000);
	}, [onApplyProtocolText, state]);

	const handleApplyAdaptationVisit = useCallback(() => {
		state.setFranklRating(3);
		onFranklChange?.(3);
		state.setOrthoFrenulumNormal(true); state.setOrthoNasalBreathing(true); state.setOrthoNoHarmfulHabits(true);
		const fullText = "Адаптационный визит (Tell-Show-Do, игра, подарок, без сверления)";
		onApplyProtocolText?.(fullText);
		updateVisitNoteStore(fullText);
		showToast("Адаптационный визит внесен в карту", "success", 3000);
	}, [onApplyProtocolText, onFranklChange, state]);

	const handleApplyMixedDentitionPreset = useCallback(() => {
		state.setDentitionMode("mixed");
		state.setToothFindings((prev) => ({ ...prev, 16: "Healthy", 26: "Healthy", 36: "Healthy", 46: "Healthy", 71: "Extracted", 81: "Extracted" }));
		state.setResorptionStages((prev) => ({ ...prev, 71: 100, 81: 100 }));
		showToast("Сменный прикус применён (16, 26, 36, 46 интактны, 71, 81 смена)", "success", 3000);
	}, [state]);

	return {
		handleSelectFrankl, handleCycleFrankl, toggleSurface, handleApplySurfacePreset,
		handleSelectPreset, handleSignInformedConsent,
		handleInsertToClinicalNote, handleAddServicesToInvoice, handleApplyPhysiologicalNorm,
		handleApplyPhysiologicalResorptionNorm, handleApplyAdaptationVisit, handleApplyMixedDentitionPreset,
	};
}
