import { UserRound } from "lucide-react";
import React from "react";
import { DigitsInput } from "./PaymentFiscalCashierBar";

export type TaxDeductionCode = "" | "1" | "2";

export type TaxPayerDetailsProps = {
	applyPatientTaxDefaults: () => void;
	onPayerBirthDateChange: (value: string) => void;
	onPayerFullNameChange: (value: string) => void;
	onPayerIdentityDocumentChange: (value: string) => void;
	onPayerInnChange: (value: string) => void;
	onPayerRelationshipChange: (value: string) => void;
	onTaxDeductionCodeChange: (value: TaxDeductionCode) => void;
	patientDefaults: {
		birthDate?: string | null;
		fullName?: string | null;
		identityDocument?: string | null;
		taxpayerInn?: string | null;
	};
	patientTaxDefaultsAvailable: boolean;
	payerBirthDate: string;
	payerFullName: string;
	payerIdentityDocument: string;
	payerInn: string;
	payerInnInvalid: boolean;
	payerRelationship: string;
	paymentMissingId: string;
	taxDeductionCode: TaxDeductionCode;
	taxDefaultsGuidanceId: string;
	taxPayerDetailsOpen: boolean;
};

export function TaxPayerDetails({
	applyPatientTaxDefaults,
	onPayerBirthDateChange,
	onPayerFullNameChange,
	onPayerIdentityDocumentChange,
	onPayerInnChange,
	onPayerRelationshipChange,
	onTaxDeductionCodeChange,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: automated suppression
	patientDefaults,
	patientTaxDefaultsAvailable,
	payerBirthDate,
	payerFullName,
	payerIdentityDocument,
	payerInn,
	payerInnInvalid,
	payerRelationship,
	paymentMissingId,
	taxDeductionCode,
	taxDefaultsGuidanceId,
	taxPayerDetailsOpen,
}: TaxPayerDetailsProps) {
	return (
		<details className="payment-capture-detail-section" open={taxPayerDetailsOpen}>
			<summary>Плательщик для налогового вычета</summary>
			<div className="smart-details-content">
				<div className="payment-capture-detail-grid">
					<div className="smart-field">
						<input
							id="payment-payer-full-name"
							autoComplete="name"
							value={payerFullName}
							onChange={(e) => onPayerFullNameChange(e.target.value)}
							placeholder=" "
						/>
						<label htmlFor="payment-payer-full-name">Плательщик для вычета (ФИО)</label>
					</div>
					<div className="smart-field">
						<DigitsInput
							id="payment-payer-inn"
							maxLength={12}
							aria-invalid={payerInnInvalid || undefined}
							aria-describedby={payerInnInvalid ? paymentMissingId : undefined}
							value={payerInn}
							onChange={onPayerInnChange}
							placeholder=" "
						/>
						<label htmlFor="payment-payer-inn">ИНН плательщика (если есть, физлицам не требуется)</label>
					</div>
					<div className="smart-field no-float">
						<input
							id="payment-payer-birth-date"
							type="date"
							autoComplete="bday"
							value={payerBirthDate}
							onChange={(e) => onPayerBirthDateChange(e.target.value)}
							placeholder=" "
						/>
						<label htmlFor="payment-payer-birth-date">Дата рождения плательщика</label>
					</div>
					<div className="smart-field">
						<input
							id="payment-payer-identity-document"
							autoComplete="off"
							value={payerIdentityDocument}
							onChange={(e) => onPayerIdentityDocumentChange(e.target.value)}
							placeholder=" "
						/>
						<label htmlFor="payment-payer-identity-document">Документ плательщика (паспорт / иной)</label>
					</div>
					<div className="smart-field">
						<input
							id="payment-payer-relationship"
							autoComplete="off"
							value={payerRelationship}
							onChange={(e) => onPayerRelationshipChange(e.target.value)}
							placeholder=" "
						/>
						<label htmlFor="payment-payer-relationship">Родство (пациент, мать...)</label>
						<div className="quick-chips-row" style={{ marginTop: "6px", padding: "0 14px 10px 14px" }}>
							{["пациент", "мать", "отец", "супруг", "супруга"].map((rel) => (
								<button
									key={rel}
									type="button"
									style={{ minHeight: "44px" }}
									className="quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-3.5 text-xs sm:text-sm font-semibold"
									onClick={() => onPayerRelationshipChange(rel)}
								>
									{rel}
								</button>
							))}
						</div>
					</div>
					<div
						role="toolbar"
						className="quick-chips-row"
						style={{ marginBottom: "20px" }}
						aria-label="Код медицинской услуги для налогового вычета"
					>
						<button
							style={{ minHeight: "44px" }}
							className={`quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-3.5 text-xs sm:text-sm font-semibold ${taxDeductionCode === "" ? "active" : ""}`}
							type="button"
							aria-pressed={taxDeductionCode === ""}
							onClick={() => onTaxDeductionCodeChange("")}
						>
							Не выбран
						</button>
						{(["1", "2"] as const).map((code) => (
							<button
								style={{ minHeight: "44px" }}
								className={`quick-chip min-h-[44px] sm:min-h-7 sm:h-7 px-3.5 text-xs sm:text-sm font-semibold ${taxDeductionCode === code ? "active" : ""}`}
								key={code}
								type="button"
								aria-pressed={taxDeductionCode === code}
								onClick={() => onTaxDeductionCodeChange(code)}
							>
								Код {code}
							</button>
						))}
					</div>
					<div className="payment-tax-defaults">
						<button
							style={{ minHeight: "44px" }}
							className="secondary-button min-h-[44px] sm:min-h-8 sm:h-8"
							type="button"
							onClick={applyPatientTaxDefaults}
							disabled={false}
							aria-describedby={!patientTaxDefaultsAvailable ? taxDefaultsGuidanceId : undefined}
							data-testid="payment-fill-payer-from-patient"
						>
							<UserRound aria-hidden="true" /> Заполнить из карточки пациента
						</button>
						{!patientTaxDefaultsAvailable ? (
							<small id={taxDefaultsGuidanceId}>
								В карточке пациента нет ФИО, даты рождения, документа или ИНН для автозаполнения.
							</small>
						) : (
							<small>
								Заполнит только пустые поля и не перезапишет ручные правки администратора.
							</small>
						)}
					</div>
				</div>
			</div>
		</details>
	);
}
