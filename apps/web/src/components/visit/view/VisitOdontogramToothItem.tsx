import React from "react";
import {
	isPrimaryTooth,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
} from "@dental/shared";
import { getToothAnatomicalNameRu } from "../../../lib/clinicalProtocols043";
import { getToothConfig, getToothPath } from "../../../utils/math/toothGeometry";

export interface VisitOdontogramToothItemProps {
	code: string;
	state: string;
	isDetected: boolean;
	onClick: (code: string, state: string) => void;
	onToggleDentition?: (code: string) => void;
}

function getRootFill(state: string): string {
	switch (state) {
		case "planned":
			return "var(--info-bg, rgba(56, 189, 248, 0.12))";
		case "treatment":
		case "pulpitis":
		case "Pulpitis":
		case "periodontitis":
		case "Periodontitis":
			return "var(--danger-bg, rgba(239, 68, 68, 0.12))";
		case "watch":
		case "Watch":
			return "var(--warn-bg, rgba(245, 158, 11, 0.12))";
		case "caries":
		case "Caries":
			return "rgba(245, 158, 11, 0.12)";
		case "done":
		case "Filled":
		case "filled":
			return "var(--ok-bg, rgba(34, 197, 94, 0.12))";
		case "crown":
		case "Crown":
			return "rgba(234, 179, 8, 0.12)";
		case "idle":
		case "healthy":
		case "Healthy":
		default:
			return "var(--paper-soft)";
	}
}

function getRootStroke(state: string): string {
	switch (state) {
		case "planned":
			return "#38bdf8";
		case "treatment":
		case "pulpitis":
		case "Pulpitis":
		case "periodontitis":
		case "Periodontitis":
			return "#ef4444";
		case "watch":
		case "Watch":
			return "#fbbf24";
		case "caries":
		case "Caries":
			return "#f59e0b";
		case "done":
		case "Filled":
		case "filled":
			return "#4ade80";
		case "crown":
		case "Crown":
			return "#eab308";
		case "idle":
		case "healthy":
		case "Healthy":
		default:
			return "#cbd5e1";
	}
}

function getCrownFill(state: string): string {
	switch (state) {
		case "planned":
			return "var(--info-bg)";
		case "treatment":
		case "pulpitis":
		case "Pulpitis":
		case "periodontitis":
		case "Periodontitis":
			return "var(--bad-bg)";
		case "watch":
		case "Watch":
			return "var(--warn-bg)";
		case "caries":
		case "Caries":
			return "var(--warn-bg)";
		case "done":
		case "Filled":
		case "filled":
			return "var(--ok-bg)";
		case "crown":
		case "Crown":
			return "rgba(234, 179, 8, 0.25)";
		case "idle":
		case "healthy":
		case "Healthy":
		default:
			return "var(--paper)";
	}
}

function getCrownStroke(state: string): string {
	switch (state) {
		case "planned":
			return "#0284c7";
		case "treatment":
		case "pulpitis":
		case "Pulpitis":
		case "periodontitis":
		case "Periodontitis":
			return "#ef4444";
		case "watch":
		case "Watch":
			return "#d97706";
		case "caries":
		case "Caries":
			return "#ea580c";
		case "done":
		case "Filled":
		case "filled":
			return "#16a34a";
		case "crown":
		case "Crown":
			return "#ca8a04";
		case "idle":
		case "healthy":
		case "Healthy":
		default:
			return "#94a3b8";
	}
}

export function VisitOdontogramToothItem({
	code,
	state,
	isDetected,
	onClick,
	onToggleDentition,
}: VisitOdontogramToothItemProps) {
	const toothNum = Number(code);
	const geom = getToothPath(toothNum);
	const cfg = getToothConfig(toothNum);
	const isPediatric = isPrimaryTooth(toothNum);
	const anatomicalName = getToothAnatomicalNameRu(toothNum);

	const isMissing = state === "missing" || state === "Missing";

	return (
		<div className="tooth-container flex flex-col items-center">
			<button
				type="button"
				className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}${isDetected ? " tooth-ai-detected" : ""}`}
				onClick={() => onClick(code, state)}
				aria-label={`Зуб ${code}: ${anatomicalName}`}
				title={anatomicalName}
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
						{isMissing ? (
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
								{/* Корень зуба */}
								<path
									d={geom.root}
									fill={getRootFill(state)}
									stroke={getRootStroke(state)}
									strokeWidth="1.5"
									strokeLinejoin="round"
								/>

								{/* Корневые каналы: непрерывно доходят до апекса корня */}
								{geom.canals && (
									<path
										d={geom.canals}
										fill="none"
										stroke={
											state === "done" || state === "Filled" || state === "filled"
												? "#ec4899"
												: "#ef4444"
										}
										strokeWidth="2.5"
										strokeLinecap="round"
										opacity={
											state === "treatment" ||
											state === "pulpitis" ||
											state === "Pulpitis" ||
											state === "periodontitis" ||
											state === "Periodontitis" ||
											state === "done" ||
											state === "Filled"
												? 0.95
												: 0.75
										}
									/>
								)}

								{/* Пульпа зуба: анатомически строго красная (#ef4444) по Мандату 8c */}
								{geom.core && (
									<path
										d={geom.core}
										fill="#ef4444"
										stroke="#ef4444"
										strokeWidth="1.2"
										opacity={
											state === "treatment" ||
											state === "pulpitis" ||
											state === "Pulpitis"
												? 1
												: 0.85
										}
									/>
								)}

								{/* Коронка зуба */}
								<path
									d={geom.crown}
									fill={getCrownFill(state)}
									stroke={getCrownStroke(state)}
									strokeWidth="1.5"
									strokeLinejoin="round"
								/>

								{/* Анатомические поверхности */}
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
			</button>

			{/* Подпись зуба с обозначением молочного прикуса и кнопкой переключения */}
			<div className="tooth-code-area flex items-center justify-center gap-1 mt-0.5">
				<span className="tooth-code font-bold text-xs" title={anatomicalName}>
					{code}
				</span>
				{isPediatric && (
					<span
						className="tooth-pediatric-badge text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1 py-0.2 rounded"
						title="Временный (молочный) зуб"
					>
						мол.
					</span>
				)}
				{onToggleDentition && (
					<button
						type="button"
						className="tooth-toggle-dentition-btn text-[10px] text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 px-0.5 rounded transition-colors"
						title={
							isPediatric
								? `Сменить на постоянный зуб (${PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[toothNum] ?? ""})`
								: `Сменить на молочный зуб (${PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[toothNum] ?? ""})`
						}
						onClick={(e) => {
							e.stopPropagation();
							onToggleDentition(code);
						}}
					>
						⇄
					</button>
				)}
			</div>
		</div>
	);
}
