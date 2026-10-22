/**
 * usePrescriptionCockpit.ts — State and Business Logic Hook for Prescription Cockpit
 * Decomposed coordinator <= 120 lines (Mandate 8b).
 */

import { useEffect, useRef } from "react";
import type { PrescriptionModalProps } from "./PrescriptionModal";
import { fetchPatientPrescriptions } from "./prescriptionApiClient";
import { usePrescriptionActions } from "./usePrescriptionActions";
import { usePrescriptionBackendSync } from "./usePrescriptionBackendSync";
import { usePrescriptionClinicalWarnings } from "./usePrescriptionClinicalWarnings";
import { usePrescriptionContextStrings } from "./usePrescriptionContextStrings";
import { usePrescriptionFormMeta } from "./usePrescriptionFormMeta";
import { usePrescriptionGastroprotection } from "./usePrescriptionGastroprotection";
import { usePrescriptionItemsState } from "./usePrescriptionItemsState";
import { usePrescriptionPrintCoordinator } from "./usePrescriptionPrintCoordinator";

export function usePrescriptionCockpit(props: PrescriptionModalProps) {
	const {
		isOpen,
		patient,
		allergies,
		diary,
		onPrescriptionCreated,
		onInsertToDiary,
	} = props;
	const meta = usePrescriptionFormMeta(props);
	const itemsState = usePrescriptionItemsState(
		props,
		meta.activeForm,
		meta.patientWeightKg,
	);
	const ctx = usePrescriptionContextStrings(props);

	const warnings = usePrescriptionClinicalWarnings({
		patient,
		allergies,
		diary: diary as any,
		activeItems: itemsState.activeItems,
	});

	const { handleAddOmeprazoleGastroprotection } =
		usePrescriptionGastroprotection({
			selectedDrugIds: itemsState.selectedDrugIds,
			setSelectedDrugIds: itemsState.setSelectedDrugIds,
			activeForm: meta.activeForm,
		});

	const { generatePrintHtml } = usePrescriptionPrintCoordinator({
		meta,
		...ctx,
		activeItems: itemsState.activeItems,
	} as any);

	const sync = usePrescriptionBackendSync({
		patientId: patient?.id,
		visitId:
			patient && "visitId" in patient
				? String((patient as { visitId?: unknown }).visitId)
				: undefined,
		doctorId:
			patient && "doctorId" in patient
				? String((patient as { doctorId?: unknown }).doctorId)
				: undefined,
		activeForm: meta.activeForm,
		validityDays: meta.validityDays,
		isChronicSpecialCare: meta.isChronicSpecialCare,
		chronicPeriodicity: meta.chronicPeriodicity,
		patientAddress: meta.patientAddress,
		patientSnils: meta.patientSnils,
		patientOmsPolicy: meta.patientOmsPolicy,
		diagnosisIcd10: diary?.diagnosisIcd10,
		customSeriesNumber: meta.customSeriesNumber,
		activeItems: itemsState.activeItems,
		onPrescriptionCreated,
	});

	const actions = usePrescriptionActions({
		activeItems: itemsState.activeItems,
		...ctx,
		prescriptionDate: meta.prescriptionDate,
		generatePrintHtml,
		persistPrescriptionToBackend: sync.persistPrescriptionToBackend,
		onInsertToDiary,
		setSelectedDrugIds: itemsState.setSelectedDrugIds,
		setValidityDays: meta.setValidityDays,
		setActivePresetId: itemsState.setActivePresetId,
	});

	const prevIsOpenRef = useRef(false);
	useEffect(() => {
		if (!isOpen) {
			prevIsOpenRef.current = false;
			return;
		}
		if (!prevIsOpenRef.current) {
			meta.resetFormMeta(meta.activeForm);
			if (patient?.id) fetchPatientPrescriptions(patient.id).catch(() => {});
		}
		prevIsOpenRef.current = true;
	}, [
		isOpen,
		meta.resetFormMeta,
		meta.activeForm,
		patient?.id,
	]);

	return {
		...meta,
		...itemsState,
		...actions,
		...ctx,
		...warnings,
		handleAddOmeprazoleGastroprotection,
		ddiSafetyAudit: null,
	};
}
