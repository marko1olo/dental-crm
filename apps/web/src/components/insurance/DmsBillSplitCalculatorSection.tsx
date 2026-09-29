/**
 * DmsBillSplitCalculatorSection.tsx — Интерактивный калькулятор разделения счета за визит
 * между страховой компанией (ДМС) и пациентом (наличные / безналичные / смешанная оплата).
 *
 * Инварианты:
 * 1. Копеечная точность финансовых расчетов (расхождение 0,00 руб).
 * 2. Эргономика десктопа (кнопки и поля ввода 32–36px).
 * 3. 0 эмодзи (строгий медицинский и финансовый стандарт).
 */

import {
	AlertCircle,
	Banknote,
	Calculator,
	Check,
	CreditCard,
	ShieldCheck,
	Split,
} from "lucide-react";
import React, { useId, useMemo, useState } from "react";
import {
	calculateDmsCoPaymentSplitWithPayment,
	formatCurrencyRub,
	kopecksToRubles,
	rublesToKopecks,
	type DmsBillableLineItem,
	type DmsGuaranteeLetter,
	type PatientPaymentMethod,
} from "./dmsSplitEngine";
import type { BillItemToSplit } from "./DmsGuaranteeLetterModal";
import { formatRubKopecks } from "./insuranceMath";

export interface DmsBillSplitCalculatorSectionProps {
	readonly letter: DmsGuaranteeLetter;
	readonly billItems?: readonly BillItemToSplit[] | undefined;
}

export const DEMO_VISIT_BILL_ITEMS: readonly BillItemToSplit[] = [
	{
		id: "item-1",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой световой (I класс)",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 450000, // 4 500,00 руб
	},
	{
		id: "item-2",
		serviceCode804n: "A11.07.010",
		serviceName: "Инфильтрационная анестезия",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 95000, // 950,00 руб
	},
	{
		id: "item-3",
		serviceCode804n: "A16.07.050",
		serviceName: "Клиническое отбеливание зубов Zoom 4",
		toothNumber: undefined,
		quantity: 1,
		unitPriceKopecks: 2600000, // 26 000,00 руб (исключение из ДМС)
	},
];

export function DmsBillSplitCalculatorSection({
	letter,
	billItems = DEMO_VISIT_BILL_ITEMS,
}: DmsBillSplitCalculatorSectionProps) {
	const cashInputId = useId();
	const [paymentMethod, setPaymentMethod] = useState<PatientPaymentMethod>("card");
	const [mixedCashRub, setMixedCashRub] = useState<number>(5000);

	const mappedItems: DmsBillableLineItem[] = useMemo(() => {
		return billItems.map((item) => ({
			id: item.id,
			serviceCode: item.serviceCode804n,
			serviceCode804n: item.serviceCode804n,
			serviceName: item.serviceName,
			toothNumber: item.toothNumber,
			quantity: item.quantity,
			unitPriceKopecks: item.unitPriceKopecks,
			discountPercent: item.discountPercent,
		}));
	}, [billItems]);

	const splitCalculation = useMemo(() => {
		const cashKopecks =
			paymentMethod === "mixed" ? rublesToKopecks(mixedCashRub) : undefined;

		return calculateDmsCoPaymentSplitWithPayment(
			mappedItems,
			letter,
			paymentMethod,
			cashKopecks,
		);
	}, [mappedItems, letter, paymentMethod, mixedCashRub]);

	const paymentSplit = splitCalculation.patientPaymentSplit;

	return (
		<div className="dms-card" style={{ marginTop: "16px" }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "8px",
					marginBottom: "12px",
				}}
			>
				<h3 className="dms-card-title" style={{ margin: 0 }}>
					<Calculator size={18} className="text-teal-600" />
					5. Калькулятор распределения счета визита (ДМС / Пациент: Нал / Безнал)
				</h3>
				<span
					className="dms-badge dms-badge-active"
					style={{ fontSize: "0.6875rem", textTransform: "none" }}
				>
					Баланс 100% (копейка в копейку)
				</span>
			</div>

			<p
				style={{
					fontSize: "0.8125rem",
					color: "var(--muted, #64748b)",
					margin: "0 0 12px 0",
				}}
			>
				Автоматическое распределение позиций текущего визита с учетом лимита письма ({formatCurrencyRub(letter.maxCoverageKopecks ?? 0)}),
				франшизы ({letter.franchisePercent && letter.franchisePercent > 0 ? `${letter.franchisePercent}%` : `${formatCurrencyRub(letter.franchiseFixedKopecks ?? 0)}`})
				и исключений страховой программы.
			</p>

			{/* Сводные показатели визита */}
			<div className="dms-stats-row" style={{ marginBottom: "14px" }}>
				<div className="dms-stat-card">
					<span className="dms-stat-label">Общая сумма счета</span>
					<span className="dms-stat-value font-mono">
						{formatCurrencyRub(splitCalculation.totalBillKopecks)}
					</span>
				</div>
				<div className="dms-stat-card" style={{ borderColor: "rgba(13, 148, 136, 0.4)" }}>
					<span className="dms-stat-label" style={{ color: "var(--teal, #0d9488)" }}>
						Покрывается ДМС
					</span>
					<span
						className="dms-stat-value font-mono"
						style={{ color: "var(--teal, #0d9488)" }}
					>
						{formatCurrencyRub(splitCalculation.dmsCoveredKopecks)}
					</span>
				</div>
				<div className="dms-stat-card" style={{ borderColor: "rgba(217, 119, 6, 0.4)" }}>
					<span className="dms-stat-label" style={{ color: "var(--warn-fg, #d97706)" }}>
						Доплата пациента
					</span>
					<span
						className="dms-stat-value font-mono"
						style={{ color: "var(--warn-fg, #d97706)" }}
					>
						{formatCurrencyRub(splitCalculation.patientTotalKopecks)}
					</span>
				</div>
				<div className="dms-stat-card">
					<span className="dms-stat-label">Остаток лимита ГП</span>
					<span className="dms-stat-value font-mono">
						{formatCurrencyRub(splitCalculation.remainingLimitKopecks)}
					</span>
				</div>
			</div>

			{/* Выбор способа оплаты доплаты пациента */}
			<div
				style={{
					background: "var(--paper, #ffffff)",
					padding: "12px 14px",
					borderRadius: "10px",
					border: "1px solid var(--line, #e2e8f0)",
					marginBottom: "14px",
				}}
			>
				<div
					style={{
						fontSize: "0.8125rem",
						fontWeight: 600,
						marginBottom: "8px",
						color: "var(--ink, #0f172a)",
					}}
				>
					Способ внесения доплаты пациентом ({formatCurrencyRub(splitCalculation.patientTotalKopecks)}):
				</div>

				<div className="dms-quick-toolbar" style={{ marginBottom: "10px" }}>
					<button
						type="button"
						className={`dms-quick-chip ${paymentMethod === "card" ? "active" : ""}`}
						onClick={() => setPaymentMethod("card")}
					>
						<CreditCard size={14} />
						<span>Банковская карта (безнал)</span>
					</button>

					<button
						type="button"
						className={`dms-quick-chip ${paymentMethod === "cash" ? "active" : ""}`}
						onClick={() => setPaymentMethod("cash")}
					>
						<Banknote size={14} />
						<span>Наличные (касса)</span>
					</button>

					<button
						type="button"
						className={`dms-quick-chip ${paymentMethod === "mixed" ? "active" : ""}`}
						onClick={() => setPaymentMethod("mixed")}
					>
						<Split size={14} />
						<span>Смешанная (Нал + Карта)</span>
					</button>
				</div>

				{paymentMethod === "mixed" && (
					<div
						className="dms-grid-2"
						style={{
							paddingTop: "8px",
							borderTop: "1px dashed var(--line, #e2e8f0)",
							alignItems: "flex-end",
						}}
					>
						<div className="dms-field-group">
							<label htmlFor={cashInputId} className="dms-label">
								Оплата наличными (₽)
							</label>
							<input
								id={cashInputId}
								type="number"
								min="0"
								max={kopecksToRubles(splitCalculation.patientTotalKopecks)}
								step="100"
								value={mixedCashRub}
								onChange={(e) =>
									setMixedCashRub(
										Math.max(
											0,
											Math.min(
												kopecksToRubles(splitCalculation.patientTotalKopecks),
												Number(e.target.value) || 0,
											),
										),
									)
								}
								className="dms-input font-mono"
							/>
						</div>

						<div className="dms-field-group">
							<span className="dms-label">Оплата банковской картой (авто-расчет)</span>
							<div
								className="dms-input font-mono font-bold flex items-center bg-slate-50 dark:bg-slate-900"
								style={{ color: "var(--primary, #0284c7)" }}
							>
								{paymentSplit ? formatCurrencyRub(paymentSplit.cardKopecks) : "0,00 ₽"}
							</div>
						</div>
					</div>
				)}

				{paymentSplit && (
					<div
						style={{
							marginTop: "8px",
							fontSize: "0.75rem",
							color: "var(--muted, #64748b)",
							display: "flex",
							gap: "12px",
							flexWrap: "wrap",
						}}
					>
						<span>
							Наличные: <strong>{formatCurrencyRub(paymentSplit.cashKopecks)}</strong>
						</span>
						<span>&bull;</span>
						<span>
							Банковская карта: <strong>{formatCurrencyRub(paymentSplit.cardKopecks)}</strong>
						</span>
						<span>&bull;</span>
						<span style={{ color: "var(--ok-fg, #059669)", fontWeight: 600 }}>
							<Check size={12} className="inline mr-1" />
							Сумма доплаты сходится с чеком
						</span>
					</div>
				)}
			</div>

			{/* Детализация услуг визита */}
			<div className="dms-table-container">
				<table className="dms-table">
					<thead>
						<tr>
							<th>Код услуги</th>
							<th>Наименование услуги</th>
							<th>Зуб FDI</th>
							<th>Стоимость</th>
							<th>ДМС покрывает</th>
							<th>Пациент оплачивает</th>
							<th>Основание</th>
						</tr>
					</thead>
					<tbody>
						{splitCalculation.lines.map((line) => {
							return (
								<tr key={line.id}>
									<td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary, #0284c7)" }}>
										{line.serviceCode804n}
									</td>
									<td style={{ fontWeight: 500 }}>{line.serviceName}</td>
									<td style={{ fontFamily: "monospace" }}>{line.toothNumber || "—"}</td>
									<td style={{ fontFamily: "monospace", fontWeight: 600 }}>
										{formatCurrencyRub(line.totalKopecks)}
									</td>
									<td style={{ fontFamily: "monospace", color: "var(--teal, #0d9488)", fontWeight: 700 }}>
										{formatCurrencyRub(line.coveredByDmsKopecks ?? line.insuranceCoveredKopecks)}
									</td>
									<td style={{ fontFamily: "monospace", color: (line.patientTotalKopecks ?? line.patientOutOfPocketKopecks) > 0 ? "var(--warn-fg, #d97706)" : "inherit", fontWeight: 700 }}>
										{formatCurrencyRub(line.patientTotalKopecks ?? line.patientOutOfPocketKopecks)}
									</td>
									<td>
										{(line.coveredByDmsKopecks ?? line.insuranceCoveredKopecks) > 0 && (line.patientTotalKopecks ?? line.patientOutOfPocketKopecks) === 0 && (
											<span className="dms-badge dms-badge-active" style={{ fontSize: "0.6875rem" }}>
												Одобрено 100%
											</span>
										)}
										{(line.copayKopecks ?? line.franchiseDeductionKopecks) > 0 && (
											<span className="dms-badge dms-badge-exhausted" style={{ fontSize: "0.6875rem" }}>
												Франшиза
											</span>
										)}
										{(line.patientExcludedKopecks ?? 0) > 0 && (
											<span className="dms-badge dms-badge-expired" style={{ fontSize: "0.6875rem" }}>
												Исключение ДМС
											</span>
										)}
										{(line.patientExceededLimitKopecks ?? 0) > 0 && (
											<span className="dms-badge dms-badge-expired" style={{ fontSize: "0.6875rem" }}>
												Сверх лимита ГП
											</span>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
					<tfoot>
						<tr className="dms-table-totals">
							<td colSpan={3}>ИТОГО К РАСПРЕДЕЛЕНИЮ:</td>
							<td style={{ fontFamily: "monospace" }}>
								{formatCurrencyRub(splitCalculation.totalBillKopecks)}
							</td>
							<td style={{ fontFamily: "monospace", color: "var(--teal, #0d9488)" }}>
								{formatCurrencyRub(splitCalculation.dmsCoveredKopecks)}
							</td>
							<td style={{ fontFamily: "monospace", color: "var(--warn-fg, #d97706)" }}>
								{formatCurrencyRub(splitCalculation.patientTotalKopecks)}
							</td>
							<td>
								<span style={{ fontSize: "0.75rem", color: "var(--ok-fg, #059669)", fontWeight: 600 }}>
									ДМС + Пациент = Итого
								</span>
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
}
