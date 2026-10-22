import React from "react";
import { ToothDrawerSurfacesAccordion } from "./ToothDrawerSurfacesAccordion";
import { ToothDrawerAnesthesiaAccordion } from "./ToothDrawerAnesthesiaAccordion";
import { ToothDrawerRvgAccordion } from "./ToothDrawerRvgAccordion";
import { ToothDrawerLoyaltyAccordion } from "./ToothDrawerLoyaltyAccordion";
import { ToothDrawerPediatricAccordion } from "./ToothDrawerPediatricAccordion";
import type { ToothContextDrawerProps, WarmAccordionSection } from "./toothDrawerTypes";
import type { ToothData } from "../../odontogram/ToothChart";

interface ToothDrawerAccordionsBodyProps {
	toothNumber: number;
	toothData?: ToothData | undefined;
	patient: ToothContextDrawerProps["patient"];
	doctorName: string;
	activeSection: WarmAccordionSection;
	isPediatricTooth: boolean;
	toggleSection: (section: WarmAccordionSection) => void;
	onUpdateTooth?: ((num: number, updates: Partial<ToothData>) => void) | undefined;
	onInsertToProtocol?: ((text: string) => void) | undefined;
	onOpenFullRadiology?: ((toothNumber: number) => void) | undefined;
	onOpenFamilyBilling?: (() => void) | undefined;
	onOpenParentMemo?: (() => void) | undefined;
	onApplyAnesthesia?: ToothContextDrawerProps["onApplyAnesthesia"];
}

export const ToothDrawerAccordionsBody: React.FC<ToothDrawerAccordionsBodyProps> = ({
	toothNumber,
	toothData,
	patient,
	doctorName,
	activeSection,
	isPediatricTooth,
	toggleSection,
	onUpdateTooth,
	onInsertToProtocol,
	onOpenFullRadiology,
	onOpenFamilyBilling,
	onOpenParentMemo,
	onApplyAnesthesia,
}) => {
	return (
		<div className="dente-tooth-drawer-body">
			<ToothDrawerSurfacesAccordion
				toothNumber={toothNumber}
				toothData={toothData}
				activeSection={activeSection}
				toggleSection={toggleSection}
				onUpdateTooth={onUpdateTooth}
				onInsertToProtocol={onInsertToProtocol}
			/>

			<ToothDrawerAnesthesiaAccordion
				toothNumber={toothNumber}
				patient={patient}
				activeSection={activeSection}
				toggleSection={toggleSection}
				onInsertToProtocol={onInsertToProtocol}
				onApplyAnesthesia={onApplyAnesthesia}
			/>

			<ToothDrawerRvgAccordion
				toothNumber={toothNumber}
				patientId={patient?.id}
				toothData={toothData}
				activeSection={activeSection}
				toggleSection={toggleSection}
				onOpenFullRadiology={onOpenFullRadiology}
				onInsertToProtocol={onInsertToProtocol}
				onUpdateTooth={onUpdateTooth}
			/>

			<ToothDrawerLoyaltyAccordion
				toothNumber={toothNumber}
				patientId={patient?.id}
				patientName={patient?.fullName}
				activeSection={activeSection}
				toggleSection={toggleSection}
				onOpenFamilyBilling={onOpenFamilyBilling}
			/>

			{isPediatricTooth && (
				<ToothDrawerPediatricAccordion
					toothNumber={toothNumber}
					toothData={toothData}
					patientName={patient?.fullName}
					patientAgeYears={patient?.ageYears ?? 6}
					doctorName={doctorName}
					activeSection={activeSection}
					toggleSection={toggleSection}
					onUpdateTooth={onUpdateTooth}
					onInsertToProtocol={onInsertToProtocol}
					onOpenParentMemo={onOpenParentMemo}
				/>
			)}
		</div>
	);
};
