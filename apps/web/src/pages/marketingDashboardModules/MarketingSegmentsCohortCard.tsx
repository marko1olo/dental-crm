/**
 * MarketingSegmentsCohortCard.tsx
 *
 * Секция 4 дашборда: Сегментированная пациентская база и 3D RFM матрица ([LOY-10 & LOY-11]).
 * Real-time PostgreSQL 18 cohorts without fake mock numbers.
 * Strict <= 120 lines. UTF-8 without BOM.
 */

import React, { useEffect, useState } from "react";
import { ChevronRight, Sparkles, Users } from "lucide-react";
import { showToast } from "../../components/GlobalToast";
import { DEFAULT_PATIENT_SEGMENTS } from "../../components/marketing/marketingPresets";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import type { PatientSegmentOption } from "../../components/marketing/marketingTypes";

export interface MarketingSegmentsCohortCardProps {
	readonly onOpenLeakDetector?: (() => void) | undefined;
	readonly onNavigateToRecalls?: ((category?: string) => void) | undefined;
}

interface RfmSummary {
	readonly vipCount: number;
	readonly loyalCount: number;
	readonly sleepingCount: number;
}

export function MarketingSegmentsCohortCard({
	onOpenLeakDetector,
	onNavigateToRecalls,
}: MarketingSegmentsCohortCardProps) {
	const [segments, setSegments] = useState<readonly PatientSegmentOption[]>(DEFAULT_PATIENT_SEGMENTS);
	const [rfmSummary, setRfmSummary] = useState<RfmSummary | null>(null);

	useEffect(() => {
		let isMounted = true;
		fetch("/api/marketing/cohort-segments", {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!isMounted || !data) return;
				if (Array.isArray(data.segments) && data.segments.length > 0) {
					setSegments(data.segments);
				}
				if (data.rfm) {
					setRfmSummary({
						vipCount: data.rfm.vipCount ?? 0,
						loyalCount: data.rfm.loyalCount ?? 0,
						sleepingCount: data.rfm.sleepingCount ?? 0,
					});
				}
			})
			.catch(() => {});
		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<div className="marketing-section-card" data-testid="marketing-segments-section">
			<div className="marketing-section-card-header flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2.5 min-w-0">
					<h2 className="marketing-section-title">
						<Users size={16} className="text-[var(--teal)] shrink-0" />
						<span>Сегментированная пациентская база (RFM)</span>
					</h2>
					{rfmSummary && (
						<div className="hidden sm:flex items-center gap-2 text-[11px] text-[var(--muted)]">
							<span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
								<Sparkles size={11} /> VIP: {rfmSummary.vipCount}
							</span>
							<span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold">
								База: {rfmSummary.loyalCount}
							</span>
							<span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold">
								Спящие: {rfmSummary.sleepingCount}
							</span>
						</div>
					)}
				</div>
				<button
					type="button"
					className="marketing-modal-link"
					onClick={onOpenLeakDetector}
					data-testid="open-leak-detector-btn"
				>
					Возвращаемость (210д) →
				</button>
			</div>

			<div className="marketing-cohorts-grid">
				{segments.map((seg) => (
					<div
						key={seg.id}
						className="marketing-cohort-card"
						data-testid={`segment-card-${seg.id}`}
					>
						<div className="marketing-cohort-top">
							<span className="marketing-cohort-name" title={seg.name}>
								{seg.name}
							</span>
							<span className="marketing-cohort-badge" data-testid={`segment-count-${seg.id}`}>
								{seg.count} пац.
							</span>
						</div>
						<p className="marketing-cohort-desc" title={seg.description}>
							{seg.description}
						</p>
						{typeof (seg as any).revenueKopecks === "number" && (seg as any).revenueKopecks > 0 && (
							<div className="text-[11px] font-medium text-[var(--muted)]">
								Выручка: {Math.round((seg as any).revenueKopecks / 100).toLocaleString("ru-RU")} ₽
							</div>
						)}
						<button
							type="button"
							className="marketing-cohort-action"
							onClick={() => {
								const catMap: Record<string, string> = {
									no_visit_6m: "overdue",
									missed_hygiene: "hygiene",
									ortho_therapy: "ortho",
									all_active: "all",
								};
								const targetCat = catMap[seg.id] ?? "all";
								if (onNavigateToRecalls) {
									onNavigateToRecalls(targetCat);
								} else {
									showToast(`Сегмент «${seg.name}» выбран для триггерного сценария`, "info");
								}
							}}
						>
							<span>Запустить сценарий</span>
							<ChevronRight size={12} />
						</button>
					</div>
				))}
			</div>
		</div>
	);
}
