import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { FnsTaxPaymentItem } from "./cdaR2XmlBuilder";
import { formatKopecksToRubles } from "./cdaR2XmlBuilder";
import { SAMPLE_FNS_TAX_1151156_PRESET } from "./sampleFnsTaxPreset";

export interface TaxDeductionCertificateDrawerProps {
	readonly patientName: string;
	readonly patientInn?: string;
	readonly payments?: readonly FnsTaxPaymentItem[];
	readonly defaultYear?: number;
	readonly onPrintCertificate?: (year: number) => void;
	readonly onExportPdf?: (year: number) => void;
}

export const TaxDeductionCertificateDrawer: React.FC<TaxDeductionCertificateDrawerProps> = ({
	patientName, patientInn = "", payments = [], defaultYear = 2026, onPrintCertificate, onExportPdf,
}) => {
	const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
	const [relationshipCode, setRelationshipCode] = useState<string>("1");
	const years = [2026, 2025, 2024, 2023];

	const effectivePayments = payments && payments.length > 0 ? payments : SAMPLE_FNS_TAX_1151156_PRESET.payments;
	const totalKopecks = effectivePayments.reduce((sum, p) => sum + (p.amountKopecks || 0), 0);
	const code1Kopecks = effectivePayments.filter((p) => p.serviceCode === "1").reduce((sum, p) => sum + (p.amountKopecks || 0), 0);
	const code2Kopecks = effectivePayments.filter((p) => p.serviceCode === "2").reduce((sum, p) => sum + (p.amountKopecks || 0), 0);

	return (
		<div className="egisz-tax-drawer" data-testid="tax-deduction-drawer">
			<div className="egisz-tax-section">
				<label className="egisz-tax-label">Отчетный налоговый период</label>
				<div className="egisz-year-chips" role="radiogroup">
					{years.map((y) => (
						<button key={y} type="button" className={`egisz-year-chip ${selectedYear === y ? "active" : ""}`} onClick={() => setSelectedYear(y)}>
							{y} год
						</button>
					))}
				</div>
			</div>

			<div className="egisz-tax-summary-hero">
				<div className="egisz-tax-hero-label">Оплачено за медицинские услуги</div>
				<div className="egisz-tax-hero-amount" data-testid="tax-total-amount">{`${formatKopecksToRubles(totalKopecks)} ₽`}</div>
				<div className="egisz-tax-hero-sub">{`Обычное лечение (код 1): ${formatKopecksToRubles(code1Kopecks)} ₽ • Дорогостоящее (код 2): ${formatKopecksToRubles(code2Kopecks)} ₽`}</div>
			</div>

			<div className="egisz-tax-section">
				<label className="egisz-tax-label">Получатель вычета</label>
				<div className="egisz-rel-chips">
					{[{ code: "1", title: "Сам пациент" }, { code: "2", title: "Супруг(а)" }, { code: "3", title: "Родитель" }, { code: "4", title: "Ребенок" }].map((r) => (
						<button key={r.code} type="button" className={`egisz-rel-chip ${relationshipCode === r.code ? "active" : ""}`} onClick={() => setRelationshipCode(r.code)}>
							{r.title}
						</button>
					))}
				</div>
			</div>

			<div className="egisz-tax-patient-box">
				<div className="text-sm font-semibold">{patientName}</div>
				<div className="text-xs text-muted">ИНН: {patientInn || "не указан"} • Справка для налогового вычета (13% НДФЛ)</div>
			</div>

			<div className="egisz-tax-payments-list">
				<div className="text-xs font-bold text-muted uppercase">Подтвержденные оплаты ({effectivePayments.length})</div>
				{effectivePayments.length === 0 ? (
					<div className="text-xs text-muted py-2">Нет зарегистрированных оплат за выбранный период</div>
				) : (
					effectivePayments.map((p, idx) => (
						<div key={idx} className="egisz-tax-payment-item">
							<div>
								<div className="font-semibold text-xs">{p.serviceDescription}</div>
								<div className="text-xs text-muted">{typeof p.date === "string" ? p.date : p.date.toLocaleDateString("ru-RU")} • Код: {p.serviceCode}</div>
							</div>
							<div className="font-bold text-sm">{`${formatKopecksToRubles(p.amountKopecks)} ₽`}</div>
						</div>
					))
				)}
			</div>

			<div className="egisz-tax-footer-cta">
				<button type="button" onClick={() => onPrintCertificate?.(selectedYear)} className="egisz-btn egisz-btn-primary full-width egisz-primary-cta-btn" data-testid="print-fns-tax-btn" title="Печать бланка ФНС с QR-кодом" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.875rem" }}>
					<CheckCircle2 size={16} />
					<span>Сформировать справку ФНС</span>
				</button>
			</div>
		</div>
	);
};
