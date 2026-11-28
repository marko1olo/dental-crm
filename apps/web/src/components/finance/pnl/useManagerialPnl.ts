import { useCallback, useEffect, useState } from "react";
import { formatDateKeyInTimeZone, type ManagerialPnlReport } from "@dental/shared";
import { fetchManagerialPnl } from "../../../lib/managerialPnlApi";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
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
		const from = formatDateKeyInTimeZone(new Date(y, m, 1));
		const to = formatDateKeyInTimeZone(new Date(y, m + 1, 0));
		return { from, to };
	}
	if (preset === "prev_month") {
		const from = formatDateKeyInTimeZone(new Date(y, m - 1, 1));
		const to = formatDateKeyInTimeZone(new Date(y, m, 0));
		return { from, to };
	}
	if (preset === "quarter") {
		const quarterStartMonth = Math.floor(m / 3) * 3;
		const from = formatDateKeyInTimeZone(new Date(y, quarterStartMonth, 1));
		const to = formatDateKeyInTimeZone(new Date(y, quarterStartMonth + 3, 0));
		return { from, to };
	}
	// "year"
	const from = formatDateKeyInTimeZone(new Date(y, 0, 1));
	const to = formatDateKeyInTimeZone(new Date(y, 11, 31));
	return { from, to };
}

export function useManagerialPnl(
	options: UseManagerialPnlOptions = {},
): UseManagerialPnlResult {
	const { initialPreset = "current_month", enabled = true } = options;

	const [report, setReport] = useState<ManagerialPnlReport | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [periodPreset, setPeriodPreset] =
		useState<ManagerialPnlPeriodPreset>(initialPreset);

	const dates = getDatesForPnlPreset(periodPreset);

	const reload = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const headers = denteClinicalReadHeaders();
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
	}, [periodPreset]);

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
