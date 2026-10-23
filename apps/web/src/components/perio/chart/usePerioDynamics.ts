/**
 * usePerioDynamics.ts — Хук динамики лечения пародонта ("Было / Стало").
 * Архитектурный слой Layer 3: Hook (Мандат 8b, <= 120 строк).
 */

import { calculatePerioDynamics, type PerioChartSummary, type PerioDynamicsSummary } from "@dental/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isDemoPatientId } from "../../../lib/demoMode";

export interface SnapshotIndicesData {
	readonly bop_pct?: number | undefined; readonly pi_pct?: number | undefined;
	readonly mean_pocket_depth_mm?: number | undefined; readonly max_pocket_depth_mm?: number | undefined;
	readonly cal_mean_mm?: number | undefined; readonly max_cal_mm?: number | undefined;
	readonly deep_pockets_count?: number | undefined; readonly total_sites_probed?: number | undefined;
	readonly total_teeth_examined?: number | undefined;
}

export interface HistoricalSnapshotItem {
	readonly id: string; readonly recordedAt: string; readonly status: string;
	readonly indices?: SnapshotIndicesData | undefined;
}

export interface UsePerioDynamicsOptions {
	readonly patientId?: string | undefined;
	readonly summary: PerioChartSummary;
	readonly previousSummary?: PerioChartSummary | null | undefined;
	readonly previousRecordedAt?: string | null | undefined;
}

export function usePerioDynamics({
	patientId, summary, previousSummary, previousRecordedAt,
}: UsePerioDynamicsOptions) {
	const [historicalSnapshots, setHistoricalSnapshots] = useState<readonly HistoricalSnapshotItem[]>([]);
	const [baselineSnapshot, setBaselineSnapshot] = useState<HistoricalSnapshotItem | null>(null);

	const refetchSnapshots = useCallback(async () => {
		if (!patientId || isDemoPatientId(patientId)) return;
		if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) return;

		try {
			const res = await fetch(`/api/periodontogram/patients/${patientId}/snapshots`);
			if (!res.ok) return;
			const json = (await res.json()) as { success: boolean; data?: HistoricalSnapshotItem[] };
			if (json.success && Array.isArray(json.data) && json.data.length > 0) {
				setHistoricalSnapshots(json.data);
				const latest = json.data[0];
				if (latest?.indices) setBaselineSnapshot(latest);
			}
		} catch { /* graceful offline fallback */ }
	}, [patientId]);

	useEffect(() => { void refetchSnapshots(); }, [refetchSnapshots]);

	const previousSnapshotSummary: PerioChartSummary | null = useMemo(() => {
		if (previousSummary) return previousSummary;
		if (!baselineSnapshot?.indices) return null;
		const idx = baselineSnapshot.indices;
		const deep = idx.deep_pockets_count ?? 0;
		return {
			riskCategory: deep > 5 ? "high" : deep > 0 ? "moderate" : "low",
			fmbsPercent: idx.bop_pct ?? 0, fmpsPercent: idx.pi_pct ?? 0,
			meanPocketDepthMm: idx.mean_pocket_depth_mm ?? 2.5, maxPocketDepthMm: idx.max_pocket_depth_mm ?? 3,
			meanCalMm: idx.cal_mean_mm ?? 2.5, maxCalMm: idx.max_cal_mm ?? 3,
			deepPocketsCount: deep, moderatePocketsCount: 0, sitesWithSuppurationCount: 0,
			sitesWithCalculusCount: 0, teethWithMobilityCount: 0, teethWithFurcationCount: 0,
			totalSitesProbed: 0, totalTeethExamined: 0,
		};
	}, [previousSummary, baselineSnapshot]);

	const previousSnapshotDate = useMemo(() => {
		if (previousRecordedAt) return previousRecordedAt;
		if (baselineSnapshot?.recordedAt) {
			try { return new Date(baselineSnapshot.recordedAt).toLocaleDateString("ru-RU"); } catch { return null; }
		}
		return null;
	}, [previousRecordedAt, baselineSnapshot]);

	const dynamics: PerioDynamicsSummary = useMemo(() => {
		return calculatePerioDynamics(summary, previousSnapshotSummary, {
			baselineDate: previousSnapshotDate, currentDate: new Date().toLocaleDateString("ru-RU"),
		});
	}, [summary, previousSnapshotSummary, previousSnapshotDate]);

	return { dynamics, historicalSnapshots, baselineSnapshot, refetchSnapshots };
}
