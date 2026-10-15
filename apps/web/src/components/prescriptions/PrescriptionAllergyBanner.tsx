/**
 * PrescriptionAllergyBanner.tsx — Clinical Allergy & Somatic Safety Sentinel
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons, non-blocking soft warnings).
 * Architecture: Decomposed module <= 120 lines
 */

import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { PrescriptionAllergyConflict, PrescriptionSomaticWarning } from "./prescriptionAllergyChecker";

export interface PrescriptionAllergyBannerProps {
	readonly allergyConflicts: readonly PrescriptionAllergyConflict[];
	readonly somaticWarnings: readonly PrescriptionSomaticWarning[];
	readonly ddiInteractions?: readonly { readonly primaryDrug?: string; readonly interactingDrug?: string; readonly effectDescriptionRu?: string }[] | undefined;
	readonly onAddGastroprotection?: (() => void) | undefined;
}

export const PrescriptionAllergyBanner: React.FC<PrescriptionAllergyBannerProps> = ({
	allergyConflicts,
	somaticWarnings,
	ddiInteractions = [],
	onAddGastroprotection,
}) => {
	if (allergyConflicts.length === 0 && somaticWarnings.length === 0 && ddiInteractions.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2 shrink-0 px-4 sm:px-6 mt-3">
			{/* Allergy Conflict Banner */}
			{allergyConflicts.length > 0 && (
				<div
					data-testid="prescription-allergy-modal-banner"
					className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-2"
				>
					<div className="flex items-center gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
						<span className="font-bold truncate">
							Внимание: обнаружен конфликт с аллергологическим анамнезом ({allergyConflicts.map((c) => c.matchedAllergyTerm).join(", ")})
						</span>
					</div>
					<span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white shrink-0">
						Автономия врача (Печать доступна)
					</span>
				</div>
			)}

			{/* Somatic Anamnesis Soft Warning Banner */}
			{somaticWarnings.length > 0 && (
				<div
					data-testid="prescription-somatic-warning-banner"
					className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
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

			{/* Drug-Drug Interactions (DDI) */}
			{ddiInteractions.length > 0 && (
				<div
					data-testid="prescription-ddi-modal-banner"
					className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 text-xs flex flex-col gap-1"
				>
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 min-w-0">
							<ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
							<span className="font-bold truncate">
								Предостережение DDI: взаимодействие препаратов ({ddiInteractions.length})
							</span>
						</div>
						<span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white shrink-0">
							Автономия врача
						</span>
					</div>
					<div className="flex flex-col gap-0.5 pl-6 text-[11.5px]">
						{ddiInteractions.map((inter, i) => (
							<div key={i}>
								<strong>{inter.primaryDrug} + {inter.interactingDrug}:</strong> {inter.effectDescriptionRu}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
