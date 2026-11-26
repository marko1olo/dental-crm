import { useCallback, useEffect, useState } from "react";
import {
	doctorTodayEarningsSummarySchema,
	type DoctorTodayEarningsSummary,
} from "@dental/shared";
import { getDenteAuthHeaders } from "../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../lib/demoMode";
import { logger } from "../utils/logger";

export interface UseDoctorTodayEarningsResult {
	readonly summary: DoctorTodayEarningsSummary | null;
	readonly isLoading: boolean;
	readonly refresh: () => Promise<void>;
}

const REFRESH_EVENT_NAMES = [
	"dente:visit-completed",
	"dente-invoice-created",
	"dente-cashbox-refresh",
	"dente:doctor-earnings-refresh",
] as const;

export function useDoctorTodayEarnings(
	enabled: boolean,
): UseDoctorTodayEarningsResult {
	const [summary, setSummary] = useState<DoctorTodayEarningsSummary | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const refresh = useCallback(async () => {
		if (!enabled || isDemoShowcaseMode()) {
			return;
		}
		setIsLoading(true);
		try {
			const res = await fetch("/api/doctor-portal/today-summary", {
				method: "GET",
				credentials: "include",
				headers: {
					...getDenteAuthHeaders(),
				},
			});
			if (!res.ok) {
				return;
			}
			const json = (await res.json()) as { data?: unknown } & Record<string, unknown>;
			const payload = json?.data ?? json;
			const parsed = doctorTodayEarningsSummarySchema.safeParse(payload);
			if (parsed.success) {
				setSummary(parsed.data);
			}
		} catch (err) {
			logger.warn("[useDoctorTodayEarnings] Не удалось загрузить дневной заработок врача:", err);
		} finally {
			setIsLoading(false);
		}
	}, [enabled]);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		void refresh();
	}, [enabled, refresh]);

	useEffect(() => {
		if (!enabled || typeof window === "undefined") {
			return;
		}
		const handleRefresh = () => {
			void refresh();
		};
		for (const eventName of REFRESH_EVENT_NAMES) {
			window.addEventListener(eventName, handleRefresh);
		}
		return () => {
			for (const eventName of REFRESH_EVENT_NAMES) {
				window.removeEventListener(eventName, handleRefresh);
			}
		};
	}, [enabled, refresh]);

	return { summary, isLoading, refresh };
}
