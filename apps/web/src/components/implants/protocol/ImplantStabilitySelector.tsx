/**
 * ImplantStabilitySelector.tsx — Компонент выбора плотности кости и стабильности имплантата (Мандат 8b: <= 120 строк).
 * Объединяет ProtocolBoneTorqueInputs и ProtocolIsqStabilityCard.
 */
import React from "react";
import type { MischDensity } from "../presets/implantPresetTypes";
import { ProtocolBoneTorqueInputs } from "./ProtocolBoneTorqueInputs";
import { ProtocolIsqStabilityCard } from "./ProtocolIsqStabilityCard";

export interface ImplantStabilitySelectorProps {
	readonly boneDensity: MischDensity;
	readonly setBoneDensity: (b: MischDensity) => void;
	readonly torqueNcm: number;
	readonly setTorqueNcm: (t: number) => void;
	readonly isIsqEnabled?: boolean | undefined;
	readonly setIsIsqEnabled?: ((en: boolean) => void) | undefined;
	readonly isqValue?: number | undefined;
	readonly setIsqValue?: ((val: number) => void) | undefined;
}

export const ImplantStabilitySelector: React.FC<ImplantStabilitySelectorProps> = ({
	boneDensity,
	setBoneDensity,
	torqueNcm,
	setTorqueNcm,
	isqValue,
	setIsqValue,
}) => {
	return (
		<div className="space-y-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs">
			<ProtocolBoneTorqueInputs
				boneDensity={boneDensity}
				setBoneDensity={setBoneDensity}
				torqueNcm={torqueNcm}
				setTorqueNcm={setTorqueNcm}
			/>
			<ProtocolIsqStabilityCard
				torqueNcm={torqueNcm}
				isqValue={isqValue}
				setIsqValue={setIsqValue}
			/>
		</div>
	);
};

export default ImplantStabilitySelector;
