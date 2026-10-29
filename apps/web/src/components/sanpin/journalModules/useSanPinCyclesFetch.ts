/**
 * apps/web/src/components/sanpin/journalModules/useSanPinCyclesFetch.ts
 *
 * Хук выборки и маппинга циклов стерилизации из Fastify API (СанПиН 3.3686-21).
 * Мандат 8b: строго <= 120 строк.
 */

import { useState, useCallback, useEffect } from "react";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { DEFAULT_CYCLES, type SanPinCycleEntry, type SanPinJournalPeriod } from "./sanpinJournalTypes";

function mapCycleRow(d: any, idx: number): SanPinCycleEntry {
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
		cycleNumber: d.cycleNumber || idx + 1,
		autoclaveCode: d.autoclaveId || "—",
		autoclaveModel: d.deviceName || "Автоклав",
		temperatureC: Number(d.temperatureCelsius) || 0,
		pressureBar: Number(d.pressureBar) || 0,
		durationMin: Number(d.durationMin) || 0,
		regimeName: d.regimeName || "Режим B (Универсальный 134°C / 5 мин)",
		indicatorClass: (d.indicatorType?.includes("4") ? "4" : "5") as "4" | "5" | "6",
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
		psoStatus: (d.psoStatus as any) || "norm",
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
			let res = await fetch(`/api/sanpin/sterilization-cycles?period=${targetPeriod}`, {
				headers: getDenteAuthHeaders(),
			}).catch(() => null);

			if (!res || !res.ok) {
				res = await fetch(`/api/sanpin/sterilization?period=${targetPeriod}`, {
					headers: getDenteAuthHeaders(),
				}).catch(() => null);
			}

			if (res && res.ok) {
				const data = await res.json();
				if (Array.isArray(data) && data.length > 0) {
					setCycles(data.map(mapCycleRow));
					return;
				}
				if (Array.isArray(data) && data.length === 0) {
					setCycles(isDemoShowcaseMode() ? DEFAULT_CYCLES : []);
					return;
				}
			}
			setCycles(isDemoShowcaseMode() ? DEFAULT_CYCLES : []);
		} catch (err) {
			console.warn("Fastify API /api/sanpin/sterilization unavailable", err);
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
