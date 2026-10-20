import React, { useState } from "react";
import { Download, QrCode } from "lucide-react";
import type { FnsTaxPaymentItem } from "./cdaR2XmlBuilder";
import { formatKopecksToRubles } from "./cdaR2XmlBuilder";

export interface TaxDeductionCertificateDrawerProps {
	readonly patientName: string;
	readonly patientInn?: string;
	readonly payments?: readonly FnsTaxPaymentItem[];
	readonly defaultYear?: number;
	readonly onPrintCertificate?: (year: number) => void;
	readonly onExportPdf?: (year: number) => void;
}

export const TaxDeductionCertificateDrawer: React.FC<TaxDeductionCertificateDrawerProps> = ({
	patientName,
	patientInn = "770123456789",
	payments = [
		{ date: "2026-02-14", serviceCode: "1", serviceDescription: "Лечение кариеса и пломбирование", amountKopecks: 1250000 },
		{ date: "2026-05-20", serviceCode: "2", serviceDescription: "Установка дентального имплантата", amountKopecks: 3600000 },
	],
	defaultYear = 2026,
	onPrintCertificate,
	onExportPdf,
}) => {
	const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
	const [relationshipCode, setRelationshipCode] = useState<string>("1");
	const years = [2026, 2025, 2024, 2023];

	const totalKopecks = payments.reduce((sum, p) => sum + (p.amountKopecks || 0), 0);
	const code1Kopecks = payments.filter((p) => p.serviceCode === "1").reduce((sum, p) => sum + (p.amountKopecks || 0), 0);
	const code2Kopecks = payments.filter((p) => p.serviceCode === "2").reduce((sum, p) => sum + (p.amountKopecks || 0), 0);

	return (
		<div className="egisz-tax-drawer" data-testid="tax-deduction-drawer">
			{/* Год налогового периода */}
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

			{/* Крупная итоговая сумма расходов */}
			<div className="egisz-tax-summary-hero">
				<div className="egisz-tax-hero-label">Оплачено медицинских услуг по чекам 54-ФЗ</div>
				<div className="egisz-tax-hero-amount" data-testid="tax-total-amount">
					{`${formatKopecksToRubles(totalKopecks)} ₽`}
				</div>
				<div className="egisz-tax-hero-sub">
					{`Стандартное (код 1): ${formatKopecksToRubles(code1Kopecks)} ₽ • Дорогостоящее (код 2): ${formatKopecksToRubles(code2Kopecks)} ₽`}
				</div>
			</div>

			{/* Степень родства */}
			<div className="egisz-tax-section">
				<label className="egisz-tax-label">Получатель вычета</label>
				<div className="egisz-rel-chips">
					{[
						{ code: "1", title: "Сам пациент" },
						{ code: "2", title: "Супруг(а)" },
						{ code: "3", title: "Родитель" },
						{ code: "4", title: "Ребенок" },
					].map((r) => (
						<button key={r.code} type="button" className={`egisz-rel-chip ${relationshipCode === r.code ? "active" : ""}`} onClick={() => setRelationshipCode(r.code)}>
							{r.title}
						</button>
					))}
				</div>
			</div>

			{/* Данные налогоплательщика */}
			<div className="egisz-tax-patient-box">
				<div className="text-sm font-semibold">{patientName}</div>
				<div className="text-xs text-muted">ИНН: {patientInn} • Электронный документооборот ФНС (КНД 1151156)</div>
			</div>

			{/* Чек-лист кассы 54-ФЗ */}
			<div className="egisz-tax-payments-list">
				<div className="text-xs font-bold text-muted uppercase">Подтвержденные оплаты кассы ({payments.length})</div>
				{payments.map((p, idx) => (
					<div key={idx} className="egisz-tax-payment-item">
						<div>
							<div className="font-semibold text-xs">{p.serviceDescription}</div>
							<div className="text-xs text-muted">
								{typeof p.date === "string" ? p.date : p.date.toLocaleDateString("ru-RU")} • Код: {p.serviceCode}
							</div>
						</div>
						<div className="font-bold text-sm">{`${formatKopecksToRubles(p.amountKopecks)} ₽`}</div>
					</div>
				))}
			</div>

			{/* Зона большого пальца (Floating Bottom CTA) */}
			<div className="egisz-tax-footer-cta">
				<button type="button" onClick={() => onPrintCertificate?.(selectedYear)} className="egisz-btn egisz-btn-primary full-width" data-testid="print-fns-tax-btn">
					<QrCode size={18} /> Печать бланка ФНС с QR-кодом
				</button>
				{onExportPdf && (
					<button type="button" onClick={() => onExportPdf?.(selectedYear)} className="egisz-btn sm secondary full-width">
						<Download size={15} /> Сформировать и отправить в PDF
					</button>
				)}
			</div>
		</div>
	);
};
