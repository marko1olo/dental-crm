import React from "react";
import { ChevronLeft, Phone } from "lucide-react";
import type { ChairsidePatientQuickBarProps } from "./types";
import { ChairsidePatientHeaderActions } from "./ChairsidePatientHeaderActions";
import { ChairsidePatientSubRow } from "./ChairsidePatientSubRow";

export const ChairsidePatientQuickBar: React.FC<ChairsidePatientQuickBarProps> = ({
	activePatient,
	activeAppointment,
	patientAge,
	consolidatedAllergyChip,
	handlePrintForm043uFast,
	handleOpenPrescription,
	handleOpenLabOrder,
	onOpenWarrantyModal,
	onClose,
	onPrevStep,
	testId = "mobile-chairside-workspace",
}) => {
	const patientName = activePatient?.fullName || activePatient?.name || "Пациент";

	return (
		<header className="mobile-chairside-hud" data-testid={`${testId}-hud`}>
			<div className="mobile-chairside-hud-main-row">
				<button
					type="button"
					onClick={onPrevStep}
					className="mobile-chairside-icon-btn shrink-0"
					aria-label="Назад"
					data-testid={`${testId}-back-btn`}
				>
					<ChevronLeft size={24} />
				</button>

				<div className="mobile-chairside-patient-title-box">
					<div className="mobile-chairside-patient-name" title={patientName}>
						{patientName}
					</div>
					<div className="mobile-chairside-patient-subtext">
						{patientAge && <span>{patientAge}</span>}
						{patientAge && activePatient?.phone && <span className="opacity-40">·</span>}
						{activePatient?.phone && (
							<a
								href={`tel:${activePatient.phone}`}
								className="mobile-chairside-phone-link"
								data-testid={`${testId}-phone-link`}
							>
								<Phone size={11} />
								<span>{activePatient.phone}</span>
							</a>
						)}
					</div>
				</div>

				<ChairsidePatientHeaderActions
					handlePrintForm043uFast={handlePrintForm043uFast}
					handleOpenPrescription={handleOpenPrescription}
					handleOpenLabOrder={handleOpenLabOrder}
					onOpenWarrantyModal={onOpenWarrantyModal}
					onClose={onClose}
					testId={testId}
				/>
			</div>

			<ChairsidePatientSubRow
				activeAppointment={activeAppointment}
				consolidatedAllergyChip={consolidatedAllergyChip}
				testId={testId}
			/>
		</header>
	);
};
