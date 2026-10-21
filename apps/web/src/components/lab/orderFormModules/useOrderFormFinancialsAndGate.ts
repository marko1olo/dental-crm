import { useMemo, useState } from "react";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import { rublesToKopecks } from "@dental/shared";
import { calculateLabFinancialSplit, formatGostOrderNumber } from "../labMath";
import { checkFittingAppointmentCollision } from "../dentalLabOrderEngine";
import { checkDentalLabFinancialGate } from "../dentalLabFinancialGateEngine";

export interface OrderFormFinancialsParams {
	readonly initialPriceRub?: number | null | undefined;
	readonly initialClinicShare?: number | undefined;
	readonly initialDoctorShare?: number | undefined;
	readonly stageTotalRub?: number | undefined;
	readonly stagePaidRub?: number | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
	readonly dueDate: string;
	readonly scheduledVisitDate: string;
	readonly propScheduledVisitDate?: string | undefined;
	readonly secureToken: string;
}

export function useOrderFormFinancialsAndGate(params: OrderFormFinancialsParams) {
	const [priceRubInput, setPriceRubInput] = useState<string>(
		params.initialPriceRub != null ? String(params.initialPriceRub) : "15000",
	);
	const [clinicSharePct, setClinicSharePct] = useState<number>(params.initialClinicShare ?? 50);
	const [doctorSharePct, setDoctorSharePct] = useState<number>(params.initialDoctorShare ?? 50);
	const [gateOverride, setGateOverride] = useState<{
		authorized: boolean;
		doctorName: string;
		timestampIso: string;
		reason: string;
	} | null>(null);

	const totalLabPriceRub = useMemo(() => {
		const parsed = normalizeRubAmountInput(priceRubInput);
		return parsed != null && parsed >= 0 ? parsed : 0;
	}, [priceRubInput]);

	const { doctorAmountRub } = useMemo(() => {
		return calculateLabFinancialSplit(totalLabPriceRub, doctorSharePct);
	}, [totalLabPriceRub, doctorSharePct]);

	const fittingCollision = useMemo(() => {
		const targetVisit = params.scheduledVisitDate || params.propScheduledVisitDate;
		return checkFittingAppointmentCollision(params.dueDate, targetVisit);
	}, [params.dueDate, params.scheduledVisitDate, params.propScheduledVisitDate]);

	const financialGateResult = useMemo(() => {
		const stageTotalKopecks = rublesToKopecks(params.stageTotalRub ?? totalLabPriceRub);
		const paidKopecks = rublesToKopecks(params.stagePaidRub ?? 0);
		const depositKopecks = rublesToKopecks(params.patientDepositRub ?? 0);
		const orderPriceKopecks = rublesToKopecks(totalLabPriceRub);

		return checkDentalLabFinancialGate({
			stageTotalKopecks,
			paidKopecks,
			availableDepositKopecks: depositKopecks,
			labOrderPriceKopecks: orderPriceKopecks,
			minAdvancePercent: 50,
			chiefDoctorOverride: gateOverride ?? undefined,
			doctorOverride: gateOverride ?? undefined,
			treatmentPlanAgeDays: params.treatmentPlanAgeDays,
			isPlanExpired: params.isPlanExpired,
		});
	}, [params.stageTotalRub, totalLabPriceRub, params.stagePaidRub, params.patientDepositRub, gateOverride, params.treatmentPlanAgeDays, params.isPlanExpired]);

	const gostOrderNumber = formatGostOrderNumber(params.secureToken);
	const portalUrl = `${typeof window !== "undefined" ? (window.location?.origin || "") : ""}/#/portal/lab-order/${params.secureToken}`;

	return {
		priceRubInput,
		setPriceRubInput,
		clinicSharePct,
		setClinicSharePct,
		doctorSharePct,
		setDoctorSharePct,
		gateOverride,
		setGateOverride,
		totalLabPriceRub,
		doctorAmountRub,
		fittingCollision,
		financialGateResult,
		gostOrderNumber,
		portalUrl,
	};
}
