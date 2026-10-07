import React from "react";
import { isPrimaryTooth } from "@dental/shared";
import { getToothAnatomicalNameRu } from "../../../lib/clinicalProtocols043";
import { getToothConfig, getToothPath } from "../../../utils/math/toothGeometry";
import { ToothStandardGraphic } from "../../odontogram/chart/ToothStandardGraphic";
import { getToothColors } from "../../odontogram/chart/ToothColors";
import type { ToothState } from "../../odontogram/chart/toothChartTypes";
import { scaleCssPx } from "../../odontogram/chart/toothChartTypes";

export interface VisitOdontogramToothItemProps {
	code: string;
	state: string;
	isDetected: boolean;
	onClick: (code: string, state: string) => void;
	onToggleDentition?: (code: string) => void;
	scale?: number;
}

function mapToToothState(state: string): ToothState {
	switch (state?.toLowerCase()) {
		case "caries":
			return "Caries";
		case "pulpitis":
			return "Pulpitis";
		case "treatment":
		case "periodontitis":
			return "Periodontitis";
		case "done":
		case "filled":
			return "Filled";
		case "crown":
			return "Crown";
		case "missing":
			return "Missing";
		case "implant":
			return "Implant";
		case "planned":
			return "Planned_Implant";
		case "root":
			return "Root";
		case "watch":
			return "Healthy";
		case "idle":
		case "healthy":
		default:
			return "Healthy";
	}
}

export function VisitOdontogramToothItem({
	code,
	state,
	isDetected,
	onClick,
	onToggleDentition: _onToggleDentition,
	scale = 0.74,
}: VisitOdontogramToothItemProps) {
	const toothNum = Number.parseInt(code, 10);
	const isTop = toothNum < 30 || (toothNum >= 51 && toothNum <= 65);
	const isPediatric = isPrimaryTooth(toothNum);
	const anatomicalName = getToothAnatomicalNameRu(toothNum);

	const geom = getToothPath(toothNum);
	const cfg = getToothConfig(toothNum);
	const canonicalState = mapToToothState(state);
	const colors = getToothColors(canonicalState);

	const scaledWidth = scaleCssPx(cfg.width, scale);
	const scaledHeight = scaleCssPx(cfg.height, scale);

	const isRightSide =
		(toothNum >= 21 && toothNum <= 28) ||
		(toothNum >= 31 && toothNum <= 38) ||
		(toothNum >= 61 && toothNum <= 65) ||
		(toothNum >= 71 && toothNum <= 75);
	const transform = `scaleX(${isRightSide ? -1 : 1})`;

	const isPeriodontitis = canonicalState === "Periodontitis";
	const isPulpitis = canonicalState === "Pulpitis";
	const isEndoTreated = canonicalState === "Filled" || canonicalState === "Periodontitis";

	const numberBadge = (
		<div className="tooth-code-area flex items-center justify-center my-0.5">
			<span className={`tooth-number-badge ${canonicalState !== "Healthy" ? "selected" : ""}`}>
				<span
					className="tooth-status-dot"
					style={{ backgroundColor: colors.badgeColor }}
				/>
				<span className="tooth-number-text text-xs font-bold leading-tight select-none">
					{code}
				</span>
				{isPediatric && (
					<span
						className="tooth-pediatric-badge text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1 py-0.2 rounded ml-0.5 shadow-2xs"
						title="Временный (молочный) зуб"
					>
						мол.
					</span>
				)}
			</span>
		</div>
	);

	return (
		<div
			className={`tooth-container tooth-svg-wrapper group ${isTop ? "top" : "bottom"} ${
				canonicalState !== "Healthy" ? "has-pathology" : ""
			}`}
			data-tour="tooth-card"
			data-tooth-id={code}
		>
			<button
				type="button"
				className="tooth-item-button border-none bg-transparent p-0 m-0 cursor-pointer flex flex-col items-center focus:outline-none transition-transform hover:scale-[1.04]"
				onClick={() => onClick(code, state)}
				aria-label={`Зуб ${code}: ${anatomicalName}`}
				title={anatomicalName}
				data-tooth-state={state === "idle" ? undefined : state}
			>
				{/* На верхней челюсти номер зуба СВЕРХУ над корнем */}
				{isTop && numberBadge}

				<div
					className="tooth-svg-wrap relative flex items-center justify-center"
					style={{
						filter: isDetected ? "drop-shadow(0 0 6px #3b82f6)" : undefined,
					}}
				>
					<ToothStandardGraphic
						number={toothNum}
						state={canonicalState}
						scaledWidth={scaledWidth}
						scaledHeight={scaledHeight}
						transform={transform}
						cfg={cfg}
						geom={geom}
						colors={colors}
						isTop={isTop}
						showPeriapicalHalos={isPeriodontitis}
						isPeriodontitis={isPeriodontitis}
						isEndoTreated={isEndoTreated}
						showPulpAndCanals={isPulpitis || isPeriodontitis}
						useSurfaces={false}
						handleSurfaceClick={() => {}}
						handleSurfaceKeyDown={() => {}}
					/>
				</div>

				{/* На нижней челюсти номер зуба СНИЗУ под корнем */}
				{!isTop && numberBadge}
			</button>
		</div>
	);
}
