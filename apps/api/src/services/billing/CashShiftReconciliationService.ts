export type ShiftStatus = "open" | "closed" | "discrepancy_flagged";

export interface PaymentMethodBreakdown {
	cashRub: number;
	sberTerminalRub: number;
	sbpQrRub: number;
	bonusAdvanceRub: number;
}

export interface ShiftReconciliationInput {
	shiftId: string;
	organizationId: string;
	operatorId: string;
	expectedAmounts: PaymentMethodBreakdown;
	actualCashInDrawerRub: number;
	actualSberTerminalSlipTotalRub: number;
	openedAt: Date;
	closedAt?: Date;
}

export interface ShiftReconciliationResult {
	shiftId: string;
	organizationId: string;
	operatorId: string;
	status: ShiftStatus;
	totalRevenueRub: number;
	cashExpectedRub: number;
	cashActualRub: number;
	cashDiscrepancyRub: number;
	cardExpectedRub: number;
	cardActualRub: number;
	cardDiscrepancyRub: number;
	sbpQrTotalRub: number;
	bonusAdvanceTotalRub: number;
	hasDiscrepancy: boolean;
	discrepancySummary: string | null;
	zReportData: {
		shiftNumber: string;
		grossRevenueRub: number;
		fiscalCashRub: number;
		fiscalElectronicRub: number;
		closedAt: Date;
	};
}

export class CashShiftReconciliationService {
	/**
	 * Сверка кассовой смены и выявление расхождений
	 */
	public static reconcileShift(input: ShiftReconciliationInput): ShiftReconciliationResult {
		const cashExpected = Number(input.expectedAmounts.cashRub.toFixed(2));
		const cashActual = Number(input.actualCashInDrawerRub.toFixed(2));
		const cashDiscrepancy = Number((cashActual - cashExpected).toFixed(2));

		const cardExpected = Number(input.expectedAmounts.sberTerminalRub.toFixed(2));
		const cardActual = Number(input.actualSberTerminalSlipTotalRub.toFixed(2));
		const cardDiscrepancy = Number((cardActual - cardExpected).toFixed(2));

		const sbpQr = Number(input.expectedAmounts.sbpQrRub.toFixed(2));
		const bonus = Number(input.expectedAmounts.bonusAdvanceRub.toFixed(2));

		const totalRevenue = Number((cashActual + cardActual + sbpQr + bonus).toFixed(2));
		const hasDiscrepancy = cashDiscrepancy !== 0 || cardDiscrepancy !== 0;

		const discrepancyReasons: string[] = [];
		if (cashDiscrepancy > 0) {
			discrepancyReasons.push(`Излишек наличных в кассе: +${cashDiscrepancy} руб.`);
		} else if (cashDiscrepancy < 0) {
			discrepancyReasons.push(`Недостача наличных в кассе: ${cashDiscrepancy} руб.`);
		}

		if (cardDiscrepancy > 0) {
			discrepancyReasons.push(`Излишек по терминалу Сбера: +${cardDiscrepancy} руб.`);
		} else if (cardDiscrepancy < 0) {
			discrepancyReasons.push(`Недостача по терминалу Сбера: ${cardDiscrepancy} руб.`);
		}

		const closedAt = input.closedAt ?? new Date();

		return {
			shiftId: input.shiftId,
			organizationId: input.organizationId,
			operatorId: input.operatorId,
			status: hasDiscrepancy ? "discrepancy_flagged" : "closed",
			totalRevenueRub: totalRevenue,
			cashExpectedRub: cashExpected,
			cashActualRub: cashActual,
			cashDiscrepancyRub: cashDiscrepancy,
			cardExpectedRub: cardExpected,
			cardActualRub: cardActual,
			cardDiscrepancyRub: cardDiscrepancy,
			sbpQrTotalRub: sbpQr,
			bonusAdvanceTotalRub: bonus,
			hasDiscrepancy,
			discrepancySummary: hasDiscrepancy ? discrepancyReasons.join(" | ") : null,
			zReportData: {
				shiftNumber: input.shiftId,
				grossRevenueRub: totalRevenue,
				fiscalCashRub: cashActual,
				fiscalElectronicRub: Number((cardActual + sbpQr).toFixed(2)),
				closedAt,
			},
		};
	}
}
