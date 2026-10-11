import React from "react";
import {
	Award,
	BarChart3,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Copy,
	DollarSign,
	Download,
	Flame,
	Sliders,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import {
	FUNNEL_PERIOD_OPTIONS,
	type FunnelStageMetrics,
	type FunnelSummaryMetrics,
	type FunnelTimePeriod,
} from "./types";
import { FunnelWaterfallSection } from "../FunnelWaterfallSection";
import {
	resolveRomiToneColor,
	resolveShowUpToneColor,
} from "./funnelAnalyticsUtils";

import {
	FunnelModalHeaderBar,
	type FunnelModalHeaderBarProps,
} from "./FunnelModalHeaderBar";

export { FunnelModalHeaderBar, type FunnelModalHeaderBarProps };

export interface FunnelStagesOverviewSectionProps {
	readonly summary: FunnelSummaryMetrics;
	readonly stages: readonly FunnelStageMetrics[];
	readonly isWaterfallOpen: boolean;
	readonly onToggleWaterfall: () => void;
}

export function FunnelStagesOverviewSection({
	summary,
	stages,
	isWaterfallOpen,
	onToggleWaterfall,
}: FunnelStagesOverviewSectionProps) {
	return (
		<>
			{/* TOP KPI CARDS */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
					gap: "12px",
				}}
			>
				{/* 1. Лиды */}
				<div
					style={{
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: 12,
						padding: "14px",
					}}
				>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: 4,
							display: "flex",
							alignItems: "center",
							gap: 4,
						}}
					>
						<Users size={13} color="var(--brand-500)" /> Всего лидов
					</div>
					<div
						style={{
							fontSize: 22,
							fontWeight: 700,
							color: "var(--ink)",
						}}
					>
						{summary.totalLeads}
					</div>
					<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
						Конверсия в запись: {summary.bookingRatePercent}%
					</div>
				</div>

				{/* 2. Show-up (Дошли) */}
				<div
					style={{
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: 12,
						padding: "14px",
					}}
				>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: 4,
							display: "flex",
							alignItems: "center",
							gap: 4,
						}}
					>
						<CheckCircle2 size={13} color="var(--warn-fg)" /> Дошли (Show-up)
					</div>
					<div
						style={{
							fontSize: 22,
							fontWeight: 700,
							color: "var(--ink)",
						}}
					>
						{summary.showUpLeads}
					</div>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: resolveShowUpToneColor(summary.showUpRatePercent),
							marginTop: 2,
						}}
					>
						Доходимость: {summary.showUpRatePercent}%
					</div>
				</div>

				{/* 3. Оплатили (Клиенты) */}
				<div
					style={{
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: 12,
						padding: "14px",
					}}
				>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: 4,
							display: "flex",
							alignItems: "center",
							gap: 4,
						}}
					>
						<Award size={13} color="var(--ok-fg)" /> Оплатили
					</div>
					<div
						style={{
							fontSize: 22,
							fontWeight: 700,
							color: "var(--ok-fg)",
						}}
					>
						{summary.paidLeads}
					</div>
					<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
						Итог. конверсия: {summary.overallConversionPercent}%
					</div>
				</div>

				{/* 4. Выручка */}
				<div
					style={{
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: 12,
						padding: "14px",
					}}
				>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: 4,
							display: "flex",
							alignItems: "center",
							gap: 4,
						}}
					>
						<DollarSign size={13} color="var(--teal)" /> Выручка
					</div>
					<div
						style={{
							fontSize: 20,
							fontWeight: 700,
							color: "var(--ink)",
						}}
					>
						{summary.totalRevenueRub.toLocaleString("ru-RU")} ₽
					</div>
					<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
						Ср. чек: {summary.avgBillRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>

				{/* 5. CAC */}
				<div
					style={{
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: 12,
						padding: "14px",
					}}
				>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: 4,
							display: "flex",
							alignItems: "center",
							gap: 4,
						}}
					>
						<TrendingUp size={13} color="var(--accent)" /> CAC (Стоимость клика)
					</div>
					<div
						style={{
							fontSize: 20,
							fontWeight: 700,
							color: "var(--ink)",
						}}
					>
						{summary.cacRub.toLocaleString("ru-RU")} ₽
					</div>
					<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
						CPL: {summary.cplRub.toLocaleString("ru-RU")} ₽ | CPS: {summary.cpsRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>

				{/* 6. ROMI */}
				<div
					style={{
						background: "var(--paper)",
						border: "1px solid var(--line)",
						borderRadius: 12,
						padding: "14px",
					}}
				>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: "var(--muted)",
							marginBottom: 4,
							display: "flex",
							alignItems: "center",
							gap: 4,
						}}
					>
						<Flame size={13} color="var(--teal)" /> ROMI (Окупаемость)
					</div>
					<div
						style={{
							fontSize: 20,
							fontWeight: 700,
							color: resolveRomiToneColor(summary.romiPercent),
						}}
					>
						{summary.romiPercent}%
					</div>
					<div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
						LTV/CAC: {summary.ltvToCacRatio}x
					</div>
				</div>
			</div>

			{/* VISUAL FUNNEL WATERFALL */}
			<FunnelWaterfallSection
				stages={stages}
				totalLeads={summary.totalLeads}
				isOpen={isWaterfallOpen}
				onToggle={onToggleWaterfall}
			/>
		</>
	);
}
