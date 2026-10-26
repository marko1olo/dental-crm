import React from "react";
import { ReceiptText } from "lucide-react";
import type { PatientPersonalCabinetData, PatientTaxDeductionCalculation } from "../../patientCabinetEngine";
import { generatePatientTaxCertificate1151156, openPrintWindow } from "../../patientCabinetEngine";
import { DocumentsTaxSteps } from "./DocumentsTaxSteps";
import { DocumentsTaxStatBoxes } from "./DocumentsTaxStatBoxes";

export interface DocumentsTaxWidgetProps {
	readonly data: PatientPersonalCabinetData;
	readonly selectedTaxYear: number;
	readonly onSelectTaxYear: (year: number) => void;
	readonly taxDeductionCalc: PatientTaxDeductionCalculation;
	readonly onOpenTaxCertificateSheet: () => void;
	readonly onDownloadTaxCertificateDirect: () => void;
	readonly onShowToast: (msg: string) => void;
}

export const DocumentsTaxWidget: React.FC<DocumentsTaxWidgetProps> = ({
	data,
	selectedTaxYear,
	onSelectTaxYear,
	taxDeductionCalc,
	onOpenTaxCertificateSheet,
	onDownloadTaxCertificateDirect,
	onShowToast,
}) => {
	const handlePrint = () => {
		openPrintWindow(generatePatientTaxCertificate1151156(data, selectedTaxYear));
		onShowToast(`Справка для налогового вычета (ФНС) за ${selectedTaxYear} год готова к печати!`);
	};

	return (
		<section className="pc-tax-deduction-widget" data-testid="documents-tax-deduction-widget">
			<div className="pc-tax-header">
				<div>
					<h3 className="pc-tax-main-title">
						Справка для налогового вычета (13% НДФЛ) за {selectedTaxYear} год
					</h3>
					<p className="pc-tax-subtitle">
						Включает все фискальные чеки клиники для представления в налоговые органы
					</p>
				</div>
				<div className="pc-tax-year-selector" role="group" aria-label="Выбор года">
					{[2026, 2025, 2024].map((year) => (
						<button
							key={year}
							type="button"
							className={`pc-year-btn ${selectedTaxYear === year ? "active" : ""}`}
							onClick={() => onSelectTaxYear(year)}
						>
							{year}
						</button>
					))}
				</div>
			</div>
			<div className="pc-tax-banner-pill" data-testid="tax-refund-header-banner">
				<ReceiptText size={18} />
				<span>{taxDeductionCalc.headerBannerTextRu}</span>
			</div>
			<DocumentsTaxStatBoxes
				taxDeductionCalc={taxDeductionCalc}
				onDownloadTaxCertificateDirect={onDownloadTaxCertificateDirect}
				onPrint={handlePrint}
				onOpenTaxCertificateSheet={onOpenTaxCertificateSheet}
			/>
			<DocumentsTaxSteps taxDeductionCalc={taxDeductionCalc} />
		</section>
	);
};
