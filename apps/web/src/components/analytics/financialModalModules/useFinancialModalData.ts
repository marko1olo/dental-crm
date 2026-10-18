import { useEffect, useMemo, useState } from "react";
import { getDemoExecutiveAnalytics, isDemoShowcaseMode } from "../../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	type CashBoxRecord,
	type FinancialPeriodChoice,
	getFinancialPeriodDateRange,
} from "./FinancialCashflowTimeline";
import {
	computeFinancialPnlMetrics,
	type ExecutiveDepartmentData,
	type ExecutiveKpisData,
	type ExpenseReasonRecord,
} from "./FinancialPnlBreakdownSection";

export function useFinancialModalData(isOpen: boolean, initialPeriod: FinancialPeriodChoice = "month") {
	const [period, setPeriod] = useState<FinancialPeriodChoice>(initialPeriod);
	const [isLoading, setIsLoading] = useState(false);

	const [isDeptsExpanded, setIsDeptsExpanded] = useState(false);
	const [isCashBoxesExpanded, setIsCashBoxesExpanded] = useState(false);
	const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);

	const [executiveKpis, setExecutiveKpis] = useState<ExecutiveKpisData | null>(null);
	const [departments, setDepartments] = useState<ExecutiveDepartmentData[]>([]);
	const [cashBoxes, setCashBoxes] = useState<CashBoxRecord[]>([]);
	const [expenseReasons, setExpenseReasons] = useState<ExpenseReasonRecord[]>([]);
	const [realPnl, setRealPnl] = useState<any | null>(null);

	const loadFinancialData = async () => {
		if (!isOpen) return;
		setIsLoading(true);
		try {
			if (isDemoShowcaseMode()) {
				const demoPayload = getDemoExecutiveAnalytics(period);
				if (demoPayload?.kpis) setExecutiveKpis(demoPayload.kpis);
				if (Array.isArray(demoPayload?.departments)) setDepartments(demoPayload.departments);
				setCashBoxes([
					{ id: "box-1", name: "Основная касса (наличные)", code: "cash_main", balanceRub: 345000, isShiftOpen: true },
					{ id: "box-2", name: "Терминал эквайринга СБП", code: "terminal_sbp", balanceRub: 1890000, isShiftOpen: true },
					{ id: "box-3", name: "Расчетный счет ДМС", code: "checking_dms", balanceRub: 2615000, isShiftOpen: false },
				]);
				return;
			}

			const headers = denteAdminSecretRequestHeaders();
			const dates = getFinancialPeriodDateRange(period);
			const [execRes, cashRes, expRes, pnlRes] = await Promise.all([
				fetch(`/api/analytics/executive?period=${period}`, { headers }),
				fetch("/api/cash/cash-box", { headers }),
				fetch("/api/cash/expense-reasons", { headers }),
				fetch(`/api/reports/pnl?from=${dates.from}&to=${dates.to}`, { headers }),
			]);

			if (execRes.ok) {
				const json = await execRes.json();
				if (json?.data?.kpis) setExecutiveKpis(json.data.kpis);
				if (Array.isArray(json?.data?.departments)) setDepartments(json.data.departments);
			}
			if (cashRes.ok) {
				const json = await cashRes.json();
				if (Array.isArray(json?.data)) setCashBoxes(json.data);
			}
			if (expRes.ok) {
				const json = await expRes.json();
				if (Array.isArray(json?.data)) setExpenseReasons(json.data);
			}
			if (pnlRes.ok) {
				const json = await pnlRes.json();
				if (json?.data) setRealPnl(json.data);
			}
		} catch {
			// Graceful fallback
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadFinancialData();
	}, [isOpen, period]);

	const metrics = useMemo(
		() => computeFinancialPnlMetrics(executiveKpis, realPnl),
		[executiveKpis, realPnl],
	);

	const totalCashRub = useMemo(
		() => cashBoxes.reduce((acc, b) => acc + (Number(b.balanceRub) || 0), 0),
		[cashBoxes],
	);

	return {
		period,
		setPeriod,
		isLoading,
		isDeptsExpanded,
		setIsDeptsExpanded,
		isCashBoxesExpanded,
		setIsCashBoxesExpanded,
		isExpensesExpanded,
		setIsExpensesExpanded,
		executiveKpis,
		departments,
		cashBoxes,
		expenseReasons,
		realPnl,
		metrics,
		totalCashRub,
		loadFinancialData,
	};
}
