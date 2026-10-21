/**
 * PatientPassportAddressStep.tsx — Паспортные данные, адрес, СНИЛС, полис ОМС/ДМС под спойлером.
 */

import { FileText } from "lucide-react";
import React from "react";
import { PatientPassportFields } from "./PatientPassportFields";
import type { PatientPassportAddressStepProps } from "./types";

export function PatientPassportAddressStep({
	fieldRequirements,
	validationErrors,
	isMinorUnder14,
	showDocFields,
	onToggleDocFields,
	snils,
	onSnilsChange,
	insurancePolicyNumber,
	onInsurancePolicyNumberChange,
	identityDocument,
	onIdentityDocumentChange,
	registrationAddress,
	onRegistrationAddressChange,
}: PatientPassportAddressStepProps) {
	return (
		<details
			className="create-patient-doc-section mt-3 pt-3 border-t border-[var(--glass-border)]"
			open={showDocFields}
			onToggle={(e) => {
				const isOpen = (e.currentTarget as HTMLDetailsElement).open;
				if (isOpen !== showDocFields) {
					onToggleDocFields();
				}
			}}
		>
			<summary
				className="create-patient-doc-toggle-btn text-xs font-bold text-[var(--teal)] hover:underline inline-flex items-center gap-1.5 min-h-[36px] bg-transparent border-0 cursor-pointer select-none list-none"
				onClick={(e) => {
					e.preventDefault();
					onToggleDocFields();
				}}
				data-testid="patient-creation-toggle-docs-btn"
			>
				<FileText size={15} aria-hidden="true" />
				<span>
					{showDocFields
						? "▼ Скрыть документы для налогового вычета и договора"
						: "► Документы для налогового вычета и договора (опционально)"}
				</span>
			</summary>

			<PatientPassportFields
				validationErrors={validationErrors}
				isMinorUnder14={isMinorUnder14}
				snils={snils}
				onSnilsChange={onSnilsChange}
				insurancePolicyNumber={insurancePolicyNumber}
				onInsurancePolicyNumberChange={onInsurancePolicyNumberChange}
				identityDocument={identityDocument}
				onIdentityDocumentChange={onIdentityDocumentChange}
				registrationAddress={registrationAddress}
				onRegistrationAddressChange={onRegistrationAddressChange}
			/>
		</details>
	);
}
