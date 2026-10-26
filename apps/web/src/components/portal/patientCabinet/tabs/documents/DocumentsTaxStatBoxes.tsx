import React from "react";
import { CheckCircle2, Download, Eye, Printer } from "lucide-react";
import type { PatientTaxDeductionCalculation } from "../../patientCabinetEngine";
import { formatRubles } from "../../patientCabinetEngine";

export interface DocumentsTaxStatBoxesProps {
	readonly taxDeductionCalc: PatientTaxDeductionCalculation;
	readonly onDownloadTaxCertificateDirect: () => void;
	readonly onPrint: () => void;
	readonly onOpenTaxCertificateSheet: () => void;
}

export const DocumentsTaxStatBoxes: React.FC<DocumentsTaxStatBoxesProps> = ({
	taxDeductionCalc,
	onDownloadTaxCertificateDirect,
	onPrint,
	onOpenTaxCertificateSheet,
}) => {
	return (
		<div className="pc-tax-calc-grid">
			<div className="pc-tax-stat-box">
				<span className="pc-tax-stat-label">Обычное лечение (Код 01)</span>
				<span className="pc-tax-stat-value">{formatRubles(taxDeductionCalc.code01SpentRub)}</span>
				<span className="pc-tax-stat-refund">
					<CheckCircle2 size={15} />
					<span>Возврат 13%: {formatRubles(taxDeductionCalc.code01RefundRub)}</span>
				</span>
				<span className="pc-tax-stat-note">
					{taxDeductionCalc.isCode01Capped
						? "Достигнут лимит 150 000 ₽ / год (макс. 19 500 ₽)"
						: "Лимит до 150 000 ₽ / год (макс. 19 500 ₽)"}
				</span>
			</div>
			<div className="pc-tax-stat-box">
				<span className="pc-tax-stat-label">Имплантация & Хирургия (Код 02)</span>
				<span className="pc-tax-stat-value">{formatRubles(taxDeductionCalc.code02SpentRub)}</span>
				<span className="pc-tax-stat-refund">
					<CheckCircle2 size={15} />
					<span>Возврат 13%: {formatRubles(taxDeductionCalc.code02RefundRub)}</span>
				</span>
				<span className="pc-tax-stat-note highlight-green">
					Без ограничений по сумме (13% от всех затрат)
				</span>
			</div>
			<div className="pc-tax-stat-box highlight">
				<span className="pc-tax-stat-label">ИТОГО ВЫПЛАТА НА КАРТУ</span>
				<span className="pc-tax-stat-value grand-total">{formatRubles(taxDeductionCalc.totalRefundRub)}</span>
				<div className="pc-tax-cta-row">
					<button
						type="button"
						className="pc-btn-primary pc-tax-download-btn"
						data-testid="order-tax-certificate-doc-btn"
						onClick={onDownloadTaxCertificateDirect}
					>
						<Download size={15} />
						<span>Скачать справку для вычета</span>
					</button>
					<button
						type="button"
						className="pc-btn-secondary pc-tax-print-btn"
						data-testid="print-tax-deduction-btn"
						onClick={onPrint}
					>
						<Printer size={15} />
						<span>Справка для налогового вычета (ФНС)</span>
					</button>
					<button
						type="button"
						className="pc-btn-secondary pc-tax-view-btn"
						data-testid="print-tax-knd-btn"
						onClick={onOpenTaxCertificateSheet}
					>
						<Eye size={15} />
						<span>Предпросмотр с печатью</span>
					</button>
				</div>
			</div>
		</div>
	);
};
