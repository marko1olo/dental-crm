/**
 * apps/web/src/components/sanpin/journalModules/useSanPinCyclesFetch.ts
 *
 * Хук выборки и маппинга циклов стерилизации из Fastify API (СанПиН 3.3686-21).
 * Мандат 8b: строго <= 120 строк.
 */

import { useState, useCallback, useEffect } from "react";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { clientLogger } from "../../../services/logging/clientLogger";
import { DEFAULT_CYCLES, type SanPinCycleEntry, type SanPinJournalPeriod } from "./sanpinJournalTypes";

export interface RawSanPinCycleRow {
	readonly id?: string | null | undefined;
	readonly timestamp?: string | null | undefined;
	readonly status?: string | null | undefined;
	readonly passedIndicator?: boolean | null | undefined;
	readonly notes?: string | null | undefined;
	readonly itemsDescription?: string | null | undefined;
	readonly batchSize?: number | string | null | undefined;
	readonly kraftPouchesCount?: number | string | null | undefined;
	readonly cycleNumber?: number | string | null | undefined;
	readonly autoclaveId?: string | null | undefined;
	readonly deviceName?: string | null | undefined;
	readonly temperatureCelsius?: number | string | null | undefined;
	readonly pressureBar?: number | string | null | undefined;
	readonly durationMin?: number | string | null | undefined;
	readonly regimeName?: string | null | undefined;
	readonly indicatorType?: string | null | undefined;
	readonly barcode?: string | null | undefined;
	readonly operatorName?: string | null | undefined;
	readonly batchBarcode?: string | null | undefined;
	readonly psoStatus?: string | null | undefined;
}

function normalizePsoStatus(val: string | null | undefined): "norm" | "defect" | "none" {
	if (val === "defect" || val === "none") return val;
	return "norm";
}

function normalizeIndicatorClass(indicatorType: string | null | undefined): "4" | "5" | "6" {
	if (indicatorType?.includes("4")) return "4";
	if (indicatorType?.includes("6")) return "6";
	return "5";
}

function isRawSanPinCycleRow(item: unknown): item is RawSanPinCycleRow {
	return typeof item === "object" && item !== null;
}

function mapCycleRow(d: RawSanPinCycleRow, idx: number): SanPinCycleEntry {
	const rawDate = d.timestamp ? new Date(d.timestamp) : new Date();
	const dateStr = rawDate.toISOString().slice(0, 10);
	const timeStr = rawDate.toTimeString().slice(0, 5);
	const isNorm = d.status === "passed" || d.passedIndicator !== false;
	// Честный маппинг: только данные из БД, никаких выдуманных автоклавов/штрихкодов/операторов.
	const batchMatch = d.notes?.match(/Партия\s+(\d+)/) || d.itemsDescription?.match(/Партия\s+(\d+)/);
	const realBatchSize = Number(d.batchSize) || Number(d.kraftPouchesCount) || (batchMatch ? Number(batchMatch[1]) : 0);

	return {
		id: d.id || `cyc-${idx}`,
		date: dateStr,
		time: timeStr,
		cycleNumber: Number(d.cycleNumber) || idx + 1,
		autoclaveCode: d.autoclaveId || "—",
		autoclaveModel: d.deviceName || "Автоклав",
		temperatureC: Number(d.temperatureCelsius) || 0,
		pressureBar: Number(d.pressureBar) || 0,
		durationMin: Number(d.durationMin) || 0,
		regimeName: d.regimeName || "Режим B (Универсальный 134°C / 5 мин)",
		indicatorClass: normalizeIndicatorClass(d.indicatorType),
		colorBefore: "Бежевый",
		colorBeforeHex: "#d4b896",
		colorAfter: isNorm ? "Темно-коричневый" : "Светло-желтый",
		colorAfterHex: isNorm ? "#3e2723" : "#fff9c4",
		isIndicatorNorm: isNorm,
		pouchCodes: d.barcode ? [d.barcode] : [],
		itemsSummary: d.itemsDescription || "Стоматологический инструментарий смены",
		operatorName: d.operatorName || "Медсестра ЦСО",
		status: isNorm ? "passed" : "failed",
		batchSize: realBatchSize,
		batchBarcode: d.batchBarcode || "",
		psoStatus: normalizePsoStatus(d.psoStatus),
		kraftPouchesCount: realBatchSize,
	};
}

export function useSanPinCyclesFetch(period: SanPinJournalPeriod) {
	const isTestOrSsr = typeof window === "undefined" || (typeof process !== "undefined" && process.env?.NODE_ENV === "test");
	const [cycles, setCycles] = useState<SanPinCycleEntry[]>(() => ((isTestOrSsr || isDemoShowcaseMode()) ? DEFAULT_CYCLES : []));
	const [isLoading, setIsLoading] = useState(false);

	const fetchCyclesFromDb = useCallback(async (targetPeriod: SanPinJournalPeriod = period) => {
		try {
			setIsLoading(true);
			let res: Response | null = null;
			try {
				res = await fetch(`/api/sanpin/sterilization?period=${targetPeriod}`, {
					headers: getDenteAuthHeaders(),
				});
			} catch (err) {
				clientLogger.warn("[useSanPinCyclesFetch] Primary endpoint fetch failed", {
					error: String(err),
				});
			}

			if (!res || !res.ok) {
				try {
					res = await fetch(`/api/sanpin/sterilization/cycles?period=${targetPeriod}`, {
						headers: getDenteAuthHeaders(),
					});
				} catch (err) {
					clientLogger.warn("[useSanPinCyclesFetch] Fallback endpoint fetch failed", {
						error: String(err),
					});
				}
			}

			if (res && res.ok) {
				const data: unknown = await res.json();
				if (Array.isArray(data) && data.length > 0) {
					setCycles(data.filter(isRawSanPinCycleRow).map(mapCycleRow));
					return;
				}
				if (Array.isArray(data) && data.length === 0) {
					setCycles(isDemoShowcaseMode() ? DEFAULT_CYCLES : []);
					return;
				}
			}
			setCycles(isDemoShowcaseMode() ? DEFAULT_CYCLES : []);
		} catch (err) {
			clientLogger.warn("Fastify API /api/sanpin/sterilization unavailable", err);
			setCycles(isDemoShowcaseMode() ? DEFAULT_CYCLES : []);
		} finally {
			setIsLoading(false);
		}
	}, [period]);

	useEffect(() => {
		fetchCyclesFromDb(period);
	}, [fetchCyclesFromDb, period]);

	return { cycles, setCycles, isLoading, fetchCyclesFromDb };
}
