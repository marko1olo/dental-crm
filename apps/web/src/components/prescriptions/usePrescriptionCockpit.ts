/**
 * usePrescriptionCockpit.ts — State and Business Logic Hook for Prescription Cockpit
 * Decomposed coordinator <= 120 lines (Mandate 8b).
 */

import { useCallback, useEffect, useRef } from "react";
import { showToast } from "../GlobalToast";
import type { PrescriptionPrintModalProps } from "./PrescriptionPrintModal";
import { fetchPatientPrescriptions } from "./prescriptionApiClient";
import { usePrescriptionActions } from "./usePrescriptionActions";
import { usePrescriptionBackendSync } from "./usePrescriptionBackendSync";
import { usePrescriptionClinicalWarnings } from "./usePrescriptionClinicalWarnings";
import { usePrescriptionContextStrings } from "./usePrescriptionContextStrings";
import { usePrescriptionFormMeta } from "./usePrescriptionFormMeta";
import { usePrescriptionItemsState } from "./usePrescriptionItemsState";
import { usePrescriptionPrintCoordinator } from "./usePrescriptionPrintCoordinator";

export function usePrescriptionCockpit(props: PrescriptionPrintModalProps) {
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
		diary,
		activeItems: itemsState.activeItems,
	});

	const handleAddOmeprazoleGastroprotection = useCallback(() => {
		if (itemsState.selectedDrugIds.includes("omeprazole_20")) {
			showToast("Омепразол 20 мг уже добавлен в назначения", "info", 2500);
			return;
		}
		if (
			itemsState.selectedDrugIds.length >= 3 &&
			meta.activeForm === "107-1u"
		) {
			showToast(
				"На одном рецептурном бланке допускается не более 3 препаратов.",
				"warning",
				4000,
			);
			return;
		}
		itemsState.setSelectedDrugIds([
			...itemsState.selectedDrugIds,
			"omeprazole_20",
		]);
		showToast(
			"Омепразол 20 мг добавлен для гастропротекции ЖКТ",
			"success",
			3000,
		);
	}, [
		itemsState.selectedDrugIds,
		itemsState.setSelectedDrugIds,
		meta.activeForm,
	]);

	const { generatePrintHtml, ukep } = usePrescriptionPrintCoordinator({
		meta,
		...ctx,
		activeItems: itemsState.activeItems,
	});

	const sync = usePrescriptionBackendSync({
		patientId: patient?.id,
		visitId:
			patient && "visitId" in patient ? String(patient["visitId"]) : undefined,
		doctorId:
			patient && "doctorId" in patient
				? String(patient["doctorId"])
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
		ukepSignature: ukep.ukepSignature,
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
			ukep.setIsUkepSigned(false);
			ukep.setUkepSignature(null);
			if (patient?.id) fetchPatientPrescriptions(patient.id).catch(() => {});
		}
		prevIsOpenRef.current = true;
	}, [
		isOpen,
		meta.resetFormMeta,
		meta.activeForm,
		ukep.setIsUkepSigned,
		ukep.setUkepSignature,
		patient?.id,
	]);

	return {
		...meta,
		...itemsState,
		...ukep,
		...actions,
		...ctx,
		...warnings,
		handleAddOmeprazoleGastroprotection,
		ddiSafetyAudit: null,
	};
}
