/**
 * PrescriptionAllergyBanner.tsx — Clinical Allergy & Somatic Safety Sentinel
 * Mandate 8e & Mandate 8y: Doctor Autonomy (Passive yellow banner, zero DDI paranoia, zero disabled buttons).
 * Architecture: Decomposed module <= 120 lines
 */

import { AlertTriangle } from "lucide-react";
import type React from "react";
import type {
	PrescriptionAllergyConflict,
	PrescriptionSomaticWarning,
} from "./prescriptionAllergyChecker";

export interface PrescriptionAllergyBannerProps {
	readonly allergyConflicts: readonly PrescriptionAllergyConflict[];
	readonly somaticWarnings: readonly PrescriptionSomaticWarning[];
	readonly ddiInteractions?:
		| readonly {
				readonly primaryDrug?: string;
				readonly interactingDrug?: string;
				readonly effectDescriptionRu?: string;
		  }[]
		| undefined;
	readonly onAddGastroprotection?: (() => void) | undefined;
}

const ALLERGY_TYPE_LABELS: Record<string, string> = {
	penicillin: "пенициллины",
	nsaid: "НПВС",
	anesthetic: "местные анестетики",
};

export const PrescriptionAllergyBanner: React.FC<
	PrescriptionAllergyBannerProps
> = ({ allergyConflicts, somaticWarnings, onAddGastroprotection }) => {
	if (allergyConflicts.length === 0 && somaticWarnings.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2 shrink-0 px-4 sm:px-6 mt-3">
			{/* Passive Allergy Warning Strip (Mandate 8y: Non-blocking amber/yellow line) */}
			{allergyConflicts.length > 0 && (
				<div
					data-testid="prescription-allergy-modal-banner"
					className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 text-xs flex items-center justify-between gap-2"
				>
					<div className="flex items-center gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
						<span className="font-bold whitespace-normal">
							Аллергия:{" "}
							{allergyConflicts
								.map((c) => ALLERGY_TYPE_LABELS[c.type] || c.matchedAllergyTerm || c.type)
								.join(", ")}
						</span>
					</div>
					<span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white shrink-0">
						Автономия врача (Печать доступна)
					</span>
				</div>
			)}

			{/* Somatic Anamnesis Soft Warning Strip */}
			{somaticWarnings.length > 0 && (
				<div
					data-testid="prescription-somatic-warning-banner"
					className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
				>
					<div className="flex items-start gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
						<div className="flex flex-col gap-0.5 min-w-0">
							<span className="font-bold">{somaticWarnings[0]?.messageRu}</span>
							<span className="text-[11.5px] text-amber-800 dark:text-amber-200">
								{somaticWarnings[0]?.recommendationRu}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
						{onAddGastroprotection && (
							<button
								type="button"
								onClick={onAddGastroprotection}
								className="h-7 px-2.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
							>
								+ Омепразол 20 мг
							</button>
						)}
						<span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40">
							Автономия врача
						</span>
					</div>
				</div>
			)}
		</div>
	);
};
