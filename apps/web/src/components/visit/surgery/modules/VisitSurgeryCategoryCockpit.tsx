import type React from "react";
import { VisitSurgeryExtractionBar } from "../VisitSurgeryExtractionBar";
import { VisitSurgerySinusGbrBar } from "../VisitSurgerySinusGbrBar";
import { VisitSurgeryImplantBar } from "../VisitSurgeryImplantBar";
import type { useVisitSurgeryState } from "./useVisitSurgeryState";

interface VisitSurgeryCategoryCockpitProps {
	s: ReturnType<typeof useVisitSurgeryState>;
	patientName: string;
	doctorName: string;
	onAddToInvoice?: ((services: any) => void) | undefined;
}

export const VisitSurgeryCategoryCockpit: React.FC<VisitSurgeryCategoryCockpitProps> = ({
	s,
	patientName,
	doctorName,
	onAddToInvoice,
}) => {
	if (s.currentNorm.category === "extraction") {
		return (
			<VisitSurgeryExtractionBar
				effectiveTooth={s.effectiveTooth}
				patientName={patientName}
				doctorName={doctorName}
				onApplyProtocolText={(text) => s.setProtocolText(text)}
				onAddToInvoice={onAddToInvoice}
			/>
		);
	}

	if (s.currentNorm.category === "sinus_gbr") {
		return (
			<VisitSurgerySinusGbrBar
				effectiveTooth={s.effectiveTooth}
				isClosedSinus={s.selectedNormId === "surgery_sinus_lift_closed"}
				onApplyProtocolText={(text) => s.setProtocolText(text)}
				onAddToInvoice={onAddToInvoice}
			/>
		);
	}

	return (
		<VisitSurgeryImplantBar
			implantBrand={s.implantBrand}
			setImplantBrand={s.setImplantBrand}
			implantDiameter={s.implantDiameter}
			setImplantDiameter={s.setImplantDiameter}
			implantLength={s.implantLength}
			setImplantLength={s.setImplantLength}
			implantTorque={s.implantTorque}
			setImplantTorque={s.setImplantTorque}
			implantIsq={s.implantIsq}
			setImplantIsq={s.setImplantIsq}
			implantCap={s.implantCap}
			setImplantCap={s.setImplantCap}
			implantSuture={s.implantSuture}
			setImplantSuture={s.setImplantSuture}
			onApplyPreset={s.handleApplyStandardImplantationPreset}
		/>
	);
};
