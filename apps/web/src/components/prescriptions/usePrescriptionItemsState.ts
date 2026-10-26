/**
 * usePrescriptionItemsState.ts — Prescribed Drug Items & Catalog State Hook
 * Decomposed hook <= 120 lines (Mandate 8b).
 */

import { DENTAL_PRESCRIPTION_DRUG_CATALOG } from "@dental/shared";
import { useEffect, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import type {
	PrescriptionDrugItem,
	PrescriptionFormType,
	PrescriptionPrintModalProps,
} from "./PrescriptionPrintModal";
import { buildMergedPrescriptionCatalog } from "./prescriptionDataSets";
import {
	loadPrescriptionDraft,
	savePrescriptionDraft,
} from "./prescriptionDraftStorage";
import { resolveActivePrescriptionItems } from "./prescriptionItemResolver";
import { useCustomDrugState } from "./useCustomDrugState";

export function usePrescriptionItemsState(
	props: PrescriptionPrintModalProps,
	activeForm: PrescriptionFormType,
	patientWeightKg?: number | undefined,
) {
	const draft = useMemo(
		() => loadPrescriptionDraft(props.patient?.id),
		[props.patient?.id],
	);

	const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>(() => {
		if (draft?.selectedDrugIds && draft.selectedDrugIds.length > 0) {
			return [...draft.selectedDrugIds];
		}
		if (props.initialSelectedDrugIds !== undefined)
			return [...props.initialSelectedDrugIds];
		const icd = (props.diary?.diagnosisIcd10 || "K02.1").toUpperCase();
		const matching = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
			d.recommendedForIcd10.some((code) => icd.startsWith(code)),
		);
		return matching.length > 0
			? matching.slice(0, 2).map((d) => d.id)
			: ["nimesulide_100"];
	});

	const [searchQuery, setSearchQuery] = useState<string>("");
	const [customDrugsList, setCustomDrugsList] = useState<
		PrescriptionDrugItem[]
	>(() => (draft?.customDrugsList ? [...draft.customDrugsList] : []));
	const [activePresetId, setActivePresetId] = useState<string | undefined>(
		() => draft?.activePresetId,
	);

	const customDrug = useCustomDrugState((newCustom) => {
		setCustomDrugsList((prev) => [...prev, newCustom]);
		setSelectedDrugIds((prev) =>
			prev.length < 3 ? [...prev, newCustom.id] : prev,
		);
	});

	useEffect(() => {
		savePrescriptionDraft(props.patient?.id, {
			selectedDrugIds,
			customDrugsList,
			activePresetId,
		});
	}, [props.patient?.id, selectedDrugIds, customDrugsList, activePresetId]);

	const fullCatalog = useMemo(() => buildMergedPrescriptionCatalog(), []);

	const filteredCatalog = useMemo(() => {
		const q = searchQuery.toLowerCase();
		return fullCatalog.filter((drug) => {
			return (
				!q ||
				drug.tradeNameRu.toLowerCase().includes(q) ||
				drug.activeSubstanceRu.toLowerCase().includes(q) ||
				drug.latinRp.toLowerCase().includes(q)
			);
		});
	}, [fullCatalog, searchQuery]);

	const toggleDrug = (id: string) => {
		if (activeForm === "148-1u-88") {
			setSelectedDrugIds([id]);
			return;
		}
		setSelectedDrugIds((prev) => {
			if (prev.includes(id)) return prev.filter((dId) => dId !== id);
			if (prev.length >= 3) {
				showToast(
					"На одном рецептурном бланке допускается не более 3 препаратов",
					"warning",
					3000,
				);
				return prev;
			}
			return [...prev, id];
		});
	};

	const activeItems = useMemo(
		() =>
			resolveActivePrescriptionItems(
				selectedDrugIds,
				customDrugsList,
				fullCatalog,
				patientWeightKg,
			),
		[selectedDrugIds, customDrugsList, fullCatalog, patientWeightKg],
	);

	return {
		selectedDrugIds,
		setSelectedDrugIds,
		toggleDrug,
		searchQuery,
		setSearchQuery,
		...customDrug,
		activePresetId,
		setActivePresetId,
		fullCatalog,
		filteredCatalog,
		activeItems,
	};
}
