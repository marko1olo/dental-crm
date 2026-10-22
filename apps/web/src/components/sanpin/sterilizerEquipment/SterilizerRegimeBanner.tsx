import { Flame, Plus } from "lucide-react";
import React from "react";

export interface SterilizerRegimeBannerProps {
	readonly loggingCycle: boolean;
	readonly onQuickLogCycle: () => void;
}

export function SterilizerRegimeBanner({
	loggingCycle,
	onQuickLogCycle,
}: SterilizerRegimeBannerProps) {
	return (
		<div
			style={{
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "8px",
				padding: "0.75rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "0.5rem",
				flexWrap: "wrap",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
				<div
					style={{
						width: "32px",
						height: "32px",
						borderRadius: "6px",
						background: "rgba(13, 148, 136, 0.12)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "var(--teal-600, #0d9488)",
					}}
				>
					<Flame size={16} />
				</div>
				<div>
					<span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink, #0f172a)", display: "block" }}>
						Режимы стерилизации по СанПиН 3.3686-21 (Табл. 3.12)
					</span>
					<span style={{ fontSize: "0.7rem", color: "var(--muted, #64748b)" }}>
						Основной режим: 134°C / 2.1 бар / 5 мин. Щадящий режим: 121°C / 1.1 бар / 20 мин.
					</span>
				</div>
			</div>

			<button
				type="button"
				onClick={onQuickLogCycle}
				aria-busy={loggingCycle}
				className="sanpin-btn sanpin-btn-primary touch-manipulation"
				style={{
					minHeight: "36px",
					padding: "0.35rem 0.85rem",
					fontSize: "0.8rem",
					fontWeight: 700,
					background: "var(--teal-600, #0d9488)",
					color: "#ffffff",
					border: "none",
					borderRadius: "6px",
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
					gap: "0.35rem",
				}}
				title="Фиксация цикла за 5 секунд в 1 клик"
			>
				<Plus size={15} />
				<span>Зафиксировать цикл 134°C (5 сек)</span>
			</button>
		</div>
	);
}
