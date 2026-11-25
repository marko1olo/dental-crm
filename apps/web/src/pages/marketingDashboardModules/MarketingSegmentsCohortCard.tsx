/**
 * MarketingSegmentsCohortCard.tsx
 *
 * Секция 4 дашборда: Сегментированная пациентская база и 3D RFM матрица ([LOY-10 & LOY-11]).
 * Real-time PostgreSQL 18 cohorts without fake mock numbers.
 * Strict <= 120 lines. UTF-8 without BOM.
 */

import React, { useEffect, useState } from "react";
import { ChevronRight, Sparkles, Users } from "lucide-react";
import { formatKopecksToRub } from "@dental/shared";
import { showToast } from "../../components/GlobalToast";
import { DEFAULT_PATIENT_SEGMENTS } from "../../components/marketing/marketingPresets";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";
import { clientLogger } from "../../services/logging/clientLogger";
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
			headers: denteClinicalReadHeaders(),
		})
			.then((res) => {
				if (!res.ok) {
					clientLogger.warn(
						"[MarketingCohort] Failed to load cohorts",
						{ status: res.status },
						{ module: "MarketingSegmentsCohortCard" },
					);
					return null;
				}
				return res.json();
			})
			.then((raw) => {
				const data = raw?.data ?? raw;
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
			.catch((err) => {
				clientLogger.error("[MarketingCohort] Failed to load cohorts", err, {
					module: "MarketingSegmentsCohortCard",
				});
				showToast("Не удалось загрузить сегменты базы", "warning");
			});
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
							<span className="px-2 py-0.5 rounded-md bg-[var(--warning-soft)] text-[var(--warning-ink,var(--warn-fg))] font-semibold flex items-center gap-1">
								<Sparkles size={11} /> VIP: {rfmSummary.vipCount}
							</span>
							<span className="px-2 py-0.5 rounded-md bg-[var(--success-soft)] text-[var(--success-ink,var(--ok-fg))] font-semibold">
								База: {rfmSummary.loyalCount}
							</span>
							<span className="px-2 py-0.5 rounded-md bg-[var(--danger-soft)] text-[var(--danger-ink,var(--danger))] font-semibold">
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
						{typeof seg.revenueKopecks === "number" && seg.revenueKopecks > 0 && (
							<div className="text-[11px] font-medium text-[var(--muted)]">
								Выручка: {formatKopecksToRub(seg.revenueKopecks)}
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
