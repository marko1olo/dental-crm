/**
 * DmsBillSplitCalculatorSection.tsx — Интерактивный калькулятор разделения счета за визит
 * между страховой компанией (ДМС) и пациентом (наличные / безналичные / смешанная оплата).
 */

import { Calculator, Split } from "lucide-react";
import React from "react";
import { formatCurrencyKopecks, kopecksToRubles } from "./dmsSplitEngine.js";
import {
	DmsBillSplitDesktopTable,
	DmsBillSplitMobileCards,
	DmsBillSplitPaymentMethodSelector,
	DmsBillSplitSummaryBanner,
	useDmsBillSplitLogic,
	type DmsBillSplitCalculatorSectionProps,
} from "./dmsBillSplitCalculator/index.js";

export { DEMO_VISIT_BILL_ITEMS } from "./dmsBillSplitCalculator/types.js";
export type { DmsBillSplitCalculatorSectionProps } from "./dmsBillSplitCalculator/types.js";

export function DmsBillSplitCalculatorSection({ letter, billItems, onApplySplitToPayment }: DmsBillSplitCalculatorSectionProps) {
	const {
		mappedItems, effectiveLines, totalBillKopecks, totalDmsCoveredKopecks,
		totalPatientTotalKopecks, remainingLimitKopecks, paymentMethod,
		setPaymentMethod, mixedCashRub, setMixedCashRub, paymentSplit, handleSetOverride,
	} = useDmsBillSplitLogic(letter, billItems);

	return (
		<div className="dms-card" style={{ marginTop: "16px" }}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
				<h3 className="dms-card-title" style={{ margin: 0 }}>
					<Calculator size={18} className="text-teal-600" />
					5. Калькулятор распределения счета визита (ДМС / Пациент: Нал / Безнал)
				</h3>
				<span className="dms-badge dms-badge-active" style={{ fontSize: "0.6875rem", textTransform: "none" }}>
					Баланс 100% (копейка в копейку)
				</span>
			</div>
			<p style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", margin: "0 0 12px 0" }}>
				Автоматическое распределение позиций визита с учетом лимита ({formatCurrencyKopecks(letter.maxCoverageKopecks ?? 0)}),
				франшизы ({letter.franchisePercent && letter.franchisePercent > 0 ? `${letter.franchisePercent}%` : `${formatCurrencyKopecks(letter.franchiseFixedKopecks ?? 0)}`})
				и условий программы.
			</p>
			{mappedItems.length === 0 ? (
				<div style={{ padding: "20px", borderRadius: "10px", border: "1px dashed var(--line, #cbd5e1)", textAlign: "center", backgroundColor: "var(--paper-soft, #f8fafc)", margin: "8px 0" }} data-testid="empty-dms-bill-items">
					<Split size={24} style={{ margin: "0 auto 8px", opacity: 0.5, color: "var(--teal, #0d9488)" }} />
					<p style={{ fontWeight: 600, fontSize: "0.875rem", margin: "0 0 4px", color: "var(--ink, #0f172a)" }}>
						В счёте визита пока нет добавленных услуг
					</p>
					<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
						Добавьте выполненные манипуляции в приём для расчёта покрытия ДМС.
					</p>
				</div>
			) : (
				<>
					<DmsBillSplitSummaryBanner
						totalDmsCoveredKopecks={totalDmsCoveredKopecks} totalPatientTotalKopecks={totalPatientTotalKopecks}
						totalBillKopecks={totalBillKopecks} remainingLimitKopecks={remainingLimitKopecks}
					/>
					<DmsBillSplitPaymentMethodSelector
						paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
						mixedCashRub={mixedCashRub} setMixedCashRub={setMixedCashRub}
						totalPatientTotalKopecks={totalPatientTotalKopecks} paymentSplit={paymentSplit}
					/>
					<DmsBillSplitDesktopTable
						effectiveLines={effectiveLines} totalBillKopecks={totalBillKopecks}
						totalDmsCoveredKopecks={totalDmsCoveredKopecks} totalPatientTotalKopecks={totalPatientTotalKopecks}
						onSetOverride={handleSetOverride}
					/>
					<DmsBillSplitMobileCards effectiveLines={effectiveLines} onSetOverride={handleSetOverride} />
					{onApplySplitToPayment && mappedItems.length > 0 && (
						<div className="dms-checkout-action-wrap">
							<button
								type="button"
								onClick={() => {
									onApplySplitToPayment({
										totalDueRub: kopecksToRubles(totalBillKopecks),
										dmsRub: kopecksToRubles(totalDmsCoveredKopecks),
										patientRub: kopecksToRubles(totalPatientTotalKopecks),
										patientMethod: paymentMethod,
										patientCashRub: paymentSplit ? kopecksToRubles(paymentSplit.cashKopecks) : undefined,
										patientCardRub: paymentSplit ? kopecksToRubles(paymentSplit.cardKopecks) : undefined,
										letterId: letter.id, letterNumber: letter.letterNumber, insurerName: letter.insurerName,
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
