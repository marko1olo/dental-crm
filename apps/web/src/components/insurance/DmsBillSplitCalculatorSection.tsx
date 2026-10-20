/**
 * DmsBillSplitCalculatorSection.tsx — Интерактивный калькулятор разделения счета за визит
 * между страховой компанией (ДМС) и пациентом (наличные / безналичные / смешанная оплата).
 *
 * Инварианты:
 * 1. Копеечная точность финансовых расчетов (расхождение 0,00 руб).
 * 2. 1-клик переключатели [ДМС | Пациент | Сплит 50/50 | Авто] для каждой позиции счета.
 * 3. Адаптив Apple iOS HIG: на мобильных экранах (<768px) нативные Grouped Cards вместо таблицы.
 * 4. Крупный остаток лимита ГП 28px bold font-mono.
 * 5. 0 эмодзи (строгий медицинский и финансовый стандарт).
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
	calculatePatientPaymentSplit,
	formatCurrencyKopecks,
	formatCurrencyRub,
	kopecksToRubles,
	rublesToKopecks,
	type DmsBillableLineItem,
	type DmsGuaranteeLetter,
	type PatientPaymentMethod,
} from "./dmsSplitEngine";
import type { BillItemToSplit } from "./DmsGuaranteeLetterModal";
import { formatRubKopecks } from "./insuranceMath";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export interface DmsBillSplitCalculatorSectionProps {
	readonly letter: DmsGuaranteeLetter;
	readonly billItems?: readonly BillItemToSplit[] | undefined;
	readonly onApplySplitToPayment?: ((split: {
		totalDueRub: number;
		dmsRub: number;
		patientRub: number;
		patientMethod: PatientPaymentMethod;
		patientCashRub?: number | undefined;
		patientCardRub?: number | undefined;
		letterId?: string | undefined;
		letterNumber?: string | undefined;
		insurerName?: string | undefined;
	}) => void) | undefined;
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
	billItems,
	onApplySplitToPayment,
}: DmsBillSplitCalculatorSectionProps) {
	const cashInputId = useId();
	const [paymentMethod, setPaymentMethod] = useState<PatientPaymentMethod>("card");
	const [mixedCashRub, setMixedCashRub] = useState<number>(5000);
	const [itemSplitOverrides, setItemSplitOverrides] = useState<
		Record<string, "auto" | "dms" | "patient" | "split_50">
	>({});

	const isDemo = isDemoShowcaseMode();
	const effectiveItems = billItems !== undefined ? billItems : (isDemo ? DEMO_VISIT_BILL_ITEMS : []);

	const mappedItems: DmsBillableLineItem[] = useMemo(() => {
		return effectiveItems.map((item) => ({
			id: item.id,
			serviceCode: item.serviceCode804n,
			serviceCode804n: item.serviceCode804n,
			serviceName: item.serviceName,
			toothNumber: item.toothNumber,
			quantity: item.quantity,
			unitPriceKopecks: item.unitPriceKopecks,
			discountPercent: item.discountPercent,
		}));
	}, [effectiveItems]);

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

	// Ручные или автоматические переопределения позиций с защитой целостности копеек
	const effectiveLines = useMemo(() => {
		return splitCalculation.lines.map((line) => {
			const itemId = line.lineItemId || line.id || "";
			const mode = itemSplitOverrides[itemId] || "auto";

			if (mode === "auto") {
				return {
					...line,
					effectiveDmsKopecks: line.coveredByDmsKopecks ?? line.insuranceCoveredKopecks ?? 0,
					effectivePatientKopecks: line.patientTotalKopecks ?? line.patientOutOfPocketKopecks ?? 0,
					overrideMode: "auto" as const,
				};
			}

			if (mode === "dms") {
				return {
					...line,
					effectiveDmsKopecks: line.totalKopecks,
					effectivePatientKopecks: 0,
					overrideMode: "dms" as const,
					splitReason: "Врачебное решение: 100% покрытие ДМС",
				};
			}

			if (mode === "patient") {
				return {
					...line,
					effectiveDmsKopecks: 0,
					effectivePatientKopecks: line.totalKopecks,
					overrideMode: "patient" as const,
					splitReason: "Оплата пациентом (нестраховой случай)",
				};
			}

			if (mode === "split_50") {
				const dmsKop = Math.floor(line.totalKopecks / 2);
				const patKop = line.totalKopecks - dmsKop;
				return {
					...line,
					effectiveDmsKopecks: dmsKop,
					effectivePatientKopecks: patKop,
					overrideMode: "split_50" as const,
					splitReason: "Сплит 50% ДМС / 50% Пациент",
				};
			}

			return {
				...line,
				effectiveDmsKopecks: line.coveredByDmsKopecks ?? line.insuranceCoveredKopecks ?? 0,
				effectivePatientKopecks: line.patientTotalKopecks ?? line.patientOutOfPocketKopecks ?? 0,
				overrideMode: "auto" as const,
			};
		});
	}, [splitCalculation.lines, itemSplitOverrides]);

	// Финансовые агрегаты визита
	const totalBillKopecks = splitCalculation.totalBillKopecks;
	const totalDmsCoveredKopecks = effectiveLines.reduce((acc, l) => acc + l.effectiveDmsKopecks, 0);
	const totalPatientTotalKopecks = Math.max(0, totalBillKopecks - totalDmsCoveredKopecks);

	const initialMaxKop =
		letter.maxCoverageKopecks ??
		letter.maxApprovedAmountKopecks ??
		rublesToKopecks(letter.maxCoverageRub ?? 0);
	const initialUsedKop =
		letter.usedAmountKopecks ??
		rublesToKopecks(letter.usedAmountRub ?? 0);
	const remainingLimitKopecks = Math.max(0, initialMaxKop - initialUsedKop - totalDmsCoveredKopecks);

	const paymentSplit = useMemo(() => {
		const cashKopecks =
			paymentMethod === "mixed" ? rublesToKopecks(mixedCashRub) : undefined;
		return calculatePatientPaymentSplit(totalPatientTotalKopecks, {
			preferredMethod: paymentMethod,
			cashKopecks,
		});
	}, [totalPatientTotalKopecks, paymentMethod, mixedCashRub]);

	const handleSetOverride = (itemId: string, mode: "auto" | "dms" | "patient" | "split_50") => {
		setItemSplitOverrides((prev) => ({
			...prev,
			[itemId]: mode,
		}));
	};

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
				Автоматическое распределение позиций текущего визита с учетом лимита письма ({formatCurrencyKopecks(letter.maxCoverageKopecks ?? 0)}),
				франшизы ({letter.franchisePercent && letter.franchisePercent > 0 ? `${letter.franchisePercent}%` : `${formatCurrencyKopecks(letter.franchiseFixedKopecks ?? 0)}`})
				и исключений страховой программы.
			</p>

			{mappedItems.length === 0 ? (
				<div
					style={{
						padding: "20px",
						borderRadius: "10px",
						border: "1px dashed var(--line, #cbd5e1)",
						textAlign: "center",
						backgroundColor: "var(--paper-soft, #f8fafc)",
						margin: "8px 0",
					}}
					data-testid="empty-dms-bill-items"
				>
					<Split size={24} style={{ margin: "0 auto 8px", opacity: 0.5, color: "var(--teal, #0d9488)" }} />
					<p style={{ fontWeight: 600, fontSize: "0.875rem", margin: "0 0 4px", color: "var(--ink, #0f172a)" }}>
						В счёте визита пока нет добавленных услуг
					</p>
					<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Добавьте выполненные манипуляции в приём для расчёта распределения франшизы и страхового покрытия ДМС.
					</p>
				</div>
			) : (
				<>
					{/* Информационный сплит-баннер (Директива 1 THE HAMMER) */}
					<div className="dms-split-summary-banner" data-testid="dms-split-summary-banner">
						<div className="dms-banner-content">
							<ShieldCheck size={20} className="text-teal-600 shrink-0" />
							<div className="dms-banner-text">
								Покрыто ДМС: <strong className="text-teal-700 dark:text-teal-300 font-mono">{formatCurrencyKopecks(totalDmsCoveredKopecks)}</strong>
								<span className="dms-banner-divider"> | </span>
								Доплата пациента в кассу: <strong className="text-amber-700 dark:text-amber-300 font-mono">{formatCurrencyKopecks(totalPatientTotalKopecks)}</strong>
							</div>
						</div>
						<div className="dms-banner-sub font-mono">
							Чек 54-ФЗ: {formatCurrencyKopecks(totalPatientTotalKopecks)}
						</div>
					</div>

					{/* Сводные показатели визита */}
					<div className="dms-stats-row" style={{ marginBottom: "14px" }}>
						<div className="dms-stat-card">
							<span className="dms-stat-label">Общая сумма счета</span>
							<span className="dms-stat-value font-mono">
								{formatCurrencyKopecks(totalBillKopecks)}
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
								{formatCurrencyKopecks(totalDmsCoveredKopecks)}
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
								{formatCurrencyKopecks(totalPatientTotalKopecks)}
							</span>
						</div>
						<div className="dms-stat-card" style={{ borderColor: "rgba(13, 148, 136, 0.4)" }}>
							<span className="dms-stat-label">Остаток лимита ГП</span>
							<span
								className="dms-stat-value dms-stat-value-large font-mono font-bold text-[28px] leading-tight"
								style={{ color: "var(--teal, #0d9488)" }}
								data-testid="dms-stat-remaining-limit-value"
							>
								{formatCurrencyKopecks(remainingLimitKopecks)}
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
							Способ внесения доплаты пациентом ({formatCurrencyKopecks(totalPatientTotalKopecks)}):
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
										max={kopecksToRubles(totalPatientTotalKopecks)}
										step="100"
										value={mixedCashRub}
										onChange={(e) =>
											setMixedCashRub(
												Math.max(
													0,
													Math.min(
														kopecksToRubles(totalPatientTotalKopecks),
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
										{paymentSplit ? formatCurrencyKopecks(paymentSplit.cardKopecks) : "0,00 ₽"}
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
									Наличные: <strong>{formatCurrencyKopecks(paymentSplit.cashKopecks)}</strong>
								</span>
								<span>&bull;</span>
								<span>
									Банковская карта: <strong>{formatCurrencyKopecks(paymentSplit.cardKopecks)}</strong>
								</span>
								<span>&bull;</span>
								<span style={{ color: "var(--ok-fg, #059669)", fontWeight: 600 }}>
									<Check size={12} className="inline mr-1" />
									Сумма доплаты сходится с чеком
								</span>
							</div>
						)}
					</div>

					{/* ДЕСКТОП: Детализация услуг визита (Таблица) */}
					<div className="dms-desktop-table-container dms-table-container">
						<table className="dms-table">
							<thead>
								<tr>
									<th>Код услуги</th>
									<th>Наименование услуги</th>
									<th>Зуб FDI</th>
									<th>Стоимость</th>
									<th>ДМС покрывает</th>
									<th>Пациент оплачивает</th>
									<th>Режим / Основание</th>
								</tr>
							</thead>
							<tbody>
								{effectiveLines.map((line) => {
									const itemId = line.lineItemId || line.id || "";
									return (
										<tr key={line.id}>
											<td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary, #0284c7)" }}>
												{line.serviceCode804n}
											</td>
											<td style={{ fontWeight: 500 }}>{line.serviceName}</td>
											<td style={{ fontFamily: "monospace" }}>{line.toothNumber || "—"}</td>
											<td style={{ fontFamily: "monospace", fontWeight: 600 }}>
												{formatCurrencyKopecks(line.totalKopecks)}
											</td>
											<td style={{ fontFamily: "monospace", color: "var(--teal, #0d9488)", fontWeight: 700 }}>
												{formatCurrencyKopecks(line.effectiveDmsKopecks)}
											</td>
											<td style={{ fontFamily: "monospace", color: line.effectivePatientKopecks > 0 ? "var(--warn-fg, #d97706)" : "inherit", fontWeight: 700 }}>
												{formatCurrencyKopecks(line.effectivePatientKopecks)}
											</td>
											<td>
												<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
													{/* Интерактивный 1-клик переключатель */}
													<div className="dms-split-switcher-group">
														<button
															type="button"
															className={`dms-switcher-btn ${line.overrideMode === "auto" ? "active" : ""}`}
															onClick={() => handleSetOverride(itemId, "auto")}
															title="Автоматический расчет по договору и франшизе"
														>
															Авто
														</button>
														<button
															type="button"
															className={`dms-switcher-btn ${line.overrideMode === "dms" ? "active" : ""}`}
															onClick={() => handleSetOverride(itemId, "dms")}
															title="100% за счет страховой ДМС"
														>
															ДМС
														</button>
														<button
															type="button"
															className={`dms-switcher-btn ${line.overrideMode === "patient" ? "active" : ""}`}
															onClick={() => handleSetOverride(itemId, "patient")}
															title="100% за счет пациента"
														>
															Пациент
														</button>
														<button
															type="button"
															className={`dms-switcher-btn ${line.overrideMode === "split_50" ? "active" : ""}`}
															onClick={() => handleSetOverride(itemId, "split_50")}
															title="Разделить 50/50"
														>
															50/50
														</button>
													</div>

													<span style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>
														{line.splitReason || (line.effectivePatientKopecks === 0 ? "Одобрено 100%" : "Франшиза")}
													</span>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
							<tfoot>
								<tr className="dms-table-totals">
									<td colSpan={3}>ИТОГО К РАСПРЕДЕЛЕНИЮ:</td>
									<td style={{ fontFamily: "monospace" }}>
										{formatCurrencyKopecks(totalBillKopecks)}
									</td>
									<td style={{ fontFamily: "monospace", color: "var(--teal, #0d9488)" }}>
										{formatCurrencyKopecks(totalDmsCoveredKopecks)}
									</td>
									<td style={{ fontFamily: "monospace", color: "var(--warn-fg, #d97706)" }}>
										{formatCurrencyKopecks(totalPatientTotalKopecks)}
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

					{/* МОБИЛЬНЫЙ ВИД (<768px): Нативные Grouped Cards (Apple iOS HIG) */}
					<div className="dms-mobile-grouped-list">
						{effectiveLines.map((line) => {
							const itemId = line.lineItemId || line.id || "";
							return (
								<div key={line.id} className="dms-mobile-grouped-card">
									<div className="dms-mobile-card-top">
										<div className="flex items-center gap-1.5 flex-wrap">
											<span className="dms-mobile-code-badge font-mono">
												{line.serviceCode804n}
											</span>
											{line.toothNumber && (
												<span className="dms-mobile-tooth-badge font-mono">
													Зуб {line.toothNumber}
												</span>
											)}
										</div>
										<div className="dms-mobile-card-price font-mono font-bold">
											{formatCurrencyKopecks(line.totalKopecks)}
										</div>
									</div>

									<div className="dms-mobile-card-name">
										{line.serviceName}
									</div>

									{/* 1-клик переключатель ДМС / Пациент / Сплит 50/50 / Авто */}
									<div className="dms-mobile-segmented-control">
										<button
											type="button"
											className={`dms-mobile-segment-btn ${line.overrideMode === "dms" ? "active" : ""}`}
											onClick={() => handleSetOverride(itemId, "dms")}
										>
											ДМС
										</button>
										<button
											type="button"
											className={`dms-mobile-segment-btn ${line.overrideMode === "patient" ? "active" : ""}`}
											onClick={() => handleSetOverride(itemId, "patient")}
										>
											Пациент
										</button>
										<button
											type="button"
											className={`dms-mobile-segment-btn ${line.overrideMode === "split_50" ? "active" : ""}`}
											onClick={() => handleSetOverride(itemId, "split_50")}
										>
											Сплит 50/50
										</button>
										<button
											type="button"
											className={`dms-mobile-segment-btn ${line.overrideMode === "auto" ? "active" : ""}`}
											onClick={() => handleSetOverride(itemId, "auto")}
										>
											Авто
										</button>
									</div>

									{/* Финансовый итог строки */}
									<div className="dms-mobile-card-breakdown">
										<div className="dms-mobile-breakdown-row">
											<span className="text-[var(--muted,#64748b)]">Покрыто ДМС:</span>
											<span className="font-mono font-bold text-teal-600 dark:text-teal-400">
												{formatCurrencyKopecks(line.effectiveDmsKopecks)}
											</span>
										</div>
										<div className="dms-mobile-breakdown-row">
											<span className="text-[var(--muted,#64748b)]">Доплата в кассу:</span>
											<span className="font-mono font-bold text-amber-600 dark:text-amber-400">
												{formatCurrencyKopecks(line.effectivePatientKopecks)}
											</span>
										</div>
									</div>

									<div className="dms-mobile-card-status">
										<span className="dms-badge dms-badge-active" style={{ fontSize: "0.6875rem" }}>
											{line.splitReason || (line.effectivePatientKopecks === 0 ? "Одобрено 100%" : "Франшиза")}
										</span>
									</div>
								</div>
							);
						})}
					</div>

					{/* Кнопка переноса в кассу (на мобильных — липкая плашка в зоне большого пальца) */}
					{onApplySplitToPayment && mappedItems.length > 0 && (
						<div className="dms-checkout-action-wrap">
							<button
								type="button"
								onClick={() => {
									const totalDueRub = kopecksToRubles(totalBillKopecks);
									const dmsRub = kopecksToRubles(totalDmsCoveredKopecks);
									const patientRub = kopecksToRubles(totalPatientTotalKopecks);
									const patientCashRub = paymentSplit ? kopecksToRubles(paymentSplit.cashKopecks) : undefined;
									const patientCardRub = paymentSplit ? kopecksToRubles(paymentSplit.cardKopecks) : undefined;

									onApplySplitToPayment({
										totalDueRub,
										dmsRub,
										patientRub,
										patientMethod: paymentMethod,
										patientCashRub,
										patientCardRub,
										letterId: letter.id,
										letterNumber: letter.letterNumber,
										insurerName: letter.insurerName,
									});
								}}
								className="dms-btn dms-btn-primary primary-button dms-cta-apply-checkout"
								data-testid="btn-apply-dms-split-to-checkout"
							>
								<Split size={16} />
								<span>
									Перенести расчет в кассу (ДМС {kopecksToRubles(totalDmsCoveredKopecks)} ₽ + Пациент {kopecksToRubles(totalPatientTotalKopecks)} ₽)
								</span>
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
