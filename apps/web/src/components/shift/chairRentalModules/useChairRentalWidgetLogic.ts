import { useEffect, useMemo, useState } from "react";
import {
	calculateChairRentalEconomics,
	type ChairRentalModel,
	type ChairRentalResult,
} from "@dental/shared";
import { useChairRentalSessionTimer } from "./useChairRentalSessionTimer";

export interface UseChairRentalWidgetLogicParams {
	initialGrossRevenueRub?: number;
	initialHoursWorked?: number;
	initialLabExpensesRub?: number;
	initialConsumablesRub?: number;
	initialRentalActive?: boolean;
	initialChairId?: string;
	externalOpenActTrigger?: number;
	onEconomicsChange?: (econ: ChairRentalResult) => void;
	onRentalSessionChange?: (session: { isActive: boolean; chairId: string; startedAt?: string }) => void;
}

export function useChairRentalWidgetLogic(params: UseChairRentalWidgetLogicParams) {
	const timer = useChairRentalSessionTimer({
		initialRentalActive: params.initialRentalActive,
		initialChairId: params.initialChairId,
		onRentalSessionChange: params.onRentalSessionChange,
	});

	const [model, setModel] = useState<ChairRentalModel>("hourly");
	const [hourlyRateRub, setHourlyRateRub] = useState<number>(1500);
	const [shiftRateRub, setShiftRateRub] = useState<number>(4000);
	const [landlordPercent, setLandlordPercent] = useState<number>(25);
	const [monthlyRateRub, setMonthlyRateRub] = useState<number>(66000);
	const [workingDaysInMonth, setWorkingDaysInMonth] = useState<number>(22);

	const [hoursWorked, setHoursWorked] = useState<number>(params.initialHoursWorked ?? 0);
	const [shiftsCount, setShiftsCount] = useState<number>(1);
	const [grossRevenueRub, setGrossRevenueRub] = useState<number>(params.initialGrossRevenueRub ?? 0);
	const [labExpensesRub, setLabExpensesRub] = useState<number>(params.initialLabExpensesRub ?? 0);
	const [consumablesRub, setConsumablesRub] = useState<number>(params.initialConsumablesRub ?? 0);
	const [isActModalOpen, setIsActModalOpen] = useState<boolean>(false);

	useEffect(() => {
		if ((params.externalOpenActTrigger ?? 0) > 0) setIsActModalOpen(true);
	}, [params.externalOpenActTrigger]);

	useEffect(() => {
		if (typeof params.initialGrossRevenueRub === "number") setGrossRevenueRub(params.initialGrossRevenueRub);
	}, [params.initialGrossRevenueRub]);

	useEffect(() => {
		if (typeof params.initialHoursWorked === "number" && params.initialHoursWorked > 0) setHoursWorked(params.initialHoursWorked);
	}, [params.initialHoursWorked]);

	useEffect(() => {
		if (typeof params.initialLabExpensesRub === "number") setLabExpensesRub(params.initialLabExpensesRub);
	}, [params.initialLabExpensesRub]);

	useEffect(() => {
		if (typeof params.initialConsumablesRub === "number") setConsumablesRub(params.initialConsumablesRub);
	}, [params.initialConsumablesRub]);

	const economics: ChairRentalResult = useMemo(() => calculateChairRentalEconomics({
		model,
		hourlyRateKopecks: Math.round(Math.max(0, hourlyRateRub) * 100),
		hoursWorked: Math.max(0, hoursWorked),
		shiftRateKopecks: Math.round(Math.max(0, shiftRateRub) * 100),
		shiftsCount: Math.max(1, shiftsCount),
		landlordPercent: Math.min(100, Math.max(0, landlordPercent)),
		monthlyRateKopecks: Math.round(Math.max(0, monthlyRateRub) * 100),
		workingDaysInMonth: Math.max(1, workingDaysInMonth),
		grossRevenueKopecks: Math.round(Math.max(0, grossRevenueRub) * 100),
		labExpensesKopecks: Math.round(Math.max(0, labExpensesRub) * 100),
		consumablesKopecks: Math.round(Math.max(0, consumablesRub) * 100),
	}), [model, hourlyRateRub, hoursWorked, shiftRateRub, shiftsCount, landlordPercent, monthlyRateRub, workingDaysInMonth, grossRevenueRub, labExpensesRub, consumablesRub]);

	useEffect(() => {
		params.onEconomicsChange?.(economics);
	}, [economics, params.onEconomicsChange]);

	return {
		isRentalActive: timer.isRentalActive,
		selectedChairId: timer.selectedChairId,
		setSelectedChairId: timer.setSelectedChairId,
		sessionElapsedMinutes: timer.sessionElapsedMinutes,
		handleStartRentalSession: () => timer.handleStartRentalSession(model, model === "hourly" ? hourlyRateRub : shiftRateRub),
		handleStopRentalSession: timer.handleStopRentalSession,
		model, setModel, hourlyRateRub, setHourlyRateRub, shiftRateRub, setShiftRateRub,
		landlordPercent, setLandlordPercent, monthlyRateRub, setMonthlyRateRub, workingDaysInMonth, setWorkingDaysInMonth,
		hoursWorked, setHoursWorked, shiftsCount, setShiftsCount, grossRevenueRub, setGrossRevenueRub,
		isActModalOpen, setIsActModalOpen, economics,
	};
}
