import React from "react";
import { showToast } from "../../GlobalToast";
import type { VisitEmkCanvasProps } from "./types";
import {
	buildPatientPreviousVisitsEndoIndex,
	getUnfinishedEndoSnapshot,
	transformEndoStage1ToStage2,
	type LastVisitSoapSnapshot,
} from "../../../lib/clinicalProtocols043";
import { useVisitStore } from "../../../store/visitStore";
import { playTactileEarcon } from "../../../lib/intercomSound";
import { VisitEmkSomaticSummaryBar } from "./canvasModules/VisitEmkSomaticSummaryBar";
import { VisitEmkInteractiveStage } from "./canvasModules/VisitEmkInteractiveStage";

export type { VisitEmkCanvasProps };
export * from "./canvasModules/visitEmkCanvasTypes";

export function VisitEmkCanvas({
	activeEmkTab,
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	effectiveActiveTooth,
	activePatient,
	dashboard,
	openVisitId,
	setIsSoapTemplatesModalOpen,
	handleCompleteVisitAndGenerateReceipt,
	isCompletingVisit,
	onApplySoapPreset,
}: VisitEmkCanvasProps) {
	const visitToothStateByCode = useVisitStore((s) => s.visitToothStateByCode);
	const visitToothRecordsByCode = useVisitStore((s) => s.visitToothRecordsByCode);

	const endoHistoryIndex = React.useMemo(() => {
		return buildPatientPreviousVisitsEndoIndex({
			patientId: activePatient?.id,
			appointments: dashboard?.appointments,
			dashboard,
			storedTeeth: dashboard?.storedTeeth ?? dashboard?.teeth,
			toothStates: visitToothStateByCode,
			toothRecords: visitToothRecordsByCode,
			activeVisitId: openVisitId,
		});
	}, [
		activePatient?.id,
		dashboard?.appointments,
		dashboard?.storedTeeth,
		dashboard?.teeth,
		dashboard,
		visitToothStateByCode,
		visitToothRecordsByCode,
		openVisitId,
	]);

	const activeToothEndoSnapshot = React.useMemo(() => {
		return getUnfinishedEndoSnapshot(
			activePatient?.id,
			effectiveActiveTooth,
			endoHistoryIndex,
		);
	}, [activePatient?.id, effectiveActiveTooth, endoHistoryIndex]);

	const handleContinueEndoStage = React.useCallback(
		(snapshot: LastVisitSoapSnapshot) => {
			useVisitStore.getState().pushVisitSnapshot(
				`Продолжение эндодонтического лечения зуба ${snapshot.toothNumber} (Этап 2)`,
			);

			const serviceCatalog =
				dashboard?.serviceCatalog ??
				dashboard?.services ??
				dashboard?.priceList ??
				[];

			const result = transformEndoStage1ToStage2({
				snapshot,
				toothNumber: snapshot.toothNumber,
				serviceCatalog,
				currentDiary: visitNoteForm as any,
			});

			// 1. Анамнез заболевания, диагноз, жалобы, осмотр, протокол Формы 043/у
			updateVisitNoteField("diagnosis", result.soap.diagnosis);
			updateVisitNoteField("anamnesis", result.soap.anamnesis);
			updateVisitNoteField("complaint", result.soap.complaints);
			updateVisitNoteField("complaints", result.soap.complaints);
			updateVisitNoteField("objectiveStatus", result.soap.objectiveStatus);
			updateVisitNoteField("treatmentPlan", result.soap.treatmentPlan);
			updateVisitNoteField("recommendations", result.soap.recommendations);

			// 2. Смета 804н: замена услуги 1-го этапа на услуги 2-го этапа
			window.dispatchEvent(
				new CustomEvent("dente-remove-billing-items", {
					detail: {
						items: result.servicesToRemove.map((s) => s.code804n),
					},
				}),
			);

			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						services: result.servicesToAdd,
					},
				}),
			);

			// 3. Реактивное обновление одонтограммы в useVisitStore
			useVisitStore.getState().setVisitToothRecord(String(result.toothNumber), {
				toothNumber: result.toothNumber,
				state: result.targetToothState,
				diagnosis: result.soap.diagnosis,
				treatmentPlan: result.soap.treatmentPlan,
				services: result.servicesToAdd.map((s) => ({
					code: s.code804n,
					title: s.title,
					price: s.unitPriceRub,
				})),
			});
			useVisitStore.getState().setToothState(String(result.toothNumber), "done");

			playTactileEarcon("save");
			showToast(
				`Лечение зуба ${result.toothNumber} продолжено: перенесён анамнез, 2-й этап обтурации и замена услуг в смете`,
				"success",
				3500,
			);
		},
		[dashboard, visitNoteForm, updateVisitNoteField],
	);

	React.useEffect(() => {
		const handleEvent = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.snapshot) {
				handleContinueEndoStage(detail.snapshot);
			} else if (activeToothEndoSnapshot) {
				handleContinueEndoStage(activeToothEndoSnapshot);
			}
		};
		window.addEventListener("dente-continue-endo-stage", handleEvent);
		return () => {
			window.removeEventListener("dente-continue-endo-stage", handleEvent);
		};
	}, [handleContinueEndoStage, activeToothEndoSnapshot]);

	return (
		<div className="space-y-4 mt-2.5 w-full min-w-0" data-testid="emk-clinical-canvas">
			<VisitEmkSomaticSummaryBar
				handleCompleteVisitAndGenerateReceipt={handleCompleteVisitAndGenerateReceipt}
				isCompletingVisit={isCompletingVisit}
			/>

			<VisitEmkInteractiveStage
				activeEmkTab={activeEmkTab}
				visitNoteForm={visitNoteForm}
				updateVisitNoteField={updateVisitNoteField}
				isLocked={isLocked}
				effectiveActiveTooth={effectiveActiveTooth}
				activePatient={activePatient}
				dashboard={dashboard}
				openVisitId={openVisitId}
				setIsSoapTemplatesModalOpen={setIsSoapTemplatesModalOpen}
				onApplySoapPreset={onApplySoapPreset}
				activeToothEndoSnapshot={activeToothEndoSnapshot}
				handleContinueEndoStage={handleContinueEndoStage}
			/>
		</div>
	);
}
