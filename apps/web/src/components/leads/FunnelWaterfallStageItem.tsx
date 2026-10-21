/**
 * DENTE Dental CRM — Funnel Waterfall Stage Item
 * Mandate 8b (<= 120 lines)
 */

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type React from "react";
import type { FunnelStageMetric } from "./leadsFunnelTypes";

interface FunnelWaterfallStageItemProps {
	st: FunnelStageMetric;
	idx: number;
	totalLeads: number;
	stagesLength: number;
}

export const FunnelWaterfallStageItem: React.FC<
	FunnelWaterfallStageItemProps
> = ({ st, idx, totalLeads, stagesLength }) => {
	const maxCount = totalLeads > 0 ? totalLeads : 1;
	const barWidthPercent = Math.max(8, Math.round((st.count / maxCount) * 100));

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					fontSize: 12,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 8,
						fontWeight: 600,
						color: "var(--ink)",
					}}
				>
					<span
						style={{
							width: 10,
							height: 10,
							borderRadius: "50%",
							background: st.color,
							display: "inline-block",
						}}
					/>
					{st.label}
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					<span style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>
						{st.count} чел.
					</span>
					<span
						style={{
							fontSize: 11,
							fontWeight: 600,
							color: "var(--teal)",
							background: st.badgeColor,
							padding: "2px 6px",
							borderRadius: 6,
						}}
					>
						{st.conversionFromFirstPercent}% от входа
					</span>
					{idx > 0 && (
						<span
							style={{
								fontSize: 11,
								color: "var(--muted)",
								minWidth: 100,
								textAlign: "right",
							}}
						>
							Шаг: {st.conversionFromPrevPercent}%
						</span>
					)}
				</div>
			</div>

			<div
				style={{
					width: "100%",
					height: 24,
					background: "var(--paper-soft)",
					borderRadius: 6,
					overflow: "hidden",
					position: "relative",
					border: "1px solid var(--line)",
				}}
			>
				<motion.div
					initial={{ width: 0 }}
					animate={{ width: `${barWidthPercent}%` }}
					transition={{ duration: 0.4, delay: idx * 0.05 }}
					style={{
						height: "100%",
						background: st.color,
						opacity: 0.85,
						borderRadius: 5,
						display: "flex",
						alignItems: "center",
						paddingLeft: 8,
						color: "var(--on-teal, var(--paper))",
						fontSize: 11,
						fontWeight: 600,
					}}
				/>
			</div>

			{st.dropCount > 0 && idx < stagesLength - 1 && (
				<div
					style={{
						fontSize: 11,
						color: "var(--rust)",
						paddingLeft: 18,
						display: "flex",
						alignItems: "center",
						gap: 4,
					}}
				>
					<ArrowRight size={11} />
					Отвал на этапе: {st.dropCount} чел. ({st.dropRatePercent}%)
				</div>
			)}
		</div>
	);
};
