import { ShieldCheck } from "lucide-react";
import React from "react";
import {
	formatOmsPolicy,
	formatRussianPassport,
	formatSnils,
} from "../../../utils/inputSanitation";
import type { PatientPassportAddressStepProps } from "./types";

export type PatientPassportFieldsProps = Omit<
	PatientPassportAddressStepProps,
	"showDocFields" | "onToggleDocFields" | "fieldRequirements"
>;

export function PatientPassportFields({
	validationErrors,
	isMinorUnder14,
	snils,
	onSnilsChange,
	insurancePolicyNumber,
	onInsurancePolicyNumberChange,
	identityDocument,
	onIdentityDocumentChange,
	registrationAddress,
	onRegistrationAddressChange,
}: PatientPassportFieldsProps) {
	return (
		<div className="create-patient-grid-2 mt-2 gap-3" data-testid="patient-creation-docs-spoiler">
			<div className="create-patient-form-field">
				<label htmlFor="patient-create-snils" className="create-patient-label flex items-center gap-1">
					<ShieldCheck size={13} className="text-[var(--teal)]" />
					СНИЛС <span className="text-xs text-[var(--muted)] font-normal">(опция, для договора и вычета)</span>
				</label>
				<input
					id="patient-create-snils"
					data-testid="patient-creation-snils-input"
					inputMode="numeric"
					placeholder="000-000-000 00"
					value={snils || ""}
					onChange={(e) => onSnilsChange(formatSnils(e.target.value))}
					className={`create-patient-input ${validationErrors.snils ? "border-rose-500" : ""}`}
					aria-invalid={!!validationErrors.snils}
				/>
				{validationErrors.snils && (
					<span className="text-xs text-rose-500 font-semibold mt-1">{validationErrors.snils}</span>
				)}
				<span className="text-[10px] text-[var(--muted)] block mt-0.5">
					Не блокирует регистрацию. Требуется для электронной медкарты и справки для налогового вычета.
				</span>
			</div>

			<div className="create-patient-form-field">
				<label htmlFor="patient-create-oms" className="create-patient-label">
					Полис ОМС / ДМС <span className="text-xs text-[var(--muted)] font-normal">(опция)</span>
				</label>
				<input
					id="patient-create-oms"
					data-testid="patient-creation-oms-input"
					placeholder="Номер полиса"
					value={insurancePolicyNumber || ""}
					onChange={(e) => onInsurancePolicyNumberChange(formatOmsPolicy(e.target.value))}
					className="create-patient-input"
				/>
			</div>

			<div className="create-patient-form-field create-patient-full-width">
				<label htmlFor="patient-create-passport" className="create-patient-label">
					{isMinorUnder14 ? "Свидетельство о рождении / Паспорт РФ" : "Паспорт РФ"}{" "}
					<span className="text-xs text-[var(--muted)] font-normal">(опция, для договора и вычета)</span>
				</label>
				<input
					id="patient-create-passport"
					data-testid="patient-creation-passport-input"
					placeholder={isMinorUnder14 ? "Серия (римские) № 000000 или паспорт" : "Серия и номер 0000 000000"}
					value={identityDocument || ""}
					onChange={(e) => onIdentityDocumentChange(formatRussianPassport(e.target.value))}
					className={`create-patient-input ${validationErrors.identityDocument ? "border-rose-500" : ""}`}
					aria-invalid={!!validationErrors.identityDocument}
				/>
				{validationErrors.identityDocument && (
					<span className="text-xs text-rose-500 font-semibold mt-1">{validationErrors.identityDocument}</span>
				)}
				<span className="text-[10px] text-[var(--muted)] block mt-0.5">
					Не блокирует регистрацию. Можно внести позже при оформлении договора.
				</span>
			</div>

			<div className="create-patient-form-field create-patient-full-width">
				<label htmlFor="patient-create-address" className="create-patient-label">
					Адрес регистрации / проживания <span className="text-xs text-[var(--muted)] font-normal">(опция)</span>
				</label>
				<input
					id="patient-create-address"
					data-testid="patient-creation-address-input"
					placeholder="Город, улица, дом, квартира"
					value={registrationAddress || ""}
					onChange={(e) => onRegistrationAddressChange?.(e.target.value)}
					className="create-patient-input"
				/>
				<span className="text-[10px] text-[var(--muted)] block mt-0.5">
					Не блокирует регистрацию. Требуется для договора и справки в ФНС.
				</span>
			</div>
		</div>
	);
}
