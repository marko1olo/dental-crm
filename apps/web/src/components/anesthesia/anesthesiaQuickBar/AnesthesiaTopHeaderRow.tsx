/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaTopHeaderRow.tsx
 * Anesthesia Header, Passive Allergy Badges & Tooth Context (Mandates 8e, 8y, <= 120 lines)
 */

import { ShieldAlert, Syringe } from "lucide-react";
import React from "react";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import type { InjectionTechniqueId } from "../anesthesiaCatalog";
import { AnesthesiaPassiveAlerts } from "./AnesthesiaPassiveAlerts";

export interface AnesthesiaTopHeaderRowProps {
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly weight: number;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly hasPenicillinAllergy?: boolean | undefined;
	readonly hasLatexAllergy?: boolean | undefined;
	readonly isCardioRisk: boolean;
	readonly techniqueId: InjectionTechniqueId;
	readonly setTechniqueId: (t: InjectionTechniqueId) => void;
	readonly onOpenEmergencyProtocol?: (() => void) | undefined;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaTopHeaderRow({
	targetToothNumberFdi,
	weight,
	hasLidocaineAllergy,
	hasArticaineAllergy,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasPenicillinAllergy,
	hasLatexAllergy,
	isCardioRisk,
	techniqueId: _techniqueId,
	setTechniqueId: _setTechniqueId,
	onOpenEmergencyProtocol,
	disabled: _disabled = false,
}: AnesthesiaTopHeaderRowProps) {
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap min-w-0" data-testid="anesthesia-top-header-row">
			<div className="flex items-center gap-1.5 flex-wrap min-w-0">
				<span className="flex items-center gap-1 font-bold text-xs text-[var(--ink)] shrink-0">
					<Syringe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
					<span>Обезболивание</span>
				</span>
				<AnesthesiaPassiveAlerts
					targetToothNumberFdi={targetToothNumberFdi}
					weight={weight}
					hasLidocaineAllergy={hasLidocaineAllergy}
					hasArticaineAllergy={hasArticaineAllergy}
					hasSulfiteAllergy={hasSulfiteAllergy}
					hasBronchialAsthma={hasBronchialAsthma}
					hasPenicillinAllergy={hasPenicillinAllergy}
					hasLatexAllergy={hasLatexAllergy}
					isCardioRisk={isCardioRisk}
				/>
			</div>
			<button
				type="button"
				onClick={onOpenEmergencyProtocol || (() => useUiSurfaceStore.getState().openPrimaryModal("emergency_rescue"))}
				className="px-2.5 py-1 min-h-[48px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-500/10 hover:border-rose-500/40 text-[var(--muted)] hover:text-rose-600 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-auto"
				title="Экстренная аптечка «Антишок»"
				data-testid="btn-anesthesia-quick-emergency"
			>
				<ShieldAlert size={14} className="shrink-0" />
				<span>Аптечка</span>
			</button>
		</div>
	);
}
