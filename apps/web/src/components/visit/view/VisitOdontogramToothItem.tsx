import React from "react";
import { getToothConfig, getToothPath } from "../../../utils/math/toothGeometry";

export interface VisitOdontogramToothItemProps {
	code: string;
	state: string;
	isDetected: boolean;
	onClick: (code: string, state: string) => void;
}

export function VisitOdontogramToothItem({
	code,
	state,
	isDetected,
	onClick,
}: VisitOdontogramToothItemProps) {
	const geom = getToothPath(Number(code));
	const cfg = getToothConfig(Number(code));

	return (
		<button
			type="button"
			className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}${isDetected ? " tooth-ai-detected" : ""}`}
			onClick={() => onClick(code, state)}
			aria-label={`Зуб ${code}`}
			data-tooth-state={state === "idle" ? undefined : state}
		>
			<div
				className="tooth-svg-wrap"
				style={{
					filter: isDetected ? "drop-shadow(0 0 4px #3b82f6)" : "none",
				}}
			>
				<svg
					aria-hidden="true"
					width={cfg.width}
					height={cfg.height}
					viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
					fill="none"
				>
					{state === "missing" ? (
						<g>
							<path
								d={geom.root}
								fill="var(--paper-soft)"
								stroke="#cbd5e1"
								strokeWidth="1.2"
								opacity="0.15"
							/>
							<path
								d={geom.crown}
								fill="var(--paper-soft)"
								stroke="#cbd5e1"
								strokeWidth="1.2"
								opacity="0.15"
							/>
							<path
								d="M20 20L80 130M80 20L20 130"
								stroke="#ef4444"
								strokeWidth="5"
								strokeLinecap="round"
								opacity="0.7"
							/>
						</g>
					) : (
						<g>
							<path
								d={geom.root}
								fill={
									state === "idle"
										? "var(--paper-soft)"
										: state === "planned"
											? "var(--info-bg, rgba(56, 189, 248, 0.12))"
											: state === "treatment"
												? "var(--danger-bg, rgba(239, 68, 68, 0.12))"
												: state === "watch"
													? "var(--warn-bg, rgba(245, 158, 11, 0.12))"
													: "var(--ok-bg, rgba(34, 197, 94, 0.12))"
								}
								stroke={
									state === "idle"
										? "#cbd5e1"
										: state === "planned"
											? "#38bdf8"
											: state === "treatment"
												? "#f87171"
												: state === "watch"
													? "#fbbf24"
													: "#4ade80"
								}
								strokeWidth="1.5"
								strokeLinejoin="round"
							/>
							{geom.canals &&
								(state === "treatment" || state === "done") && (
									<path
										d={geom.canals}
										fill="none"
										stroke={state === "done" ? "#ec4899" : "#dc2626"}
										strokeWidth="2.5"
										strokeLinecap="round"
										opacity="0.85"
									/>
								)}
							<path
								d={geom.crown}
								fill={
									state === "idle"
										? "var(--paper)"
										: state === "planned"
											? "var(--info-bg)"
											: state === "treatment"
												? "var(--bad-bg)"
												: state === "watch"
													? "var(--warn-bg)"
													: "var(--ok-bg)"
								}
								stroke={
									state === "idle"
										? "#94a3b8"
										: state === "planned"
											? "#0284c7"
											: state === "treatment"
												? "#ef4444"
												: state === "watch"
													? "#d97706"
													: "#16a34a"
								}
								strokeWidth="1.5"
								strokeLinejoin="round"
							/>
							{geom.surfaces && (
								<g opacity="0.6">
									{Object.entries(geom.surfaces).map(([key, d]) =>
										d ? (
											<path
												key={key}
												d={d}
												fill="transparent"
												stroke="rgba(0,0,0,0.15)"
												strokeWidth="0.8"
											/>
										) : null,
									)}
								</g>
							)}
						</g>
					)}
				</svg>
			</div>
			<span className="tooth-code">{code}</span>
		</button>
	);
}
