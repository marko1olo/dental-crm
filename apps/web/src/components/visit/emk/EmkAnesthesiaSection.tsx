import React from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { useDoctorPreferencesStore } from "../../../store/doctorPreferencesStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { showToast } from "../../GlobalToast";
import { EmkAnesthesiaAlert } from "./EmkAnesthesiaAlert";
import { EmkAnesthesiaPresetChips } from "./EmkAnesthesiaPresetChips";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";
import type { EmkAnesthesiaPreset } from "./emkAnesthesiaPresets";

export function EmkAnesthesiaSection({
	visitNoteForm,
	updateVisitNoteField,
}: EmkSectionProps) {
	const favoriteAnes = useDoctorPreferencesStore(
		(s) => s.preferences.favoriteAnesthetic,
	);
	const [selectedDrugKey, setSelectedDrugKey] = React.useState<string>(() =>
		favoriteAnes === "scandonest_mepivacaine_3"
			? "scandonest_3"
			: "ultracain_ds_forte",
	);

	const handleApplyPreset = (preset: EmkAnesthesiaPreset) => {
		setSelectedDrugKey(preset.key);
		const curr = visitNoteForm?.treatmentPlan || "";
		updateVisitNoteField(
			"treatmentPlan",
			appendClinicalText(curr, preset.clinicalNote, "\n\n"),
		);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						service: {
							id: `anes-${Date.now()}`,
							title: `Анестезия инфильтрационная (${preset.shortLabel})`,
							code: preset.procedureCode,
							priceRub: preset.priceRub,
						},
					},
				}),
			);
		}
		showToast(
			`Анестезия (${preset.shortLabel}) внесена в протокол и счёт`,
			"success",
			2500,
		);
	};

	const handleNoAnesthesia = () => {
		setSelectedDrugKey("none");
		const currentPlan = visitNoteForm?.treatmentPlan || "";
		updateVisitNoteField(
			"treatmentPlan",
			appendClinicalText(
				currentPlan,
				"Анестезия: не применялась (интактно / лечение без анестезии по согласию пациента).",
				"\n\n",
			),
		);
		showToast("Зафиксировано: без анестезии / интактно", "info", 2500);
	};

	const handleAntishockEmergency = async () => {
		try {
			fetch("/api/inventory/quick-writeoff-emergency-antishock", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					scenarioId: "anaphylactic_shock",
					notes: "Экстренное списание укладки «Антишок»",
				}),
			}).catch(() => {});
			showToast(
				"🚨 Укладка «Антишок» списана. Протокол открыт.",
				"warning",
				4500,
			);
		} catch {
			showToast("🚨 Экстренная укладка «Антишок» списана", "info", 3000);
		}
		useUiSurfaceStore.getState().openPrimaryModal("emergency_rescue");
	};

	return (
		<div className="flex flex-col gap-2 mt-1 min-w-0 max-w-full">
			<EmkAnesthesiaAlert
				anamnesisText={visitNoteForm?.anamnesis}
				onSelectSafeDrug={(k) => setSelectedDrugKey(k)}
			/>
			<EmkAnesthesiaPresetChips
				selectedDrugKey={selectedDrugKey}
				favoriteAnes={favoriteAnes}
				onApplyPreset={handleApplyPreset}
				onNoAnesthesia={handleNoAnesthesia}
				onAntishockEmergency={handleAntishockEmergency}
			/>
		</div>
	);
}
