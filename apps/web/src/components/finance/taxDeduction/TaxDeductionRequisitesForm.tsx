import React from "react";
import { TaxDeductionPayerForm } from "./TaxDeductionPayerForm";
import { TaxDeductionPaymentsTable } from "./TaxDeductionPaymentsTable";
import type {
	TaxDeductionPaymentItem,
	TaxDeductionRelationship,
	TaxDeductionYearSummary,
} from "./types";

export interface TaxDeductionRequisitesFormProps {
	readonly selectedYear: number;
	readonly setSelectedYear: (yr: number) => void;
	readonly availableYears: number[];
	readonly paymentsCountByYear: Record<number, number>;
	readonly payerRelationship: TaxDeductionRelationship;
	readonly setPayerRelationship: (rel: TaxDeductionRelationship) => void;
	readonly onFillFromPatient: () => void;
	readonly payerFullName: string;
	readonly setPayerFullName: (val: string) => void;
	readonly payerInn: string;
	readonly setPayerInn: (val: string) => void;
	readonly innValidation: { isValid: boolean; message?: string };
	readonly payerBirthDate: string;
	readonly setPayerBirthDate: (val: string) => void;
	readonly passportSeries: string;
	readonly setPassportSeries: (val: string) => void;
	readonly passportNumber: string;
	readonly setPassportNumber: (val: string) => void;
	readonly certificateNumber: string;
	readonly setCertificateNumber: (val: string) => void;
	readonly taxOfficeCode: string;
	readonly setTaxOfficeCode: (val: string) => void;
	readonly yearPayments: readonly TaxDeductionPaymentItem[];
	readonly payments: readonly TaxDeductionPaymentItem[];
	readonly targetYearSummary: TaxDeductionYearSummary;
	readonly clinicLicenseNumber: string;
	readonly clinicLicenseDate: string;
	readonly qrSvgString: string;
	readonly onClose: () => void;
}

export const TaxDeductionRequisitesForm: React.FC<TaxDeductionRequisitesFormProps> = ({
	selectedYear,
	setSelectedYear,
	availableYears,
	paymentsCountByYear,
	payerRelationship,
	setPayerRelationship,
	onFillFromPatient,
	payerFullName,
	setPayerFullName,
	payerInn,
	setPayerInn,
	innValidation,
	payerBirthDate,
	setPayerBirthDate,
	passportSeries,
	setPassportSeries,
	passportNumber,
	setPassportNumber,
	certificateNumber,
	setCertificateNumber,
	taxOfficeCode,
	setTaxOfficeCode,
	yearPayments,
	payments,
	targetYearSummary,
	clinicLicenseNumber,
	clinicLicenseDate,
	qrSvgString,
	onClose,
}) => {
	return (
		<>
			<TaxDeductionPayerForm
				selectedYear={selectedYear}
				setSelectedYear={setSelectedYear}
				availableYears={availableYears}
				paymentsCountByYear={paymentsCountByYear}
				payerRelationship={payerRelationship}
				setPayerRelationship={setPayerRelationship}
				onFillFromPatient={onFillFromPatient}
				payerFullName={payerFullName}
				setPayerFullName={setPayerFullName}
				payerInn={payerInn}
				setPayerInn={setPayerInn}
				innValidation={innValidation}
				payerBirthDate={payerBirthDate}
				setPayerBirthDate={setPayerBirthDate}
				passportSeries={passportSeries}
				setPassportSeries={setPassportSeries}
				passportNumber={passportNumber}
				setPassportNumber={setPassportNumber}
				certificateNumber={certificateNumber}
				setCertificateNumber={setCertificateNumber}
				taxOfficeCode={taxOfficeCode}
				setTaxOfficeCode={setTaxOfficeCode}
			/>
			<TaxDeductionPaymentsTable
				selectedYear={selectedYear}
				yearPayments={yearPayments}
				allPaymentsCount={payments.length}
				targetYearSummary={targetYearSummary}
				clinicLicenseNumber={clinicLicenseNumber}
				clinicLicenseDate={clinicLicenseDate}
				qrSvgString={qrSvgString}
				onClose={onClose}
			/>
		</>
	);
};
