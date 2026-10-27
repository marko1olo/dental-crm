/**
 * useOmnichannelNpsState.ts — Состояние дашборда NPS, расчет метрик и триаж отзывов.
 * Строго <= 120 строк по Мандату 8b.
 */

import { useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import { DEFAULT_NPS_REVIEWS, calculateNpsMetrics } from "../../omnichannelEngine.js";
import type { NpsReview, NpsReviewStatus } from "../types.js";

export function useOmnichannelNpsState() {
	const isSsrOrDemo = typeof window === "undefined" || isDemoShowcaseMode();
	const [npsReviews, setNpsReviews] = useState<readonly NpsReview[]>(() =>
		isSsrOrDemo ? DEFAULT_NPS_REVIEWS : [],
	);
	const [npsFilterUrgency, setNpsFilterUrgency] = useState<string>("all");
	const [npsFilterStatus, setNpsFilterStatus] = useState<string>("all");

	const npsMetrics = useMemo(() => calculateNpsMetrics(npsReviews), [npsReviews]);

	const filteredNpsReviews = useMemo(() => {
		return npsReviews.filter((r) => {
			if (npsFilterUrgency !== "all") {
				if (npsFilterUrgency === "critical" && r.urgency !== "critical") return false;
				if (npsFilterUrgency === "detractor" && r.category !== "detractor") return false;
				if (npsFilterUrgency === "promoter" && r.category !== "promoter") return false;
				if (npsFilterUrgency === "neutral" && r.category !== "neutral") return false;
			}
			if (npsFilterStatus !== "all" && r.status !== npsFilterStatus) return false;
			return true;
		});
	}, [npsReviews, npsFilterUrgency, npsFilterStatus]);

	const handleUpdateNpsStatus = (reviewId: string, newStatus: NpsReviewStatus) => {
		setNpsReviews((prev) =>
			prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r)),
		);
	};

	return {
		npsReviews,
		setNpsReviews,
		npsMetrics,
		filteredNpsReviews,
		npsFilterUrgency,
		setNpsFilterUrgency,
		npsFilterStatus,
		setNpsFilterStatus,
		handleUpdateNpsStatus,
	};
}
