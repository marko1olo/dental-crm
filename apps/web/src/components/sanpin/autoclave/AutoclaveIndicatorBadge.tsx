import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export interface AutoclaveIndicatorBadgeProps {
	readonly indicatorType?: string;
	readonly indicatorClass?: string | number;
	readonly passed?: boolean;
}

export function AutoclaveIndicatorBadge({
	indicatorType,
	indicatorClass,
	passed = true,
}: AutoclaveIndicatorBadgeProps) {
	const label =
		indicatorClass === 6 || indicatorType === "class6_emulating"
			? "Кл. 6"
			: indicatorClass === 4 || indicatorType === "class4_multivariable"
				? "Кл. 4"
				: "Кл. 5";

	return (
		<span
			className={`sanpin-tag ${passed ? "sanpin-tag-success" : "sanpin-tag-danger"} shrink-0 whitespace-nowrap`}
			style={{
				fontSize: "0.7rem",
				padding: "0.1rem 0.35rem",
				whiteSpace: "nowrap",
				display: "inline-flex",
				alignItems: "center",
				gap: "0.25rem",
			}}
		>
			{passed ? (
				<CheckCircle2 size={11} className="shrink-0" />
			) : (
				<AlertTriangle size={11} className="shrink-0" />
			)}
			<span>{label}</span>
		</span>
	);
}

export default AutoclaveIndicatorBadge;
