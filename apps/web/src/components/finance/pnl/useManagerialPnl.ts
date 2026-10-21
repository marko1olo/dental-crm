import { useCallback, useEffect, useState } from "react";
import type { ManagerialPnlReport } from "@dental/shared";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { fetchManagerialPnl } from "../../../lib/managerialPnlApi";
import { showToast } from "../../GlobalToast";

export type ManagerialPnlPeriodPreset =
	| "current_month"
	| "prev_month"
	| "quarter"
	| "year";

export interface UseManagerialPnlOptions {
	readonly initialPreset?: ManagerialPnlPeriodPreset | undefined;
	readonly enabled?: boolean | undefined;
}

export interface UseManagerialPnlResult {
	readonly report: ManagerialPnlReport | null;
	readonly loading: boolean;
	readonly error: string | null;
	readonly periodPreset: ManagerialPnlPeriodPreset;
	readonly setPeriodPreset: (preset: ManagerialPnlPeriodPreset) => void;
	readonly reload: () => Promise<void>;
	readonly dates: { from: string; to: string };
}

export function getDatesForPnlPreset(
	preset: ManagerialPnlPeriodPreset,
	referenceDate: Date = new Date(),
): { from: string; to: string } {
	const y = referenceDate.getFullYear();
	const m = referenceDate.getMonth();

	if (preset === "current_month") {
		const from = new Date(Date.UTC(y, m, 1)).toISOString().split("T")[0]!;
		const to = new Date(Date.UTC(y, m + 1, 0)).toISOString().split("T")[0]!;
		return { from, to };
	}
	if (preset === "prev_month") {
		const from = new Date(Date.UTC(y, m - 1, 1)).toISOString().split("T")[0]!;
		const to = new Date(Date.UTC(y, m, 0)).toISOString().split("T")[0]!;
		return { from, to };
	}
	if (preset === "quarter") {
		const quarterStartMonth = Math.floor(m / 3) * 3;
		const from = new Date(Date.UTC(y, quarterStartMonth, 1)).toISOString().split("T")[0]!;
		const to = new Date(Date.UTC(y, quarterStartMonth + 3, 0)).toISOString().split("T")[0]!;
		return { from, to };
	}
	// "year"
	const from = new Date(Date.UTC(y, 0, 1)).toISOString().split("T")[0]!;
	const to = new Date(Date.UTC(y, 11, 31)).toISOString().split("T")[0]!;
	return { from, to };
}

export function useManagerialPnl(
	options: UseManagerialPnlOptions = {},
): UseManagerialPnlResult {
	const { initialPreset = "current_month", enabled = true } = options;

	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;

	const [report, setReport] = useState<ManagerialPnlReport | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [periodPreset, setPeriodPreset] =
		useState<ManagerialPnlPeriodPreset>(initialPreset);

	const dates = getDatesForPnlPreset(periodPreset);

	const reload = useCallback(async () => {
		if (!auth?.denteClinicalReadHeaders) return;
		try {
			setLoading(true);
			setError(null);
			const headers = auth.denteClinicalReadHeaders();
			const activeDates = getDatesForPnlPreset(periodPreset);
			const res = await fetchManagerialPnl(headers, activeDates);
			setReport(res.data || null);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setError(msg);
			showToast(`Ошибка отчета P&L: ${msg}`, "error");
		} finally {
			setLoading(false);
		}
	}, [auth, periodPreset]);

	useEffect(() => {
		if (enabled) {
			void reload();
		}
	}, [enabled, periodPreset, reload]);

	return {
		report,
		loading,
		error,
		periodPreset,
		setPeriodPreset,
		reload,
		dates,
	};
}
