/**
 * DENTE Dental CRM — Funnel Budget Channel Input Component
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { CanonicalMarketingChannelKey } from "./leadsFunnelTypes";

interface FunnelBudgetChannelInputProps {
	ch: { key: CanonicalMarketingChannelKey; label: string; color: string };
	currentVal: number;
	onBudgetChange: (
		channelKey: CanonicalMarketingChannelKey,
		valueStr: string,
	) => void;
}

export const FunnelBudgetChannelInput: React.FC<
	FunnelBudgetChannelInputProps
> = ({ ch, currentVal, onBudgetChange }) => {
	return (
		<div
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: 8,
				padding: "8px 10px",
				display: "flex",
				flexDirection: "column",
				gap: 4,
			}}
		>
			<label
				htmlFor={`budget-input-${ch.key}`}
				style={{
					fontSize: 11,
					fontWeight: 600,
					color: "var(--muted)",
					display: "flex",
					alignItems: "center",
					gap: 4,
				}}
			>
				<span
					style={{
						width: 8,
						height: 8,
						borderRadius: "50%",
						background: ch.color,
						display: "inline-block",
					}}
				/>
				{ch.label}
			</label>
			<div style={{ position: "relative" }}>
				<input
					id={`budget-input-${ch.key}`}
					type="text"
					value={currentVal.toLocaleString("ru-RU")}
					onChange={(e) => onBudgetChange(ch.key, e.target.value)}
					style={{
						width: "100%",
						padding: "4px 24px 4px 8px",
						borderRadius: 6,
						border: "1px solid var(--line)",
						background: "var(--paper-soft)",
						color: "var(--ink)",
						fontSize: 13,
						fontWeight: 600,
						boxSizing: "border-box",
					}}
				/>
				<span
					style={{
						position: "absolute",
						right: 8,
						top: "50%",
						transform: "translateY(-50%)",
						fontSize: 12,
						color: "var(--muted)",
						pointerEvents: "none",
					}}
				>
					₽
				</span>
			</div>
		</div>
	);
};
