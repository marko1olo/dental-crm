import React from "react";
import { calculateAge, isPrimaryTooth } from "@dental/shared";
import { ToothDrawerSurfacesAccordion } from "./ToothDrawerSurfacesAccordion";
import { ToothDrawerAnesthesiaAccordion } from "./ToothDrawerAnesthesiaAccordion";
import { ToothDrawerRvgAccordion } from "./ToothDrawerRvgAccordion";
import { ToothDrawerPerioAccordion } from "./ToothDrawerPerioAccordion";
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
	onOpenEndo?: ((toothNumber: number) => void) | undefined;
	onOpenPerio?: ((toothNumber: number) => void) | undefined;
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
	onOpenEndo,
	onOpenPerio,
	onApplyAnesthesia,
}) => {
	const calculatedAge = patient?.birthDate ? calculateAge(patient.birthDate) : undefined;
	const resolvedAgeYears = patient?.ageYears ?? calculatedAge ?? (isPrimaryTooth(toothNumber) ? 5 : 7);

	return (
		<div className="dente-tooth-drawer-body">
			{isPediatricTooth && (
				<ToothDrawerPediatricAccordion
					toothNumber={toothNumber}
					toothData={toothData}
					patientName={patient?.fullName}
					patientAgeYears={resolvedAgeYears}
					doctorName={doctorName}
					activeSection={activeSection}
					toggleSection={toggleSection}
					onUpdateTooth={onUpdateTooth}
					onInsertToProtocol={onInsertToProtocol}
					onOpenParentMemo={onOpenParentMemo}
				/>
			)}

			<ToothDrawerSurfacesAccordion
				toothNumber={toothNumber}
				toothData={toothData}
				patientId={patient?.id}
				activeSection={activeSection}
				toggleSection={toggleSection}
				onUpdateTooth={onUpdateTooth}
				onInsertToProtocol={onInsertToProtocol}
				onOpenEndo={onOpenEndo}
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

			<ToothDrawerPerioAccordion
				toothNumber={toothNumber}
				patientId={patient?.id}
				patientName={patient?.fullName}
				activeSection={activeSection}
				toggleSection={toggleSection}
				onInsertToProtocol={onInsertToProtocol}
				onOpenPerio={onOpenPerio}
			/>
		</div>
	);
};
