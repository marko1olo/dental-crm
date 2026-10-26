/**
 * useMarketingRecallsData.ts
 * Hook for loading, categorizing and filtering clinical recall candidates.
 * Governed by Mandate 8b (Strict <= 120 lines).
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { RecallReport } from "@dental/shared";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import type { MarketingRecallCandidate, RecallCategoryFilter, RecallStatsSummary } from "./marketingRecallsTypes";
import { DEMO_MARKETING_RECALLS } from "./marketingRecallsDemoData";

function deriveBadge(reason: string, band: string, months: number | null): { type: "hygiene" | "ortho" | "implant" | "general"; text: string } {
	const lower = (reason || "").toLowerCase();
	if (lower.includes("гигиен") || lower.includes("air-flow") || lower.includes("чистк")) {
		return { type: "hygiene", text: "Пора на гигиену • 6 мес" };
	}
	if (lower.includes("ортопед") || lower.includes("коронк") || lower.includes("винир")) {
		return { type: "ortho", text: "Осмотр после ортопедии • 1 год" };
	}
	if (lower.includes("имплант") || lower.includes("синус") || lower.includes("остео")) {
		return { type: "implant", text: "Контроль импланта • 3 мес" };
	}
	if (band === "overdue" || (months !== null && months > 12)) {
		return { type: "general", text: "Пропущен плановый осмотр" };
	}
	return { type: "general", text: "Плановый профосмотр • 6 мес" };
}

export function useMarketingRecallsData() {
	const appLogic = useOptionalAppLogicContext();
	const [candidates, setCandidates] = useState<readonly MarketingRecallCandidate[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeCategory, setActiveCategory] = useState<RecallCategoryFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [calledIds, setCalledIds] = useState<Set<string>>(new Set());

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const headers = appLogic?.auth ? appLogic.auth.denteClinicalReadHeaders() : {};
			const res = await fetch("/api/patients/recall-candidates?minMonths=1&limit=200", { headers });
			if (!res.ok) {
				if (isDemoShowcaseMode()) {
					setCandidates(DEMO_MARKETING_RECALLS);
					return;
				}
				throw new Error(`Сервер ответил ${res.status}`);
			}
			const data = (await res.json()) as RecallReport;
			const mapped: MarketingRecallCandidate[] = (data.candidates || []).map((c) => {
				const badge = deriveBadge(c.reason, c.band, c.monthsSinceLastVisit);
				return {
					id: c.patientId,
					patientId: c.patientId,
					fullName: c.fullName,
					phone: c.phone ?? null,
					badgeType: badge.type,
					badgeText: badge.text,
					procedureTitle: c.reason || "Профилактический осмотр",
					lastVisitDate: c.lastCompletedAt ?? null,
					monthsSinceLastVisit: c.monthsSinceLastVisit ?? null,
				};
			});
			setCandidates(mapped.length === 0 && isDemoShowcaseMode() ? DEMO_MARKETING_RECALLS : mapped);
		} catch (e) {
			if (isDemoShowcaseMode()) {
				setCandidates(DEMO_MARKETING_RECALLS);
			} else {
				setCandidates([]);
				setError(e instanceof Error ? e.message : "Не удалось загрузить кандидатов.");
			}
		} finally {
			setLoading(false);
		}
	}, [appLogic?.auth]);

	useEffect(() => { void load(); }, [load]);

	const markCalled = useCallback((id: string) => {
		setCalledIds((prev) => new Set(prev).add(id));
	}, []);

	const stats = useMemo<RecallStatsSummary>(() => {
		let hygiene = 0; let ortho = 0; let implant = 0; let overdue = 0;
		for (const c of candidates) {
			if (c.badgeType === "hygiene") hygiene++;
			else if (c.badgeType === "ortho") ortho++;
			else if (c.badgeType === "implant") implant++;
			if ((c.monthsSinceLastVisit ?? 0) > 6) overdue++;
		}
		return { total: candidates.length, hygieneCount: hygiene, orthoCount: ortho, implantCount: implant, overdueCount: overdue };
	}, [candidates]);

	const filtered = useMemo(() => {
		return candidates.filter((c) => {
			if (activeCategory === "hygiene" && c.badgeType !== "hygiene") return false;
			if (activeCategory === "ortho" && c.badgeType !== "ortho") return false;
			if (activeCategory === "implant" && c.badgeType !== "implant") return false;
			if (activeCategory === "overdue" && (c.monthsSinceLastVisit ?? 0) <= 6) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				return c.fullName.toLowerCase().includes(q) || (c.phone ?? "").includes(q);
			}
			return true;
		});
	}, [candidates, activeCategory, searchQuery]);

	return { candidates: filtered, allCount: candidates.length, loading, error, activeCategory, setActiveCategory, searchQuery, setSearchQuery, calledIds, markCalled, stats, reload: load };
}
